/**
 * live_search MCP Tool
 * Real-time web and X search using xAI's Responses API with server-side tools
 * Based on: https://docs.x.ai/docs/guides/live-search
 */

import { z } from "zod";
import { getXAIClient, WebSearchFilters, XSearchFilters } from "../xai-client.js";

// Web search filters schema
const webFiltersSchema = z.object({
  allowed_domains: z
    .array(z.string())
    .max(5)
    .optional()
    .describe("Only search within these domains (max 5)"),
  excluded_domains: z
    .array(z.string())
    .max(5)
    .optional()
    .describe("Exclude these domains from search (max 5)"),
  country: z
    .string()
    .optional()
    .describe("User location country (ISO 3166-1 alpha-2, e.g., 'US')"),
  city: z
    .string()
    .optional()
    .describe("User location city"),
  region: z
    .string()
    .optional()
    .describe("User location state/province/region"),
  timezone: z
    .string()
    .optional()
    .describe("User timezone (IANA format, e.g., 'America/New_York')"),
}).optional();

// X search filters schema
const xFiltersSchema = z.object({
  allowed_handles: z
    .array(z.string())
    .max(10)
    .optional()
    .describe("Only search posts from these X handles (max 10)"),
  excluded_handles: z
    .array(z.string())
    .max(10)
    .optional()
    .describe("Exclude posts from these X handles (max 10)"),
  from_date: z
    .string()
    .optional()
    .describe("Start date filter (YYYY-MM-DD)"),
  to_date: z
    .string()
    .optional()
    .describe("End date filter (YYYY-MM-DD)"),
  include_images: z
    .boolean()
    .optional()
    .describe("Enable image understanding in posts"),
  include_videos: z
    .boolean()
    .optional()
    .describe("Enable video understanding in posts"),
}).optional();

export const liveSearchSchema = z.object({
  query: z
    .string()
    .describe("Search query"),
  model: z
    .string()
    .optional()
    .describe("Optional search model. Defaults to XAI_SEARCH_MODEL or XAI_MODEL if configured"),
  sources: z
    .array(z.enum(["web", "x"]))
    .optional()
    .default(["web"])
    .describe("Sources to search: 'web' for web pages, 'x' for X/Twitter posts"),
  web_filters: webFiltersSchema
    .describe("Filters for web search"),
  x_filters: xFiltersSchema
    .describe("Filters for X search"),
  max_results: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(10)
    .describe("Maximum number of results to return"),
});

export type LiveSearchInput = z.infer<typeof liveSearchSchema>;

export const liveSearchTool = {
  name: "live_search",
  description:
    "Perform real-time search using xAI's Grok with server-side tools. " +
    "Search the web for current information or search X/Twitter for posts, users, and threads. " +
    "Returns results with source citations.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query",
      },
      model: {
        type: "string",
        description: "Optional search model. Defaults to XAI_SEARCH_MODEL or XAI_MODEL if configured",
      },
      sources: {
        type: "array",
        items: {
          type: "string",
          enum: ["web", "x"],
        },
        description: "Sources to search: 'web' for web pages, 'x' for X/Twitter",
        default: ["web"],
      },
      web_filters: {
        type: "object",
        description: "Filters for web search",
        properties: {
          allowed_domains: {
            type: "array",
            items: { type: "string" },
            description: "Only search within these domains (max 5)",
          },
          excluded_domains: {
            type: "array",
            items: { type: "string" },
            description: "Exclude these domains from search (max 5)",
          },
          country: {
            type: "string",
            description: "User location country (ISO 3166-1 alpha-2)",
          },
          city: {
            type: "string",
            description: "User location city",
          },
          region: {
            type: "string",
            description: "User location state/province/region",
          },
          timezone: {
            type: "string",
            description: "User timezone (IANA format)",
          },
        },
      },
      x_filters: {
        type: "object",
        description: "Filters for X/Twitter search",
        properties: {
          allowed_handles: {
            type: "array",
            items: { type: "string" },
            description: "Only search posts from these X handles (max 10)",
          },
          excluded_handles: {
            type: "array",
            items: { type: "string" },
            description: "Exclude posts from these X handles (max 10)",
          },
          from_date: {
            type: "string",
            description: "Start date filter (YYYY-MM-DD)",
          },
          to_date: {
            type: "string",
            description: "End date filter (YYYY-MM-DD)",
          },
          include_images: {
            type: "boolean",
            description: "Enable image understanding in posts",
          },
          include_videos: {
            type: "boolean",
            description: "Enable video understanding in posts",
          },
        },
      },
      max_results: {
        type: "number",
        description: "Maximum number of results (1-20)",
        default: 10,
      },
    },
    required: ["query"],
  },
};

export async function handleLiveSearch(
  input: LiveSearchInput
): Promise<string> {
  const client = getXAIClient();
  const validated = liveSearchSchema.parse(input);

  // Build web search filters
  let webFilters: WebSearchFilters | undefined;
  if (validated.web_filters) {
    const wf = validated.web_filters;
    // Validate that allowed_domains and excluded_domains are not both set
    if (wf.allowed_domains?.length && wf.excluded_domains?.length) {
      throw new Error("Cannot use both allowed_domains and excluded_domains together");
    }
    webFilters = {
      allowed_domains: wf.allowed_domains,
      excluded_domains: wf.excluded_domains,
      user_location_country: wf.country,
      user_location_city: wf.city,
      user_location_region: wf.region,
      user_location_timezone: wf.timezone,
    };
  }

  // Build X search filters
  let xFilters: XSearchFilters | undefined;
  if (validated.x_filters) {
    const xf = validated.x_filters;
    // Validate that allowed_handles and excluded_handles are not both set
    if (xf.allowed_handles?.length && xf.excluded_handles?.length) {
      throw new Error("Cannot use both allowed_handles and excluded_handles together");
    }
    xFilters = {
      allowed_x_handles: xf.allowed_handles,
      excluded_x_handles: xf.excluded_handles,
      from_date: xf.from_date,
      to_date: xf.to_date,
      enable_image_understanding: xf.include_images,
      enable_video_understanding: xf.include_videos,
    };
  }

  // Augment query with max_results hint
  const augmentedQuery = validated.max_results
    ? `${validated.query} (provide up to ${validated.max_results} relevant results)`
    : validated.query;

  const response = await client.liveSearch({
    query: augmentedQuery,
    model: validated.model,
    sources: validated.sources,
    web_filters: webFilters,
    x_filters: xFilters,
  });

  return JSON.stringify(
    {
      success: true,
      query: validated.query,
      model: validated.model || process.env.XAI_SEARCH_MODEL || process.env.XAI_MODEL || "grok-4-0709",
      sources: validated.sources,
      content: response.content,
      citations: response.citations || [],
      tool_usage: response.tool_usage,
    },
    null,
    2
  );
}
