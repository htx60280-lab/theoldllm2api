// 配置常量
const TARGET_URL = "https://theoldllm.vercel.app/entp/chat/send-message";
const DEFAULT_MODEL = "ent-claude-opus-4.5-20251101";

// 硬编码的默认 Token (来自你的 curl)
// 如果客户端请求头没有携带 Authorization，则使用此 Token
const FALLBACK_TOKEN = "Bearer on_tenant_65566e34-de7f-490a-b88f-32ac8203b659.FlFtgizBOIHSKUrSYbSiT23u7VK3-AHqf64TtjN5v0qP-8AD8QJQ6RLxl0zG9Cgjj5R5ICdgNYFBz9JSv3OJcN3LiKtA6oJTj9CF_1nKjkZQ-InxkNfhEzktF52PXVvFxy7H1IR5JH9PnmMo467YfkAzf8z8vbRmW9WUQcqhBEMuxogPfqAIL1b60F8wGup7WChnADayGVAXyg0ihs4K-fXRyiR7OvXRii05DGX9XT7KtJvb24-XY_VEmWi8OO_o";

// 支持的模型列表
const ALLOWED_MODELS = [
  "ent-claude-opus-4.5-20251101",
  "ent-claude-opus-4.1"
];

// 伪装 Headers
const COMMON_HEADERS = {
  "authority": "theoldllm.vercel.app",
  "accept": "*/*",
  "accept-language": "zh-HK,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  "content-type": "application/json",
  "origin": "https://theoldllm.vercel.app",
  "referer": "https://theoldllm.vercel.app/",
  "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Linux"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const method = req.method;

  // CORS 处理
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // 1. /v1/models 接口
  if (url.pathname === "/v1/models") {
    return new Response(
      JSON.stringify({
        object: "list",
        data: ALLOWED_MODELS.map((id) => ({
          id,
          object: "model",
          created: Math.floor(Date.now() / 1000),
          owned_by: "openai-proxy",
        })),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // 2. /v1/chat/completions 接口
  if (url.pathname === "/v1/chat/completions" && method === "POST") {
    try {
      const body = await req.json();
      const isStream = body.stream || false;
      const model = body.model || DEFAULT_MODEL;

      // 获取 Authorization (优先使用客户端传的，没有则用默认的)
      let authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        authHeader = FALLBACK_TOKEN;
      }

      // 转换 OpenAI Messages 为单一 Prompt 字符串
      // 因为目标接口是单轮对话接口，需要手动拼接历史
      const prompt = convertMessagesToPrompt(body.messages);

      // 构造目标接口请求体
      const upstreamBody = {
        chat_session_id: crypto.randomUUID(), // 每次请求生成新 ID
        parent_message_id: 1, // 模拟一个父 ID，通常 1 或随机数可行
        message: prompt,
        file_descriptors: [],
        search_doc_ids: [],
        retrieval_options: {}
      };

      // 发起请求
      const upstreamResponse = await fetch(TARGET_URL, {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          "authorization": authHeader,
        },
        body: JSON.stringify(upstreamBody),
      });

      if (!upstreamResponse.ok) {
        return new Response(JSON.stringify({ error: `Upstream error: ${upstreamResponse.statusText}` }), {
          status: upstreamResponse.status,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // 处理流式响应 (Stream)
      if (isStream) {
        const stream = upstreamResponse.body;
        if (!stream) {
            throw new Error("No response body from upstream");
        }
        
        const readable = new ReadableStream({
          async start(controller) {
            const reader = stream.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            const id = `chatcmpl-${crypto.randomUUID()}`;
            const created = Math.floor(Date.now() / 1000);

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  break;
                }
                
                // 目标接口可能返回原始文本，我们需要将其封装为 OpenAI 格式
                const textChunk = decoder.decode(value, { stream: true });
                
                if (textChunk) {
                  // 注意：如果目标接口返回的是 Vercel AI SDK 的格式 (如 0:"text")，
                  // 这里可能需要做正则清洗。目前按纯文本处理。
                  // 如果发现返回内容有乱码或引号，请在这里添加 cleanText(textChunk)
                  
                  const chunkData = {
                    id: id,
                    object: "chat.completion.chunk",
                    created: created,
                    model: model,
                    choices: [
                      {
                        index: 0,
                        delta: { content: textChunk },
                        finish_reason: null,
                      },
                    ],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
                }
              }
            } catch (err) {
              console.error("Stream reading error", err);
              controller.error(err);
            } finally {
                controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } 
      
      // 处理非流式响应 (Normal)
      else {
        const text = await upstreamResponse.text();
        // 同样，如果返回包含 Vercel 协议字符，可能需要清洗
        return new Response(
          JSON.stringify({
            id: `chatcmpl-${crypto.randomUUID()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: text,
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: prompt.length, // 估算
              completion_tokens: text.length, // 估算
              total_tokens: prompt.length + text.length,
            },
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // 404
  return new Response("Not Found", { status: 404 });
});

/**
 * 辅助函数：将 OpenAI 的 messages 数组转换为单一字符串 Prompt
 */
function convertMessagesToPrompt(messages: any[]): string {
  if (!Array.isArray(messages)) return "";
  
  return messages.map((msg) => {
    const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1); // System, User, Assistant
    return `${role}: ${msg.content}`;
  }).join("\n\n");
}
