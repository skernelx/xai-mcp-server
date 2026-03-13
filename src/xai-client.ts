/**
 * xAI API Client
 * Typed client for interacting with xAI's Grok APIs
 * Based on xAI API documentation: https://docs.x.ai/docs/api-reference
 */

const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_SEARCH_MODEL = "grok-4-0709";

function normalizeBaseUrl(baseUrl?: string): string {
  if (!baseUrl || !baseUrl.trim()) {
    return DEFAULT_XAI_BASE_URL;
  }

  return baseUrl.trim().replace(/\/+$/, "");
}

function parseStreamedChatCompletion(raw: string): ChatCompletionResponse {
  const chunks = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((payload) => payload && payload !== "[DONE]")
    .map((payload) => JSON.parse(payload));

  if (chunks.length === 0) {
    throw new Error("xAI API returned an empty event stream");
  }

  let id = "chatcmpl-stream";
  let created = Math.floor(Date.now() / 1000);
  let model = "";
  let role = "assistant";
  let content = "";
  let finishReason = "stop";
  let usage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  for (const chunk of chunks) {
    if (chunk.id) {
      id = chunk.id;
    }
    if (typeof chunk.created === "number") {
      created = chunk.created;
    }
    if (chunk.model) {
      model = chunk.model;
    }

    const choice = chunk.choices?.[0];
    if (choice?.delta?.role) {
      role = choice.delta.role;
    }
    if (typeof choice?.delta?.content === "string") {
      content += choice.delta.content;
    }
    if (choice?.finish_reason) {
      finishReason = choice.finish_reason;
    }

    if (chunk.usage) {
      usage = {
        prompt_tokens: chunk.usage.prompt_tokens || 0,
        completion_tokens: chunk.usage.completion_tokens || 0,
        total_tokens: chunk.usage.total_tokens || 0,
      };
    }
  }

  return {
    id,
    object: "chat.completion",
    created,
    model,
    choices: [
      {
        index: 0,
        message: {
          role,
          content,
        },
        finish_reason: finishReason,
      },
    ],
    usage,
  };
}

// ============ Types ============

export interface XAIConfig {
  apiKey: string;
  baseUrl?: string;
}

// Chat types (legacy endpoint)
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "developer";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "low" | "high" | "auto" };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Responses API types (for search tools)
export interface ResponsesMessage {
  role: "user" | "assistant" | "system" | "developer";
  content: string | ResponsesContentPart[];
}

export interface ResponsesContentPart {
  type: "input_text" | "input_image";
  text?: string;
  image_url?: string;
  detail?: "low" | "high" | "auto";
}

export interface WebSearchFilters {
  allowed_domains?: string[];
  excluded_domains?: string[];
  enable_image_understanding?: boolean;
  user_location_country?: string;
  user_location_city?: string;
  user_location_region?: string;
  user_location_timezone?: string;
}

export interface XSearchFilters {
  allowed_x_handles?: string[];
  excluded_x_handles?: string[];
  from_date?: string;
  to_date?: string;
  enable_image_understanding?: boolean;
  enable_video_understanding?: boolean;
}

export interface SearchTool {
  type: "web_search" | "x_search";
  filters?: WebSearchFilters | XSearchFilters;
}

export interface ResponsesRequest {
  model: string;
  input: ResponsesMessage[];
  tools?: SearchTool[];
  store?: boolean;
  include?: string[];
}

export interface Citation {
  url: string;
  title?: string;
}

export interface ResponsesResponse {
  id: string;
  output: {
    role: string;
    content: string;
  }[];
  citations?: Citation[];
  inline_citations?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens?: number;
  };
  server_side_tool_usage?: {
    web_search_calls?: number;
    x_search_calls?: number;
  };
}

// Image generation types
export interface ImageGenerationRequest {
  model: string;
  prompt: string;
  n?: number;
  response_format?: "url" | "b64_json";
  aspect_ratio?: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: {
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }[];
}

// Image edit types
export interface ImageEditRequest {
  model: string;
  prompt: string;
  image: string; // base64 or URL
  n?: number;
  response_format?: "url" | "b64_json";
}

