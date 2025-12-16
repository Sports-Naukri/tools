/**
 * Follow-up Suggestions API
 * 
 * Generates contextual follow-up questions that users might want to ask
 * after receiving an AI response. Shows 2 suggestions as clickable chips.
 * 
 * Uses AI to analyze the conversation context and suggest relevant next steps.
 * 
 * @route POST /api/chat/suggestions
 * @module app/api/chat/suggestions/route
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { CHAT_MODELS } from "@/lib/chat/constants";

// ============================================================================
// Runtime Configuration
// ============================================================================

export const runtime = "nodejs";
export const preferredRegion = ["bom1", "sin1", "fra1"];

// ============================================================================
// OpenAI Provider
// ============================================================================

const openAIProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  project: process.env.OPENAI_PROJECT,
});

// ============================================================================
// Request Schema
// ============================================================================

/** Request payload for suggestion generation */
const suggestionRequestSchema = z.object({
  /** Conversation ID for context */
  conversationId: z.string(),
  /** Message ID to associate suggestions with */
  messageId: z.string(),
  /** The user's last message (for context) */
  lastUserText: z.string().optional(),
  /** The assistant's response to generate follow-ups for */
  assistantText: z.string().min(1),
  /** Optional model ID (defaults to standard) */
  modelId: z.string().optional(),
});

/** Number of suggestions to generate */
const SUGGESTION_COUNT = 2;

// ============================================================================
// POST Handler
// ============================================================================

/**
 * Generates follow-up question suggestions based on conversation context.
 * 
 * @param req - Request with conversation context
 * @returns Array of {id, text} suggestion objects
 */
export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
    }

    const json = await req.json();
    const payload = suggestionRequestSchema.parse(json);

    const model = CHAT_MODELS.find((m) => m.id === payload.modelId) || CHAT_MODELS[0];

    // System prompt instructs AI to generate user-perspective follow-ups
    const systemPrompt = `You are an assistant that creates short, proactive follow-up prompts for a sports career coach chat.
The user just received an assistant response. Generate exactly ${SUGGESTION_COUNT} concise follow-up prompts that the user might send next.
Guidelines:
- Each suggestion should be phrased as if the user is asking the assistant (e.g., "How many employees does it have?").
- Keep them under 80 characters.
- No emojis, no numbering, no quotation marks.
- Suggestions must be distinct and relevant to the conversation context (user question and assistant answer).
- Be specific to the topic (sports careers, jobs, resumes, training, etc.).`;

    const userContext = `Last user message: ${payload.lastUserText ?? "(not available)"}
Assistant response: ${payload.assistantText}`;

    const { text, usage } = await generateText({
      model: openAIProvider(model.providerModelId),
      system: systemPrompt,
      prompt: userContext,
      temperature: 0.6,
      maxOutputTokens: 200,
      maxRetries: 0, // Fail fast on rate limit
    });

    // Log token usage for monitoring
    console.log(`💡 Suggestions | in: ${usage?.inputTokens ?? "?"} out: ${usage?.outputTokens ?? "?"} total: ${usage?.totalTokens ?? "?"}`);

    // Parse response: split by newlines, clean up, format as objects
    const suggestions = text
      .split(/\n|\r/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, SUGGESTION_COUNT)
      .map((value, index) => ({
        id: `${payload.messageId}-suggestion-${index}`,
        text: value,
      }));

    // Return empty array if we didn't get enough suggestions
    if (suggestions.length < SUGGESTION_COUNT) {
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[Suggestions] error", error);
    // Return empty suggestions on error (non-critical feature)
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}

