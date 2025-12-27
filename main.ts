// 配置常量
const UPSTREAM_ORIGIN = "https://theoldllm.vercel.app";
// 默认模型设置为列表中比较强的一个，你可以根据需要修改
const DEFAULT_MODEL = "gpt-4o"; 

// 硬编码的默认 Token (来自你的抓包)
const FALLBACK_TOKEN = "Bearer ";

// 根据 /entp/llm/provider 接口提取的所有模型
const ALLOWED_MODELS = [
  // --- OpenAI ---
  "gpt-5.2", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano",
  "o4-mini", "o3-mini", "o1-mini", "o3", "o1",
  "gpt-4", "gpt-4.1", "gpt-4o", "gpt-4o-mini", "o1-preview",
  "gpt-4-turbo", "gpt-4-turbo-preview", "gpt-4-1106-preview", "gpt-4-vision-preview",
  "gpt-4-0613", "gpt-4o-2024-08-06", "gpt-4-0314", "gpt-4-32k-0314",
  "gpt-3.5-turbo", "gpt-3.5-turbo-0125", "gpt-3.5-turbo-1106", "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0613", "gpt-3.5-turbo-16k-0613", "gpt-3.5-turbo-0301",
  
  // --- Anthropic ---
  "claude-3-7-sonnet-latest", "claude-haiku-4-5-20251001", "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20241022", "claude-sonnet-4-20250514", "claude-opus-4-5-20251101",
  "claude-opus-4-20250514", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest",
  "claude-3-7-sonnet-20250219", "claude-4-opus-20250514", "claude-3-5-sonnet-20240620",
  "claude-opus-4-5", "claude-haiku-4-5", "claude-sonnet-4-5-20250929",
  "claude-3-opus-20240229", "claude-opus-4-1-20250805", "claude-sonnet-4-5",
  "claude-3-haiku-20240307", "claude-4-sonnet-20250514", "claude-3-opus-latest", "claude-opus-4-1"
];

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

  // 1. /v1/models 接口 (返回抓取到的所有模型)
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
      // 如果请求的模型不在列表中，默认使用 DEFAULT_MODEL，或者你可以允许透传
      const model = body.model || DEFAULT_MODEL;

      // 鉴权
      let authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        authHeader = FALLBACK_TOKEN;
      }

      // --- 第一步：创建会话 (Create Chat Session) ---
      // 这里的 description 按照抓包格式，动态填入请求的 model
      // 假设上游通过 description 或 persona_id 来区分模型
      const sessionDescription = `Streaming chat session using ${model}`;
      
      const createSessionResp = await fetch(`${UPSTREAM_ORIGIN}/entp/chat/create-chat-session`, {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          "authorization": authHeader,
        },
        body: JSON.stringify({
          persona_id: 154, // 抓包中固定的 Persona ID
          description: sessionDescription
        })
      });

      if (!createSessionResp.ok) {
        const errText = await createSessionResp.text();
        throw new Error(`Failed to create session (${createSessionResp.status}): ${errText}`);
      }

      const sessionData = await createSessionResp.json();
      const chatSessionId = sessionData.chat_session_id;

      if (!chatSessionId) {
        throw new Error("Upstream did not return a chat_session_id");
      }

      // --- 第二步：转换消息并发送 (Send Message) ---
      const prompt = convertMessagesToPrompt(body.messages);

      const sendMsgResp = await fetch(`${UPSTREAM_ORIGIN}/entp/chat/send-message`, {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          "authorization": authHeader,
        },
        body: JSON.stringify({
          chat_session_id: chatSessionId,
          parent_message_id: null, 
          message: prompt,
          file_descriptors: [],
          search_doc_ids: [],
          retrieval_options: {}
        }),
      });

      if (!sendMsgResp.ok) {
         throw new Error(`Upstream error: ${sendMsgResp.statusText}`);
      }

      // --- 第三步：处理流式响应 ---
      const stream = sendMsgResp.body;
      if (!stream) throw new Error("No response body");

      const readable = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          const chatId = `chatcmpl-${crypto.randomUUID()}`;
          const created = Math.floor(Date.now() / 1000);
          
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.trim()) continue;
                
                try {
                  // 解析上游 JSON: {"ind": 1, "obj": {"type": "message_delta", "content": "..."}}
                  const json = JSON.parse(line);
                  
                  if (json && json.obj) {
                    const type = json.obj.type;
                    const content = json.obj.content || "";

                    if (type === "message_delta" && content) {
                      if (isStream) {
                        const openaiChunk = {
                            id: chatId,
                            object: "chat.completion.chunk",
                            created: created,
                            model: model,
                            choices: [{ index: 0, delta: { content: content }, finish_reason: null }]
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                      }
                    } 
                  }
                } catch (e) {
                  // 忽略非 JSON 行
                }
              }
            }
            
            if (isStream) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          } catch (err) {
            console.error("Stream error", err);
            controller.error(err);
          } finally {
            controller.close();
          }
        },
      });

      // 如果客户端请求 stream: true
      if (isStream) {
        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } 
      
      // 如果客户端请求 stream: false (非流式处理)
      else {
        const reader = readable.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          // 解析我们自己构造的 SSE 格式
          const lines = text.split("\n");
          for (const l of lines) {
             if (l.startsWith("data: ") && l !== "data: [DONE]") {
                try {
                    const data = JSON.parse(l.substring(6));
                    if (data.choices && data.choices[0].delta.content) {
                        fullContent += data.choices[0].delta.content;
                    }
                } catch {}
             }
          }
        }

        return new Response(JSON.stringify({
            id: `chatcmpl-${crypto.randomUUID()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
                index: 0,
                message: { role: "assistant", content: fullContent },
                finish_reason: "stop"
            }],
            usage: { total_tokens: fullContent.length }
        }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  return new Response("Not Found", { status: 404 });
});

function convertMessagesToPrompt(messages: any[]): string {
  if (!Array.isArray(messages)) return "";
  return messages.map((msg) => {
    return `${msg.role}: ${msg.content}`;
  }).join("\n\n");
}
