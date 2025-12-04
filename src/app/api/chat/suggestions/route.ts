import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { CHAT_MODELS } from "@/lib/chat/constants";

export const runtime = "nodejs";
export const preferredRegion = ["bom1", "sin1", "fra1"];

const openAIProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  project: process.env.OPENAI_PROJECT,
});

const suggestionRequestSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  lastUserText: z.string().optional(),
  assistantText: z.string().min(1),
  modelId: z.string().optional(),
});

const SUGGESTION_COUNT = 2;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
    }

    const json = await req.json();
    const payload = suggestionRequestSchema.parse(json);

    const model = CHAT_MODELS.find((m) => m.id === payload.modelId) || CHAT_MODELS[0];

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

    const { text } = await generateText({
      model: openAIProvider(model.providerModelId),
      system: systemPrompt,
      prompt: userContext,
      temperature: 0.6,
      maxOutputTokens: 200,
      maxRetries: 1,
    });

    const suggestions = text
      .split(/\n|\r/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, SUGGESTION_COUNT)
      .map((value, index) => ({
        id: `${payload.messageId}-suggestion-${index}`,
        text: value,
      }));

    if (suggestions.length < SUGGESTION_COUNT) {
      return NextResponse.json({ suggestions: [] });
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[Suggestions] error", error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
