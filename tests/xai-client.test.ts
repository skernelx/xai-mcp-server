/**
 * Unit tests for XAI Client
 * Tests all API methods with mocked fetch
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  XAIClient,
  createTestClient,
  resetClientInstance,
  getXAIClient,
} from "../src/xai-client.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("XAIClient", () => {
  let client: XAIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestClient({ apiKey: "test-api-key" });
  });

  afterEach(() => {
    resetClientInstance();
  });

  describe("constructor", () => {
    it("should create client with default base URL", () => {
      const c = createTestClient({ apiKey: "test" });
      expect(c).toBeInstanceOf(XAIClient);
    });

    it("should create client with custom base URL", () => {
      const c = createTestClient({
        apiKey: "test",
        baseUrl: "https://custom.api.com",
      });
      expect(c).toBeInstanceOf(XAIClient);
    });

    it("should normalize trailing slash in custom base URL", async () => {
      const c = createTestClient({
        apiKey: "test",
        baseUrl: "https://custom.api.com/",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ object: "list", data: [] }),
      });

      await c.listModels();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.api.com/models",
        expect.anything()
      );
    });
  });

  describe("getXAIClient", () => {
    it("should throw error when XAI_API_KEY is not set", () => {
      const originalEnv = process.env.XAI_API_KEY;
      delete process.env.XAI_API_KEY;
      resetClientInstance();

      expect(() => getXAIClient()).toThrow("XAI_API_KEY is not configured");

      if (originalEnv) {
        process.env.XAI_API_KEY = originalEnv;
      }
    });

    it("should return singleton instance when API key is set", () => {
      process.env.XAI_API_KEY = "test-key";
      resetClientInstance();

      const client1 = getXAIClient();
      const client2 = getXAIClient();

      expect(client1).toBe(client2);

      delete process.env.XAI_API_KEY;
      resetClientInstance();
    });

    it("should use XAI_BASE_URL from environment", async () => {
      process.env.XAI_API_KEY = "test-key";
      process.env.XAI_BASE_URL = "https://gateway.example.com/v1/";
      resetClientInstance();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ object: "list", data: [] }),
      });

      const singleton = getXAIClient();
      await singleton.listModels();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://gateway.example.com/v1/models",
        expect.anything()
      );

      delete process.env.XAI_API_KEY;
      delete process.env.XAI_BASE_URL;
      resetClientInstance();
    });
  });

  describe("listModels", () => {
    it("should fetch models list", async () => {
      const mockResponse = {
        object: "list",
        data: [
          { id: "grok-3", object: "model", created: 1234567890, owned_by: "xai" },
          { id: "grok-4", object: "model", created: 1234567890, owned_by: "xai" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.listModels();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/models",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getModel", () => {
    it("should fetch specific model", async () => {
      const mockResponse = {
        id: "grok-3",
        object: "model",
        created: 1234567890,
        owned_by: "xai",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getModel("grok-3");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/models/grok-3",
        expect.anything()
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("listLanguageModels", () => {
    it("should fetch language models list", async () => {
      const mockResponse = {
        object: "list",
        data: [
          { id: "grok-3", object: "model", created: 1234567890, owned_by: "xai" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.listLanguageModels();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/language-models",
        expect.anything()
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("listImageGenerationModels", () => {
    it("should fetch image generation models list", async () => {
      const mockResponse = {
        object: "list",
        data: [
          { id: "grok-2-image-1212", object: "model", created: 1234567890, owned_by: "xai" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.listImageGenerationModels();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/image-generation-models",
        expect.anything()
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getApiKeyInfo", () => {
    it("should fetch API key information", async () => {
      const mockResponse = {
        id: "key-123",
        name: "My API Key",
        created: 1234567890,
        team_id: "team-456",
        permissions: ["chat", "images"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getApiKeyInfo();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/api-key",
        expect.anything()
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("tokenizeText", () => {
    it("should tokenize text", async () => {
      const mockResponse = {
        tokens: [123, 456, 789],
        count: 3,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.tokenizeText({
        model: "grok-3",
        text: "Hello world",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/tokenize-text",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ model: "grok-3", text: "Hello world" }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("chatCompletion", () => {
    it("should send chat completion request", async () => {
      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "grok-3",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Hello!" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.chatCompletion({
        model: "grok-3",
        messages: [{ role: "user", content: "Hi" }],
        temperature: 0.7,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            model: "grok-3",
            messages: [{ role: "user", content: "Hi" }],
            temperature: 0.7,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle chat with system prompt", async () => {
      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "grok-3",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "I am helpful." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.chatCompletion({
        model: "grok-3",
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hi" },
        ],
      });

      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages).toHaveLength(2);
      expect(callBody.messages[0].role).toBe("system");
    });

    it("should parse streamed chat completion responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "content-type" ? "text/event-stream" : null,
        },
        text: () =>
          Promise.resolve(
            'data: {"id":"chatcmpl-stream","object":"chat.completion.chunk","created":1234567890,"model":"grok-4.1-fast","choices":[{"delta":{"role":"assistant","content":""},"finish_reason":null,"index":0}],"usage":null}\n\n' +
              'data: {"id":"chatcmpl-stream","object":"chat.completion.chunk","created":1234567890,"model":"grok-4.1-fast","choices":[{"delta":{"content":"OK"},"finish_reason":null,"index":0}],"usage":null}\n\n' +
              'data: {"id":"chatcmpl-stream","object":"chat.completion.chunk","created":1234567890,"model":"grok-4.1-fast","choices":[{"delta":{},"finish_reason":"stop","index":0}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}\n\n' +
              "data: [DONE]\n"
          ),
      });

      const result = await client.chatCompletion({
        model: "grok-4.1-fast",
        messages: [{ role: "user", content: "Reply with exactly OK" }],
      });

      expect(result.model).toBe("grok-4.1-fast");
      expect(result.choices[0].message.role).toBe("assistant");
      expect(result.choices[0].message.content).toBe("OK");
      expect(result.choices[0].finish_reason).toBe("stop");
      expect(result.usage.total_tokens).toBe(2);
    });
  });

  describe("getDeferredCompletion", () => {
    it("should fetch deferred completion status", async () => {
      const mockResponse = {
        id: "deferred-123",
        status: "completed",
        result: {
          id: "chatcmpl-123",
          choices: [{ index: 0, message: { content: "Done!" }, finish_reason: "stop" }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getDeferredCompletion("deferred-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/chat/deferred-completion/deferred-123",
        expect.anything()
      );
      expect(result.status).toBe("completed");
    });
  });

  describe("completion (legacy)", () => {
    it("should send legacy completion request", async () => {
      const mockResponse = {
        id: "cmpl-123",
        object: "text_completion",
        created: 1234567890,
        model: "grok-3",
        choices: [
          { text: "World!", index: 0, finish_reason: "stop" },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.completion({
        model: "grok-3",
        prompt: "Hello",
        max_tokens: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/completions",
        expect.objectContaining({ method: "POST" })
      );
      expect(result.choices[0].text).toBe("World!");
    });
  });

  describe("createResponse (Responses API)", () => {
    it("should send responses API request with tools", async () => {
      const mockResponse = {
        id: "resp-123",
        output: [{ role: "assistant", content: "Search results..." }],
        citations: [{ url: "https://example.com", title: "Example" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.createResponse({
        model: "grok-3-fast",
        input: [{ role: "user", content: "Search for news" }],
        tools: [{ type: "web_search" }],
        store: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/responses",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getResponse", () => {
    it("should fetch stored response by ID", async () => {
      const mockResponse = {
        id: "resp-123",
        output: [{ role: "assistant", content: "Previous response" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getResponse("resp-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/responses/resp-123",
        expect.anything()
      );
      expect(result.id).toBe("resp-123");
    });
  });

  describe("deleteResponse", () => {
    it("should delete stored response by ID", async () => {
      const mockResponse = { deleted: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.deleteResponse("resp-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/responses/resp-123",
        expect.objectContaining({ method: "DELETE" })
      );
      expect(result.deleted).toBe(true);
    });
  });

  describe("liveSearch", () => {
    it("should perform web search", async () => {
      const mockResponse = {
        id: "resp-123",
        output: [{ role: "assistant", content: "Found results about silver prices..." }],
        citations: [
          { url: "https://kitco.com", title: "Kitco" },
          { url: "https://reuters.com", title: "Reuters" },
        ],
        server_side_tool_usage: { web_search_calls: 2 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.liveSearch({
        query: "silver price today",
        sources: ["web"],
      });

      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tools).toContainEqual({ type: "web_search" });
      expect(callBody.model).toBe("grok-4-0709");
      expect(result.content).toContain("silver prices");
      expect(result.citations).toHaveLength(2);
    });

    it("should use XAI_MODEL for live search when no explicit model is provided", async () => {
      process.env.XAI_MODEL = "grok-4.1-fast";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "resp-456",
            output: [{ role: "assistant", content: "Search results..." }],
            citations: [],
          }),
      });

      await client.liveSearch({
        query: "latest AI news",
        sources: ["web"],
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe("grok-4.1-fast");

      delete process.env.XAI_MODEL;
    });

    it("should perform X search with filters", async () => {
      const mockResponse = {
        id: "resp-123",
        output: [{ role: "assistant", content: "Found tweets about silver..." }],
        citations: [{ url: "https://x.com/user/123", title: "Tweet" }],
        server_side_tool_usage: { x_search_calls: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.liveSearch({
        query: "silver price",
        sources: ["x"],
        x_filters: {
          from_date: "2024-01-01",
          to_date: "2024-12-31",
          allowed_x_handles: ["kitco", "reuters"],
        },
      });

      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tools).toContainEqual(
        expect.objectContaining({
          type: "x_search",
          filters: expect.objectContaining({
            from_date: "2024-01-01",
            allowed_x_handles: ["kitco", "reuters"],
          }),
        })
      );
      expect(result.tool_usage?.x_search_calls).toBe(1);
    });

    it("should perform combined web and X search", async () => {
      const mockResponse = {
        id: "resp-123",
        output: [{ role: "assistant", content: "Combined results..." }],
        citations: [],
        server_side_tool_usage: { web_search_calls: 1, x_search_calls: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.liveSearch({
        query: "test query",
        sources: ["web", "x"],
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.tools).toHaveLength(2);
      expect(callBody.tools.map((t: any) => t.type)).toContain("web_search");
      expect(callBody.tools.map((t: any) => t.type)).toContain("x_search");
    });
  });

  describe("generateImage", () => {
    it("should generate image with URL response", async () => {
      const mockResponse = {
        created: 1234567890,
        data: [
          {
            url: "https://storage.xai.com/image1.png",
            revised_prompt: "A beautiful sunset",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.generateImage({
        model: "grok-2-image",
        prompt: "A sunset",
        n: 1,
        response_format: "url",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/images/generations",
        expect.objectContaining({ method: "POST" })
      );
      expect(result.data[0].url).toBeDefined();
    });

    it("should generate multiple images", async () => {
      const mockResponse = {
        created: 1234567890,
        data: [
          { url: "https://storage.xai.com/image1.png" },
          { url: "https://storage.xai.com/image2.png" },
          { url: "https://storage.xai.com/image3.png" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.generateImage({
        model: "grok-2-image",
        prompt: "A cat",
        n: 3,
      });

      expect(result.data).toHaveLength(3);
    });

    it("should generate image with base64 response", async () => {
      const mockResponse = {
        created: 1234567890,
        data: [
          {
            b64_json: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.generateImage({
        model: "grok-2-image",
        prompt: "A cat",
        response_format: "b64_json",
      });

      expect(result.data[0].b64_json).toBeDefined();
    });
  });

  describe("editImage", () => {
    it("should edit image", async () => {
      const mockResponse = {
        created: 1234567890,
        data: [{ url: "https://storage.xai.com/edited.png" }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.editImage({
        model: "grok-2-image",
        prompt: "Change the sky to purple",
        image: "https://example.com/original.png",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/images/edits",
        expect.objectContaining({ method: "POST" })
      );
      expect(result.data[0].url).toBeDefined();
    });
  });

  describe("generateVideo", () => {
    it("should start video generation", async () => {
      const mockResponse = { request_id: "video-req-123" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.generateVideo({
        model: "grok-2-video",
        prompt: "A cat playing",
        duration: 5,
        aspect_ratio: "16:9",
        resolution: "720p",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/videos/generations",
        expect.objectContaining({ method: "POST" })
      );
      expect(result.request_id).toBe("video-req-123");
    });

    it("should generate video from image", async () => {
      const mockResponse = { request_id: "video-req-456" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.generateVideo({
        model: "grok-2-video",
        prompt: "Animate this image",
        image_url: "https://example.com/image.png",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.image_url).toBe("https://example.com/image.png");
    });
  });

  describe("editVideo", () => {
    it("should edit video", async () => {
      const mockResponse = { request_id: "video-edit-123" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.editVideo({
        model: "grok-2-video",
        prompt: "Add rain effect",
        video_url: "https://example.com/video.mp4",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/videos/edits",
        expect.objectContaining({ method: "POST" })
      );
      expect(result.request_id).toBe("video-edit-123");
    });
  });

  describe("getVideoStatus", () => {
    it("should get video status", async () => {
      const mockResponse = {
        url: "https://storage.xai.com/video.mp4",
        duration: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getVideoStatus("video-req-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.x.ai/v1/videos/video-req-123",
        expect.anything()
      );
      expect(result.url).toBeDefined();
    });
  });

  describe("pollVideoCompletion", () => {
    it("should poll until completion", async () => {
      // First call: processing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "processing" }),
      });

      // Second call: completed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            url: "https://storage.xai.com/video.mp4",
            duration: 5,
          }),
      });

      const result = await client.pollVideoCompletion("video-req-123", 3, 100);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.url).toBe("https://storage.xai.com/video.mp4");
    });

    it("should return on failure status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "failed",
            error: "Generation failed",
          }),
      });

      const result = await client.pollVideoCompletion("video-req-123", 3, 100);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Generation failed");
    });

    it("should timeout after max attempts", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "processing" }),
      });

      await expect(
        client.pollVideoCompletion("video-req-123", 2, 50)
      ).rejects.toThrow("Video generation timed out");
    });
  });

  describe("analyzeImage", () => {
    it("should analyze image with prompt", async () => {
      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "grok-2-vision-latest",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "This image shows a cat sitting on a windowsill.",
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.analyzeImage(
        "https://example.com/cat.jpg",
        "What is in this image?",
        "grok-2-vision-latest",
        "high"
      );

      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].content).toContainEqual(
        expect.objectContaining({ type: "image_url" })
      );
      expect(result).toContain("cat");
    });

    it("should use default parameters", async () => {
      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "grok-2-vision-1212",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "An image." },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.analyzeImage("https://example.com/image.jpg", "Describe");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe("grok-2-vision-1212");
    });
  });

  describe("error handling", () => {
    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await expect(client.listModels()).rejects.toThrow(
        "xAI API error (401): Unauthorized"
      );
    });

    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.listModels()).rejects.toThrow("Network error");
    });

    it("should handle 429 rate limit", async () => {
      // Mock 3 consecutive 429 errors (retry logic tries 3 times by default)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        });

      await expect(client.chatCompletion({
        model: "grok-3",
        messages: [{ role: "user", content: "Hi" }],
      })).rejects.toThrow("xAI API error (429): Rate limit exceeded");
    });

    it("should handle 500 server error", async () => {
      // Mock 3 consecutive 500 errors (retry logic tries 3 times by default)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal server error"),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal server error"),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal server error"),
        });

      await expect(client.generateImage({
        model: "grok-2-image",
        prompt: "test",
      })).rejects.toThrow("xAI API error (500): Internal server error");
    });

    it("should retry on 429 and succeed on second attempt", async () => {
      // First call fails with 429, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: "chatcmpl-123",
            object: "chat.completion",
            created: 1234567890,
            model: "grok-3",
            choices: [{ index: 0, message: { role: "assistant", content: "Success after retry" }, finish_reason: "stop" }],
            usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
          }),
        });

      const result = await client.chatCompletion({
        model: "grok-3",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result.choices[0].message.content).toBe("Success after retry");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
