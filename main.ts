/**
* Universal LLM Proxy - Deno Deploy
* Mode: Hybrid (Disposable Persona + Direct Proxy)
* Fixed: Direct stream piping for P7 models (Gemini & Claude Thinking)
*/

// === 配置区域 ===
const UPSTREAM_ORIGIN = "https://theoldllm.vercel.app";
const DEFAULT_CHAT_MODEL = "ent-gpt-4o";

// 默认 Token
const FALLBACK_TOKEN = "Bearer on_tenant_65566e34-de7f-490a-b88f-32ac8203b659.FlFtgizBOIHSKUrSYbSiT23u7VK3-AHqf64TtjN5v0qP-8AD8QJQ6RLxl0zG9Cgjj5R5ICdgNYFBz9JSv3OJcN3LiKtA6oJTj9CF_1nKjkZQ-InxkNfhEzktF52PXVvFxy7H1IR5JH9PnmMo467YfkAzf8z8vbRmW9WUQcqhBEMuxogPfqAIL1b60F8wGup7WChnADayGVAXyg0ihs4K-fXRyiR7OvXRii05DGX9XT7KtJvb24-XY_VEmWi8OO_o";

// === 模型定义 ===
const hS = [
  // --- 新增模型 (Direct Proxy Mode / P7 Provider) ---
  {
    id: "gemini-claude-opus-4-5-thinking",
    name: "Claude Opus 4.5 Thinking",
    provider: "Anthropic",
    apiProvider: "p7", // 对应 curl 中的 ?provider=p7
    isProxy: true      // 标记使用 /api/proxy 路径
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "Google",
    apiProvider: "p7",
    isProxy: true
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash,
    provider: "Google",
    apiProvider: "p7",
    isProxy: true
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    apiProvider: "p7",
    isProxy: true
  },
id: "gemini-claude-sonnet-4-5-thinking",
    name: "Claude Sonnet 4.5 Thinking",
    provider: "Anthropic",
    apiProvider: "p7", // 对应 curl 中的 ?provider=p7
    isProxy: true      // 标记使用 /api/proxy 路径
  },
  {
    id: "deepseek-v3.1-terminus",
    name: "DeepSeek V3.1 Terminus",
    provider: "DeepSeek",
    apiProvider: "p8",
    isProxy: true
  },
  {
    id: "glm-4.6",
    name: "GLM-4.6",
    provider: "Zhipu",
    apiProvider: "p8",
    isProxy: true
  },
  {
    id: "kimi-k2-thinking",
    name: "Kimi K2 Thinking",
    provider: "Moonshot",
    apiProvider: "p8",
    isProxy: true
  },
  {
    id: "kimi-k2-instruct",
    name: "Kimi K2 Instruct",
    provider: "Moonshot",
    apiProvider: "p8",
    isProxy: true
  },
  {
    id: "minimax-m2",
    name: "Minimax M2",
    provider: "Minimax",
    apiProvider: "p8",
    isProxy: true
  },
  {
    id: "mistral-nemotron",
    name: "Mistral Nemotron",
    provider: "Mistral",
    apiProvider: "p8",
    isProxy: true
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    name: "Qwen 3 Next 80B Instruct",
    provider: "Alibaba",
    apiProvider: "p8",
    isProxy: true
  },
  // --- 原有模型 (Persona Mode) ---
  {id:"ent-gpt-5.2",name:"GPT-5.2",llmVersion:"gpt-5.2"},
  {id:"ent-gpt-5.1",name:"GPT-5.1",llmVersion:"gpt-5.1"},
  {id:"ent-gpt-5",name:"GPT-5",llmVersion:"gpt-5"},
  {id:"ent-gpt-5-mini",name:"GPT-5 Mini",llmVersion:"gpt-5-mini"},
  {id:"ent-gpt-5-nano",name:"GPT-5 Nano",llmVersion:"gpt-5-nano"},
  {id:"ent-o4-mini",name:"O4 Mini",llmVersion:"o4-mini"},
  {id:"ent-o3",name:"O3",llmVersion:"o3"},
  {id:"ent-o3-mini",name:"O3 Mini",llmVersion:"o3-mini"},
  {id:"ent-o1",name:"O1",llmVersion:"o1"},
  {id:"ent-o1-preview",name:"O1 Preview",llmVersion:"o1-preview"},
  {id:"ent-o1-mini",name:"O1 Mini",llmVersion:"o1-mini"},
  {id:"ent-gpt-4.1",name:"GPT-4.1",llmVersion:"gpt-4.1"},
  {id:"ent-gpt-4o",name:"GPT-4o",llmVersion:"gpt-4o"},
  {id:"ent-gpt-4o-2024-08-06",name:"GPT-4o (2024-08-06)",llmVersion:"gpt-4o-2024-08-06"},
  {id:"ent-gpt-4o-mini",name:"GPT-4o Mini",llmVersion:"gpt-4o-mini"},
  {id:"ent-claude-opus-4.5",name:"Claude Opus 4.5",llmVersion:"claude-opus-4-5"},
  {id:"ent-claude-opus-4.5-20251101",name:"Claude Opus 4.5 (20251101)",llmVersion:"claude-opus-4-5-20251101"},
  {id:"ent-claude-opus-4.1",name:"Claude Opus 4.1",llmVersion:"claude-opus-4-1"},
  {id:"ent-claude-opus-4.1-20250805",name:"Claude Opus 4.1 (20250805)",llmVersion:"claude-opus-4-1-20250805"},
  {id:"ent-claude-opus-4",name:"Claude Opus 4",llmVersion:"claude-opus-4-20250514"},
  {id:"ent-claude-4-opus",name:"Claude 4 Opus",llmVersion:"claude-4-opus-20250514"},
  {id:"ent-claude-sonnet-4.5",name:"Claude Sonnet 4.5",llmVersion:"claude-sonnet-4-5"},
  {id:"ent-claude-sonnet-4.5-20250929",name:"Claude Sonnet 4.5 (20250929)",llmVersion:"claude-sonnet-4-5-20250929"},
  {id:"ent-claude-sonnet-4",name:"Claude Sonnet 4",llmVersion:"claude-sonnet-4-20250514"},
  {id:"ent-claude-4-sonnet",name:"Claude 4 Sonnet",llmVersion:"claude-4-sonnet-20250514"},
  {id:"ent-claude-3.7-sonnet",name:"Claude 3.7 Sonnet",llmVersion:"claude-3-7-sonnet-latest"},
  {id:"ent-claude-3.7-sonnet-20250219",name:"Claude 3.7 Sonnet (20250219)",llmVersion:"claude-3-7-sonnet-20250219"},
  {id:"ent-claude-3.5-sonnet",name:"Claude 3.5 Sonnet",llmVersion:"claude-3-5-sonnet-latest"},
  {id:"ent-claude-3.5-sonnet-20241022",name:"Claude 3.5 Sonnet (20241022)",llmVersion:"claude-3-5-sonnet-20241022"},
  {id:"ent-claude-3.5-sonnet-20240620",name:"Claude 3.5 Sonnet (20240620)",llmVersion:"claude-3-5-sonnet-20240620"},
  {id:"ent-claude-haiku-4.5",name:"Claude Haiku 4.5",llmVersion:"claude-haiku-4-5"},
  {id:"ent-claude-haiku-4.5-20251001",name:"Claude Haiku 4.5 (20251001)",llmVersion:"claude-haiku-4-5-20251001"},
  {id:"ent-claude-3.5-haiku",name:"Claude 3.5 Haiku",llmVersion:"claude-3-5-haiku-latest"},
  {id:"ent-claude-3.5-haiku-20241022",name:"Claude 3.5 Haiku (20241022)",llmVersion:"claude-3-5-haiku-20241022"},
  {id:"ent-claude-3-opus",name:"Claude 3 Opus",llmVersion:"claude-3-opus-latest"},
  {id:"ent-claude-3-opus-20240229",name:"Claude 3 Opus (20240229)",llmVersion:"claude-3-opus-20240229"},
  {id:"ent-claude-3-haiku",name:"Claude 3 Haiku",llmVersion:"claude-3-haiku-20240307"}
];