// Video generation types
export interface VideoGenerationRequest {
  model: string;
  prompt: string;
  image_url?: string;
  video_url?: string;
  duration?: number;
  aspect_ratio?: string;
  resolution?: "720p" | "480p";
}

export interface VideoEditRequest {
  model: string;
  prompt: string;
  video_url: string;
  aspect_ratio?: string;
  resolution?: "720p" | "480p";
}

export interface VideoGenerationResponse {
  request_id: string;
}

export interface VideoStatusResponse {
  url?: string;
  duration?: number;
  status?: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

// Search types
export interface SearchRequest {
  query: string;
  model?: string;
  sources?: ("web" | "x")[];
  web_filters?: WebSearchFilters;
  x_filters?: XSearchFilters;
  max_results?: number;
}

export interface SearchResponse {
  content: string;
  citations?: Citation[];
  tool_usage?: {
    web_search_calls?: number;
    x_search_calls?: number;
  };
}

// Model types
export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ModelsResponse {
  object: string;
  data: Model[];
}

// Legacy completions types
export interface CompletionRequest {
  model: string;
  prompt: string | string[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  suffix?: string;
  echo?: boolean;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    text: string;
    index: number;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Deferred completion types
export interface DeferredCompletionResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: ChatCompletionResponse;
  error?: string;
}

// Tokenize types
export interface TokenizeRequest {
  model: string;
  text: string;
}

export interface TokenizeResponse {
  tokens: number[];
  count: number;
}

// API Key types
export interface ApiKeyInfo {
  id: string;
  name?: string;
  created: number;
  team_id?: string;
  permissions?: string[];
}

// ============ Client ============

export class XAIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: XAIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            ...options.headers,
          },
        });

        if (!response.ok) {
          const status = response.status;
          const error = await response.text();

          // Retry on rate limit (429) or server errors (5xx)
          if ((status === 429 || status >= 500) && attempt < retries - 1) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            lastError = new Error(`xAI API error (${status}): ${error}`);
            continue;
          }

          throw new Error(`xAI API error (${status}): ${error}`);
        }

        const contentType =
          typeof response.headers?.get === "function"
            ? response.headers.get("content-type") || ""
            : "";

        if (contentType.includes("text/event-stream")) {
          const raw = await response.text();

          if (endpoint === "/chat/completions") {
            return parseStreamedChatCompletion(raw) as T;
          }

          throw new Error(
            `xAI API returned unsupported event stream response for ${endpoint}`
          );
        }

        return response.json() as Promise<T>;
      } catch (err) {
        // Network errors - retry with backoff
        if (
          err instanceof TypeError &&
          err.message.includes("fetch") &&
          attempt < retries - 1
        ) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  // ============ Models ============

  async listModels(): Promise<ModelsResponse> {
    return this.request<ModelsResponse>("/models");
  }

  async getModel(modelId: string): Promise<Model> {
    return this.request<Model>(`/models/${modelId}`);
  }

  async listLanguageModels(): Promise<ModelsResponse> {
    return this.request<ModelsResponse>("/language-models");
  }

  async listImageGenerationModels(): Promise<ModelsResponse> {
    return this.request<ModelsResponse>("/image-generation-models");
  }

  // ============ API Key ============

  async getApiKeyInfo(): Promise<ApiKeyInfo> {
    return this.request<ApiKeyInfo>("/api-key");
  }

  // ============ Tokenization ============

  async tokenizeText(request: TokenizeRequest): Promise<TokenizeResponse> {
    return this.request<TokenizeResponse>("/tokenize-text", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ============ Chat Completions ============

  async chatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    return this.request<ChatCompletionResponse>("/chat/completions", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getDeferredCompletion(
    requestId: string
  ): Promise<DeferredCompletionResponse> {
    return this.request<DeferredCompletionResponse>(
      `/chat/deferred-completion/${requestId}`
    );
  }

  // ============ Legacy Completions ============

  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    return this.request<CompletionResponse>("/completions", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ============ Responses API (for Search Tools) ============

  async createResponse(request: ResponsesRequest): Promise<ResponsesResponse> {
    return this.request<ResponsesResponse>("/responses", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getResponse(responseId: string): Promise<ResponsesResponse> {
    return this.request<ResponsesResponse>(`/responses/${responseId}`);
  }

  async deleteResponse(responseId: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/responses/${responseId}`, {
      method: "DELETE",
    });
  }

  // ============ Live Search (via Responses API) ============

  async liveSearch(request: SearchRequest): Promise<SearchResponse> {
    const tools: SearchTool[] = [];
    const sources = request.sources || ["web"];
    const model =
      request.model ||
      process.env.XAI_SEARCH_MODEL ||
      process.env.XAI_MODEL ||
      DEFAULT_SEARCH_MODEL;

    // Build tools array based on requested sources
    if (sources.includes("web")) {
      const webTool: SearchTool = { type: "web_search" };
      if (request.web_filters) {
        webTool.filters = request.web_filters;
      }
      tools.push(webTool);
    }

    if (sources.includes("x")) {
      const xTool: SearchTool = { type: "x_search" };
      if (request.x_filters) {
        xTool.filters = request.x_filters;
      }
      tools.push(xTool);
    }

    // Build the request
    // Note: Server-side tools require grok-4 family models
    const responsesRequest: ResponsesRequest = {
      model,
      input: [
        {
          role: "user",
          content: request.query,
        },
      ],
      tools,
      store: false, // Don't store search queries
    };

    const response = await this.createResponse(responsesRequest);

    // Extract content from response
    const content =
      response.output
        ?.map((o) => (typeof o.content === "string" ? o.content : ""))
        .join("\n") || "No results found";

    return {
      content,
      citations: response.citations,
      tool_usage: response.server_side_tool_usage,
    };
  }

  // ============ Image Generation ============

  async generateImage(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    return this.request<ImageGenerationResponse>("/images/generations", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async editImage(request: ImageEditRequest): Promise<ImageGenerationResponse> {
    return this.request<ImageGenerationResponse>("/images/edits", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ============ Video Generation ============

  async generateVideo(
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResponse> {
    return this.request<VideoGenerationResponse>("/videos/generations", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async editVideo(request: VideoEditRequest): Promise<VideoGenerationResponse> {
    return this.request<VideoGenerationResponse>("/videos/edits", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getVideoStatus(requestId: string): Promise<VideoStatusResponse> {
    return this.request<VideoStatusResponse>(`/videos/${requestId}`);
  }

  async pollVideoCompletion(
    requestId: string,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<VideoStatusResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getVideoStatus(requestId);
      if (status.status === "completed" || status.status === "failed") {
        return status;
      }
      // If we get a url, consider it completed
      if (status.url) {
        return { ...status, status: "completed" };
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error("Video generation timed out");
  }

  // ============ Vision (via Chat with Image) ============

  async analyzeImage(
    imageUrl: string,
    prompt: string,
    model: string = "grok-2-vision-1212",
    detail: "low" | "high" | "auto" = "auto"
  ): Promise<string> {
    const response = await this.chatCompletion({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl, detail } },
          ],
        },
      ],
    });

    return response.choices[0]?.message?.content || "No analysis available";
  }
}

// Singleton factory
let clientInstance: XAIClient | null = null;

export function getXAIClient(): XAIClient {
  if (!clientInstance) {
    const apiKey = process.env.XAI_API_KEY;
    const baseUrl = process.env.XAI_BASE_URL;
    if (!apiKey) {
      throw new Error(
        "XAI_API_KEY is not configured.\n\n" +
          "To fix this, add your xAI API key to ~/.claude/mcp.json:\n\n" +
          '  "xai": {\n' +
          '    "command": "xai-mcp-server",\n' +
          '    "env": {\n' +
          '      "XAI_API_KEY": "your-api-key-here",\n' +
          '      "XAI_BASE_URL": "https://your-gateway.example/v1"\n' +
          "    }\n" +
          "  }\n\n" +
          "XAI_BASE_URL is optional and only needed when you use a custom xAI-compatible gateway.\n\n" +
          "Get your API key at: https://console.x.ai/\n" +
          "Then restart Claude Code."
      );
    }
    clientInstance = new XAIClient({ apiKey, baseUrl });
  }
  return clientInstance;
}

// Export for testing
export function resetClientInstance(): void {
  clientInstance = null;
}

export function createTestClient(config: XAIConfig): XAIClient {
  return new XAIClient(config);
}
