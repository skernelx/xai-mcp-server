/**
 * Unit tests for MCP Tool handlers
 * Tests all tool handlers with mocked XAI client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the xai-client module
vi.mock("../src/xai-client.js", () => ({
  getXAIClient: vi.fn(),
}));

import { getXAIClient } from "../src/xai-client.js";
import { handleChat, chatSchema } from "../src/tools/chat.js";
import { handleGenerateImage, generateImageSchema } from "../src/tools/generate-image.js";
import { handleGenerateVideo, generateVideoSchema } from "../src/tools/generate-video.js";
import { handleVision, visionSchema } from "../src/tools/vision.js";
import { handleLiveSearch, liveSearchSchema } from "../src/tools/live-search.js";

const mockClient = {
  chatCompletion: vi.fn(),
  generateImage: vi.fn(),
  generateVideo: vi.fn(),
  editVideo: vi.fn(),
  pollVideoCompletion: vi.fn(),
  analyzeImage: vi.fn(),
  liveSearch: vi.fn(),
};

describe("Tool Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getXAIClient as any).mockReturnValue(mockClient);
  });

  describe("handleChat", () => {
    it("should handle basic chat message", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce({
        model: "grok-3",
        choices: [
          { index: 0, message: { content: "Hello!" }, finish_reason: "stop" },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      });

      const result = await handleChat({ message: "Hi" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.response).toBe("Hello!");
      expect(parsed.model).toBe("grok-3");
    });

    it("should include system prompt when provided", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce({
        model: "grok-3",
        choices: [{ index: 0, message: { content: "I am helpful." }, finish_reason: "stop" }],
        usage: { prompt_tokens: 15, completion_tokens: 5, total_tokens: 20 },
      });

      await handleChat({
        message: "Hi",
        system_prompt: "You are a helpful assistant.",
      });

      expect(mockClient.chatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system", content: "You are a helpful assistant." }),
          ]),
        })
      );
    });

    it("should pass all parameters correctly", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce({
        model: "grok-4",
        choices: [{ index: 0, message: { content: "Response" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });

      await handleChat({
        message: "Test",
        model: "grok-4",
        temperature: 0.5,
        max_tokens: 100,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      });

      expect(mockClient.chatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "grok-4",
          temperature: 0.5,
          max_tokens: 100,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
        })
      );
    });

    it("should handle empty response", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce({
        model: "grok-3",
        choices: [{ index: 0, message: { content: null }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
      });

      const result = await handleChat({ message: "Hi" });
      const parsed = JSON.parse(result);

      expect(parsed.response).toBe("No response");
    });

    it("should use XAI_MODEL when model is omitted", async () => {
      process.env.XAI_MODEL = "grok-4.1-fast";
      mockClient.chatCompletion.mockResolvedValueOnce({
        model: "grok-4.1-fast",
        choices: [{ index: 0, message: { content: "Configured model" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 6, completion_tokens: 4, total_tokens: 10 },
      });

      await handleChat({ message: "Hi" });

      expect(mockClient.chatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "grok-4.1-fast",
        })
      );

      delete process.env.XAI_MODEL;
    });
  });

  describe("chatSchema validation", () => {
    it("should validate valid input", () => {
      const input = { message: "Hello" };
      expect(() => chatSchema.parse(input)).not.toThrow();
    });

    it("should apply defaults", () => {
      const input = { message: "Hello" };
      const parsed = chatSchema.parse(input);
      expect(parsed.model).toBeUndefined();
      expect(parsed.temperature).toBe(0.7);
    });

    it("should reject invalid temperature", () => {
      const input = { message: "Hello", temperature: 3 };
      expect(() => chatSchema.parse(input)).toThrow();
    });
  });

  describe("handleGenerateImage", () => {
    it("should generate image with URL response", async () => {
      mockClient.generateImage.mockResolvedValueOnce({
        created: 1234567890,
        data: [{ url: "https://storage.xai.com/image.png", revised_prompt: "A sunset" }],
      });

      const result = await handleGenerateImage({ prompt: "A sunset" });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.images[0].url).toBe("https://storage.xai.com/image.png");
      expect(parsed.count).toBe(1);
    });

    it("should handle multiple images", async () => {
      mockClient.generateImage.mockResolvedValueOnce({
        created: 1234567890,
        data: [
          { url: "https://storage.xai.com/image1.png" },
          { url: "https://storage.xai.com/image2.png" },
        ],
      });

      const result = await handleGenerateImage({ prompt: "A cat", n: 2 });
      const parsed = JSON.parse(result);

      expect(parsed.images).toHaveLength(2);
      expect(parsed.count).toBe(2);
    });

    it("should handle base64 response format", async () => {
      mockClient.generateImage.mockResolvedValueOnce({
        created: 1234567890,
        data: [{ b64_json: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCA..." }],
      });

      const result = await handleGenerateImage({
        prompt: "A cat",
        response_format: "b64_json",
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.note).toContain("truncated");
    });

    it("should pass aspect ratio", async () => {
      mockClient.generateImage.mockResolvedValueOnce({
        created: 1234567890,
        data: [{ url: "https://storage.xai.com/image.png" }],
      });

      await handleGenerateImage({ prompt: "A landscape", aspect_ratio: "16:9" });

      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ aspect_ratio: "16:9" })
      );
    });
  });

  describe("generateImageSchema validation", () => {
    it("should validate valid input", () => {
      expect(() => generateImageSchema.parse({ prompt: "A cat" })).not.toThrow();
    });

    it("should reject n > 10", () => {
      expect(() => generateImageSchema.parse({ prompt: "A cat", n: 11 })).toThrow();
    });

    it("should validate aspect_ratio enum", () => {
      expect(() => generateImageSchema.parse({ prompt: "A cat", aspect_ratio: "16:9" })).not.toThrow();
      expect(() => generateImageSchema.parse({ prompt: "A cat", aspect_ratio: "invalid" })).toThrow();
    });
  });

  describe("handleGenerateVideo", () => {
    it("should generate video and wait for completion", async () => {
      mockClient.generateVideo.mockResolvedValueOnce({ request_id: "video-123" });
      mockClient.pollVideoCompletion.mockResolvedValueOnce({
        status: "completed",
        url: "https://storage.xai.com/video.mp4",
        duration: 5,
      });

      const result = await handleGenerateVideo({
        prompt: "A cat playing",
        wait_for_completion: true,
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.status).toBe("completed");
      expect(parsed.video_url).toBe("https://storage.xai.com/video.mp4");
    });

    it("should return immediately when not waiting", async () => {
      mockClient.generateVideo.mockResolvedValueOnce({ request_id: "video-123" });

      const result = await handleGenerateVideo({
        prompt: "A cat playing",
        wait_for_completion: false,
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.status).toBe("pending");
      expect(parsed.request_id).toBe("video-123");
      expect(mockClient.pollVideoCompletion).not.toHaveBeenCalled();
    });

    it("should handle video editing", async () => {
      mockClient.editVideo.mockResolvedValueOnce({ request_id: "video-edit-123" });
      mockClient.pollVideoCompletion.mockResolvedValueOnce({
        status: "completed",
        url: "https://storage.xai.com/edited.mp4",
      });

      const result = await handleGenerateVideo({
        prompt: "Add rain effect",
        video_url: "https://example.com/original.mp4",
        wait_for_completion: true,
      });
      const parsed = JSON.parse(result);

      expect(parsed.operation).toBe("video_edit");
      expect(mockClient.editVideo).toHaveBeenCalled();
    });

    it("should handle video generation failure", async () => {
      mockClient.generateVideo.mockResolvedValueOnce({ request_id: "video-123" });
      mockClient.pollVideoCompletion.mockResolvedValueOnce({
        status: "failed",
        error: "Content policy violation",
      });

      const result = await handleGenerateVideo({
        prompt: "Invalid content",
        wait_for_completion: true,
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.status).toBe("failed");
      expect(parsed.error).toBe("Content policy violation");
    });
  });

  describe("generateVideoSchema validation", () => {
    it("should validate valid input", () => {
      expect(() => generateVideoSchema.parse({ prompt: "A cat" })).not.toThrow();
    });

    it("should reject duration > 15", () => {
      expect(() => generateVideoSchema.parse({ prompt: "A cat", duration: 20 })).toThrow();
    });

    it("should validate resolution enum", () => {
      expect(() => generateVideoSchema.parse({ prompt: "A cat", resolution: "720p" })).not.toThrow();
      expect(() => generateVideoSchema.parse({ prompt: "A cat", resolution: "1080p" })).toThrow();
    });
  });

  describe("handleVision", () => {
    it("should analyze image with prompt", async () => {
      mockClient.analyzeImage.mockResolvedValueOnce(
        "This image shows a beautiful sunset over the ocean."
      );

      const result = await handleVision({
        image_url: "https://example.com/sunset.jpg",
        prompt: "Describe this image",
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.analysis).toContain("sunset");
    });

    it("should use default prompt", async () => {
      mockClient.analyzeImage.mockResolvedValueOnce("A detailed description.");

      await handleVision({ image_url: "https://example.com/image.jpg" });

      expect(mockClient.analyzeImage).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
        "Describe this image in detail.",
        "grok-2-vision-1212",
        "auto"
      );
    });

    it("should pass detail level", async () => {
      mockClient.analyzeImage.mockResolvedValueOnce("High detail analysis.");

      await handleVision({
        image_url: "https://example.com/image.jpg",
        detail: "high",
      });

      expect(mockClient.analyzeImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        "high"
      );
    });
  });

  describe("visionSchema validation", () => {
    it("should require image_url", () => {
      expect(() => visionSchema.parse({})).toThrow();
    });

    it("should validate detail enum", () => {
      expect(() => visionSchema.parse({ image_url: "https://example.com/img.jpg", detail: "low" })).not.toThrow();
      expect(() => visionSchema.parse({ image_url: "https://example.com/img.jpg", detail: "invalid" })).toThrow();
    });
  });

  describe("handleLiveSearch", () => {
    it("should perform web search", async () => {
      mockClient.liveSearch.mockResolvedValueOnce({
        content: "Silver is trading at $30 per ounce.",
        citations: [{ url: "https://kitco.com", title: "Kitco" }],
        tool_usage: { web_search_calls: 1 },
      });

      const result = await handleLiveSearch({
        query: "silver price",
        sources: ["web"],
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.content).toContain("Silver");
      expect(parsed.citations).toHaveLength(1);
    });

    it("should perform X search", async () => {
      mockClient.liveSearch.mockResolvedValueOnce({
        content: "Recent tweets about silver prices...",
        citations: [{ url: "https://x.com/user/123", title: "Tweet" }],
        tool_usage: { x_search_calls: 1 },
      });

      const result = await handleLiveSearch({
        query: "silver price",
        sources: ["x"],
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.sources).toContain("x");
    });

    it("should apply web filters", async () => {
      mockClient.liveSearch.mockResolvedValueOnce({
        content: "Results from specific domains.",
        citations: [],
      });

      await handleLiveSearch({
        query: "silver price",
        sources: ["web"],
        web_filters: {
          allowed_domains: ["kitco.com", "reuters.com"],
          country: "US",
        },
      });

      expect(mockClient.liveSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          web_filters: expect.objectContaining({
            allowed_domains: ["kitco.com", "reuters.com"],
            user_location_country: "US",
          }),
        })
      );
    });

    it("should apply X filters", async () => {
      mockClient.liveSearch.mockResolvedValueOnce({
        content: "Filtered tweets.",
        citations: [],
        tool_usage: { x_search_calls: 1 },
      });

      await handleLiveSearch({
        query: "silver price",
        sources: ["x"],
        x_filters: {
          allowed_handles: ["kitco", "reuters"],
          from_date: "2024-01-01",
          to_date: "2024-12-31",
        },
      });

      expect(mockClient.liveSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          x_filters: expect.objectContaining({
            allowed_x_handles: ["kitco", "reuters"],
            from_date: "2024-01-01",
            to_date: "2024-12-31",
          }),
        })
      );
    });

    it("should reject conflicting domain filters", async () => {
      await expect(
        handleLiveSearch({
          query: "test",
          sources: ["web"],
          web_filters: {
            allowed_domains: ["a.com"],
            excluded_domains: ["b.com"],
          },
        })
      ).rejects.toThrow("Cannot use both allowed_domains and excluded_domains together");
    });

    it("should reject conflicting handle filters", async () => {
      await expect(
        handleLiveSearch({
          query: "test",
          sources: ["x"],
          x_filters: {
            allowed_handles: ["user1"],
            excluded_handles: ["user2"],
          },
        })
      ).rejects.toThrow("Cannot use both allowed_handles and excluded_handles together");
    });
  });

  describe("liveSearchSchema validation", () => {
    it("should require query", () => {
      expect(() => liveSearchSchema.parse({})).toThrow();
    });

    it("should default to web source", () => {
      const parsed = liveSearchSchema.parse({ query: "test" });
      expect(parsed.sources).toEqual(["web"]);
    });

    it("should validate sources enum", () => {
      expect(() => liveSearchSchema.parse({ query: "test", sources: ["web", "x"] })).not.toThrow();
      expect(() => liveSearchSchema.parse({ query: "test", sources: ["invalid"] })).toThrow();
    });

    it("should limit max_results", () => {
      expect(() => liveSearchSchema.parse({ query: "test", max_results: 25 })).toThrow();
    });
  });
});
