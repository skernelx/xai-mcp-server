/**
 * chat MCP Tool
 * Chat with xAI's Grok models
 * Based on: https://docs.x.ai/docs/guides/chat-completions
 */

import { z } from "zod";
import { getXAIClient, ChatMessage } from "../xai-client.js";

export const chatSchema = z.object({
  message: z
    .string()
    .describe("The user message to send to Grok"),
  model: z
    .string()
    .optional()
    .describe("Chat model. Defaults to XAI_CHAT_MODEL or XAI_MODEL if configured"),
  system_prompt: z
    .string()
    .optional()
    .describe("Optional system/developer prompt to set context (must be first message)"),
  temperature: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .default(0.7)
    .describe("Sampling temperature (0-2). Lower = more focused, higher = more creative"),
  max_tokens: z
    .number()
    .optional()
    .describe("Maximum tokens in response"),
  top_p: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Nucleus sampling parameter (0-1)"),
  frequency_penalty: z
    .number()
    .min(-2)
    .max(2)
    .optional()
    .describe("Penalty for token frequency (-2 to 2)"),
  presence_penalty: z
    .number()
    .min(-2)
    .max(2)
    .optional()
    .describe("Penalty for token presence (-2 to 2)"),
});

export type ChatInput = z.infer<typeof chatSchema>;

export const chatTool = {
  name: "chat",
  description:
    "Chat with xAI's Grok models. Send messages and receive AI-generated responses. " +
    "Supports summarizing, creative writing, Q&A, coding assistance, and more.",
  inputSchema: {
    type: "object" as const,
    properties: {
      message: {
        type: "string",
        description: "The user message to send to Grok",
      },
      model: {
        type: "string",
        description: "Chat model. Defaults to XAI_CHAT_MODEL or XAI_MODEL if configured",
      },
      system_prompt: {
        type: "string",
        description: "Optional system prompt to set context",
      },
      temperature: {
        type: "number",
        description: "Sampling temperature (0-2)",
        default: 0.7,
      },
      max_tokens: {
        type: "number",
        description: "Maximum tokens in response",
      },
      top_p: {
        type: "number",
        description: "Nucleus sampling parameter (0-1)",
      },
      frequency_penalty: {
        type: "number",
        description: "Penalty for token frequency (-2 to 2)",
      },
      presence_penalty: {
        type: "number",
        description: "Penalty for token presence (-2 to 2)",
      },
    },
    required: ["message"],
  },
};

export async function handleChat(input: ChatInput): Promise<string> {
  const client = getXAIClient();
  const validated = chatSchema.parse(input);
  const model =
    validated.model ||
    process.env.XAI_CHAT_MODEL ||
    process.env.XAI_MODEL ||
    "grok-3";

  const messages: ChatMessage[] = [];

  // System/developer message must be first and singular
  if (validated.system_prompt) {
    messages.push({ role: "system", content: validated.system_prompt });
  }

  messages.push({ role: "user", content: validated.message });

  const response = await client.chatCompletion({
    model,
    messages,
    temperature: validated.temperature,
    max_tokens: validated.max_tokens,
    top_p: validated.top_p,
    frequency_penalty: validated.frequency_penalty,
    presence_penalty: validated.presence_penalty,
  });

  const reply = response.choices[0]?.message?.content || "No response";

  return JSON.stringify(
    {
      success: true,
      model: response.model,
      response: reply,
      usage: response.usage,
      finish_reason: response.choices[0]?.finish_reason,
    },
    null,
    2
  );
}
