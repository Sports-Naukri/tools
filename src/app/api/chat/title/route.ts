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

const titleRequestSchema = z.object({
  message: z.string().min(1),
  modelId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { message, modelId } = titleRequestSchema.parse(json);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
    }

    // Use a fast model for title generation, defaulting to standard if not specified
    const model = CHAT_MODELS.find((m) => m.id === modelId) || CHAT_MODELS[0];
    
    const { text } = await generateText({
      model: openAIProvider(model.providerModelId),
      system: `You are a helpful assistant that generates short, concise titles for chat conversations based on the first user message.
The title should be a summary of the user's intent, no more than 5-6 words.
Do not use quotes or punctuation.
Examples:
User: "Help me write a resume for a football coach job" -> Football Coach Resume Help
User: "What are the best sports academies in Mumbai?" -> Top Sports Academies Mumbai
User: "I need a cover letter for a sports analyst role" -> Sports Analyst Cover Letter`,
      prompt: message,
      temperature: 0.5,
    });

    const title = text.trim();
    
    return NextResponse.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
  }
}
