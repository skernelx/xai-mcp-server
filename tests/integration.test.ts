/**
 * Integration tests for xAI MCP Server
 * Requires XAI_API_KEY environment variable to be set
 * Optionally honors XAI_BASE_URL for custom xAI-compatible gateways
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { XAIClient, createTestClient } from "../src/xai-client.js";

// Skip tests if no API key
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL;
const describeIntegration = XAI_API_KEY ? describe : describe.skip;

describeIntegration("xAI API Integration Tests", () => {
  let client: XAIClient;

  beforeAll(() => {
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY environment variable is required for integration tests");
    }
    client = createTestClient({ apiKey: XAI_API_KEY, baseUrl: XAI_BASE_URL });
  });

  describe("Models API", () => {
    it("should list available models", async () => {
      const models = await client.listModels();

      expect(models.object).toBe("list");
      expect(Array.isArray(models.data)).toBe(true);
      expect(models.data.length).toBeGreaterThan(0);

      // Check for expected models
      const modelIds = models.data.map((m) => m.id);
      console.log("Available models:", modelIds);
    });

    it("should get specific model details", async () => {
      const model = await client.getModel("grok-3");

      expect(model.id).toBe("grok-3");
      expect(model.object).toBe("model");
      expect(model.owned_by).toBeDefined();
    });
  });

  describe("Chat Completions API", () => {
    it("should complete a simple chat message", async () => {
      const response = await client.chatCompletion({
        model: "grok-3",
        messages: [{ role: "user", content: "Say hello in exactly 3 words." }],
        max_tokens: 50,
        temperature: 0.1,
      });

      expect(response.id).toBeDefined();
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBeTruthy();
      expect(response.usage.total_tokens).toBeGreaterThan(0);

      console.log("Chat response:", response.choices[0].message.content);
    });

    it("should handle system prompt", async () => {
      const response = await client.chatCompletion({
        model: "grok-3",
        messages: [
          { role: "system", content: "You always respond with exactly one word." },
          { role: "user", content: "What color is the sky?" },
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      expect(response.choices[0].message.content).toBeTruthy();
      console.log("System prompt response:", response.choices[0].message.content);
    });

    it("should respect temperature parameter", async () => {
      // Low temperature should give more consistent results
      const responses = await Promise.all([
        client.chatCompletion({
          model: "grok-3",
          messages: [{ role: "user", content: "What is 2+2?" }],
          max_tokens: 10,
          temperature: 0.0,
        }),
        client.chatCompletion({
          model: "grok-3",
          messages: [{ role: "user", content: "What is 2+2?" }],
          max_tokens: 10,
          temperature: 0.0,
        }),
      ]);

      // Both should contain "4"
      expect(responses[0].choices[0].message.content).toContain("4");
      expect(responses[1].choices[0].message.content).toContain("4");
    });
  });

  describe("Live Search API (Responses)", () => {
    it("should perform web search", async () => {
      const response = await client.liveSearch({
        query: "What is the current price of Bitcoin?",
        sources: ["web"],
      });

      expect(response.content).toBeTruthy();
      expect(response.content.length).toBeGreaterThan(0);

      console.log("Web search result:", response.content.substring(0, 200) + "...");
      console.log("Citations:", response.citations?.slice(0, 3));
      console.log("Tool usage:", response.tool_usage);
    });

    it("should perform X search", async () => {
      const response = await client.liveSearch({
        query: "Latest news about AI",
        sources: ["x"],
      });

      expect(response.content).toBeTruthy();

      console.log("X search result:", response.content.substring(0, 200) + "...");
      console.log("X citations:", response.citations?.slice(0, 3));
    });

    it("should perform combined search", async () => {
      const response = await client.liveSearch({
        query: "SpaceX latest launch",
        sources: ["web", "x"],
      });

      expect(response.content).toBeTruthy();

      console.log("Combined search result:", response.content.substring(0, 200) + "...");
    });

    it("should apply X date filters", async () => {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const response = await client.liveSearch({
        query: "tech news",
        sources: ["x"],
        x_filters: {
          from_date: lastWeek.toISOString().split("T")[0],
          to_date: today.toISOString().split("T")[0],
        },
      });

      expect(response.content).toBeTruthy();
      console.log("Date-filtered X search:", response.content.substring(0, 200) + "...");
    });
  });

  describe("Image Generation API", () => {
    it("should generate an image", async () => {
      const response = await client.generateImage({
        model: "grok-2-image-1212",
        prompt: "A simple red circle on white background",
        n: 1,
        response_format: "url",
      });

      expect(response.data).toHaveLength(1);
      expect(response.data[0].url).toBeTruthy();
      expect(response.data[0].url).toMatch(/^https?:\/\//);

      console.log("Generated image URL:", response.data[0].url);
    });

    it("should generate multiple images", async () => {
      const response = await client.generateImage({
        model: "grok-2-image-1212",
        prompt: "A blue square",
        n: 2,
        response_format: "url",
      });

      expect(response.data).toHaveLength(2);
      expect(response.data[0].url).toBeTruthy();
      expect(response.data[1].url).toBeTruthy();

      console.log("Generated 2 images");
    });

    it("should generate image with aspect ratio", async () => {
      const response = await client.generateImage({
        model: "grok-2-image-1212",
        prompt: "A landscape panorama",
        n: 1,
        aspect_ratio: "16:9",
        response_format: "url",
      });

      expect(response.data[0].url).toBeTruthy();
      console.log("16:9 image URL:", response.data[0].url);
    });

    it("should return base64 when requested", async () => {
      const response = await client.generateImage({
        model: "grok-2-image-1212",
        prompt: "A green triangle",
        n: 1,
        response_format: "b64_json",
      });

      expect(response.data[0].b64_json).toBeTruthy();
      expect(response.data[0].b64_json!.length).toBeGreaterThan(100);

      console.log("Base64 image length:", response.data[0].b64_json!.length);
    });
  });

  describe("Vision API", () => {
    it("should analyze an image from URL", async () => {
      // Use a reliable public test image (Unsplash)
      const imageUrl = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400";

      const analysis = await client.analyzeImage(
        imageUrl,
        "What do you see in this image? Be brief.",
        "grok-2-vision-1212",
        "low"
      );

      expect(analysis).toBeTruthy();
      expect(analysis.length).toBeGreaterThan(10);

      console.log("Image analysis:", analysis);
    });

    it("should handle detailed analysis", async () => {
      // Another reliable image
      const imageUrl = "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400";

      const analysis = await client.analyzeImage(
        imageUrl,
        "Describe what you see in detail.",
        "grok-2-vision-1212",
        "high"
      );

      expect(analysis).toBeTruthy();
      console.log("Detailed analysis:", analysis.substring(0, 200) + "...");
    });
  });

  describe("Video Generation API", () => {
    // Video generation is slow and expensive, only test the initiation
    it("should initiate video generation and return request_id", async () => {
      const response = await client.generateVideo({
        model: "grok-imagine-video",
        prompt: "A simple animation of a bouncing ball",
        duration: 2,
        aspect_ratio: "1:1",
        resolution: "480p",
      });

      expect(response.request_id).toBeTruthy();
      console.log("Video generation started, request_id:", response.request_id);

      // Check status
      const status = await client.getVideoStatus(response.request_id);
      console.log("Video status:", status);
    });

    // Uncomment to test full video generation (takes 1-5 minutes)
    // it("should generate a complete video", async () => {
    //   const response = await client.generateVideo({
    //     model: "grok-imagine-video",
    //     prompt: "A ball bouncing",
    //     duration: 2,
    //     resolution: "480p",
    //   });
    //
    //   const final = await client.pollVideoCompletion(response.request_id, 120, 5000);
    //   expect(final.url).toBeTruthy();
    //   console.log("Video URL:", final.url);
    // }, 600000); // 10 minute timeout
  });

  describe("Error Handling", () => {
    it("should handle invalid model", async () => {
      await expect(
        client.chatCompletion({
          model: "invalid-model-name",
          messages: [{ role: "user", content: "Hello" }],
        })
      ).rejects.toThrow();
    });

    it("should handle empty prompt for image generation", async () => {
      await expect(
        client.generateImage({
          model: "grok-2-image-1212",
          prompt: "",
        })
      ).rejects.toThrow();
    });
  });
});

// Helper to log test results summary
afterAll(() => {
  if (XAI_API_KEY) {
    console.log("\n✅ Integration tests completed successfully");
  } else {
    console.log("\n⚠️ Integration tests skipped - set XAI_API_KEY to run");
  }
});