const imgModels = [
  {id:"sd-3.5-large",name:"SD 3.5 Large",provider:"Stability"},
  {id:"flux-dev",name:"Flux Dev",provider:"BFL"}
];

// 合并所有模型
const ALL_MODELS = [...hS, ...imgModels];

// === 伪装头 ===
function getCamouflagedHeaders(token: string) {
  return {
    "Host": "theoldllm.vercel.app",
    "connection": "keep-alive",
    "pragma": "no-cache",
    "cache-control": "no-cache",
    "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "dnt": "1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "accept": "*/*",
    "content-type": "application/json",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "referer": "https://theoldllm.vercel.app/",
    "origin": "https://theoldllm.vercel.app",
    "accept-language": "zh-HK,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "authorization": token,
    "priority": "u=1, i"
  };
}

// === 辅助函数 ===
function convertMessagesToPrompt(messages: any[]): string {
  if (!Array.isArray(messages)) return "";
  return messages.map(m => {
    let role = m.role.charAt(0).toUpperCase() + m.role.slice(1);
    return `${role}: ${m.content}`;
  }).join("\n\n");
}

function getBackendModelConfig(requestedId: string) {
  const modelObj = ALL_MODELS.find(m => m.id === requestedId);
  
  if (!modelObj) {
    return { version: requestedId, provider: "OpenAI", isProxy: false };
  }

  const version = modelObj.llmVersion || modelObj.id;
  let provider = "OpenAI";
  const vLower = version.toLowerCase();
  
  if (modelObj.provider) {
    provider = modelObj.provider;
  } else {
    // 自动推断
    if (vLower.includes("claude")) provider = "Anthropic";
    else if (vLower.includes("gemini") || vLower.includes("gemma")) provider = "Google";
    else if (vLower.includes("mistral") || vLower.includes("mixtral")) provider = "Mistral";
    else if (vLower.includes("deepseek")) provider = "DeepSeek";
    else if (vLower.includes("grok")) provider = "xAI";
    else if (vLower.includes("llama")) provider = "Meta";
    else if (vLower.includes("minimax")) provider = "MiniMax";
    else if (vLower.includes("qwen")) provider = "Alibaba";
  }

  return { 
    version, 
    provider,
    isProxy: !!modelObj.isProxy,
    apiProvider: modelObj.apiProvider 
  };
}

// === 主服务逻辑 ===
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const method = req.method;

  // CORS
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  let authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    authHeader = FALLBACK_TOKEN;
  }

  // 1. GET /v1/models
  if (url.pathname === "/v1/models") {
    return new Response(JSON.stringify({
      object: "list",
      data: ALL_MODELS.map(m => ({
        id: m.id,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "openai-proxy",
        name: m.name
      }))
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  // 2. POST /v1/chat/completions
  if (url.pathname === "/v1/chat/completions" && method === "POST") {
    try {
      const body = await req.json();
      const userModel = body.model || DEFAULT_CHAT_MODEL;
      const isStream = body.stream || false;
      const headers = getCamouflagedHeaders(authHeader);
      
      const modelConfig = getBackendModelConfig(userModel);

      // --- BRANCH 1: Direct Proxy Mode (Gemini 3, Claude Thinking, etc.) ---
      if (modelConfig.isProxy && modelConfig.apiProvider) {
        const proxyUrl = `${UPSTREAM_ORIGIN}/api/proxy?provider=${modelConfig.apiProvider}`;
        
        // 构造 Proxy Payload
        // 这里的 modelConfig.version 就是我们在数组里定义的 id (例如 "gemini-claude-opus-4-5-thinking")
        const proxyPayload = {
          model: modelConfig.version, 
          messages: body.messages,
          stream: true 
        };

        const resp = await fetch(proxyUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(proxyPayload)
        });

        if (!resp.ok) {
           throw new Error(`Proxy Request Failed: ${resp.status} - ${await resp.text()}`);
        }

        // 透传逻辑：
        // 如果客户端请求流式，直接返回上游流 (因为上游是 P7，返回标准 OpenAI SSE)
        if (isStream) {
            return new Response(resp.body, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            });
        } else {
            // 如果客户端请求非流式，聚合流数据返回单次 JSON
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let usageData = null;
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // 保留未完整的行

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                        try {
                            const json = JSON.parse(trimmed.slice(6));
                            if (json.choices && json.choices[0].delta.content) {
                                fullText += json.choices[0].delta.content;
                            }
                            if (json.usage) {
                                usageData = json.usage;
                            }
                        } catch (e) {}
                    }
                }
            }

            return new Response(JSON.stringify({
                id: `chatcmpl-${crypto.randomUUID()}`,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: userModel,
                choices: [{ 
                    index: 0, 
                    message: { role: "assistant", content: fullText }, 
                    finish_reason: "stop" 
                }],
                usage: usageData
            }), { 
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
            });
        }
      }

      // --- BRANCH 2: Standard Persona Mode (For older Ent models) ---
      
      const { version: actualModelName, provider } = modelConfig;

      // 1. Create Persona
      const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
      const agentName = `${actualModelName} Agent v${randomSuffix}`;
      
      const personaPayload = {
        name: agentName,
        description: `Direct chat with ${provider}`,
        system_prompt: "You are a helpful assistant.",
        task_prompt: "",
        llm_model_provider_override: provider,
        llm_model_version_override: actualModelName,
        tool_ids: [],
        is_public: false,
        include_citations: false,
        num_chunks: 0,
        datetime_aware: false,
        llm_filter_extraction: false,
        llm_relevance_filter: false,
        document_set_ids: [],
        recency_bias: "no_decay"
      };

      const personaResp = await fetch(`${UPSTREAM_ORIGIN}/sv5/persona`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(personaPayload)
      });

      if (!personaResp.ok) throw new Error(`Create Persona Failed: ${personaResp.status}`);
      const personaData = await personaResp.json();
      const personaId = personaData.id;

      // 2. Create Session
      const sessionResp = await fetch(`${UPSTREAM_ORIGIN}/sv5/chat/create-chat-session`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ persona_id: personaId, description: "Chat Session" })
      });

      if (!sessionResp.ok) throw new Error(`Create Session Failed: ${sessionResp.status}`);
      const sessionData = await sessionResp.json();
      const sessionId = sessionData.chat_session_id;

      // 3. Send Message
      const prompt = convertMessagesToPrompt(body.messages);
      const msgResp = await fetch(`${UPSTREAM_ORIGIN}/sv5/chat/send-message`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          chat_session_id: sessionId,
          parent_message_id: null,
          message: prompt,
          file_descriptors: [],
          search_doc_ids: [],
          retrieval_options: {}
        })
      });

      if (!msgResp.ok) throw new Error(`Send Message Failed: ${msgResp.status}`);

      // 4. Stream Handling (Old style manual parsing for Persona API)
      const stream = msgResp.body;
      if (!stream) throw new Error("No upstream body");

      const readable = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          const chunkId = `chatcmpl-${crypto.randomUUID()}`;
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
                  const json = JSON.parse(line);
                  if (json?.obj?.type === "message_delta" && json.obj.content) {
                    if (isStream) {
                      const data = JSON.stringify({
                        id: chunkId,
                        object: "chat.completion.chunk",
                        created: created,
                        model: userModel,
                        choices: [{ index: 0, delta: { content: json.obj.content }, finish_reason: null }]
                      });
                      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    }
                  }
                } catch (e) {}
              }
            }
            if (isStream) controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (e) {
            controller.error(e);
          } finally {
            controller.close();
          }
        }
      });

      if (isStream) {
        return new Response(readable, {
          headers: { "Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "*" }
        });
      } else {
        // Fallback for non-stream on standard path
        const reader = readable.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while(true) {
            const {done, value} = await reader.read();
            if(done) break;
            const text = decoder.decode(value);
            const lines = text.split("\n");
            for(const l of lines) {
                if(l.startsWith("data: ") && !l.includes("[DONE]")) {
                    try {
                        const d = JSON.parse(l.slice(6));
                        fullText += d.choices[0].delta.content || "";
                    } catch {}
                }
            }
        }
        return new Response(JSON.stringify({
            id: `chatcmpl-${crypto.randomUUID()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: userModel,
            choices: [{ index: 0, message: { role: "assistant", content: fullText }, finish_reason: "stop" }]
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }

    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  // 3. POST /v1/images/generations
  if (url.pathname === "/v1/images/generations" && method === "POST") {
    try {
      const body = await req.json();
      const headers = getCamouflagedHeaders(authHeader);
      
      const model = body.model || "sd-3.5-large";
      const prompt = body.prompt;
      let size = body.size || "1024x1024";

      if (!prompt) throw new Error("Missing prompt");

      const imgPayload = {
        model: model,
        prompt: prompt,
        size: size,
        n: 1,
        response_format: "url"
      };

      const resp = await fetch(`${UPSTREAM_ORIGIN}/api/v1/images/generations`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(imgPayload)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Image Gen Failed (${resp.status}): ${errText}`);
      }

      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  return new Response("Not Found", { status: 404 });
});

