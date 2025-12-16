/**
 * Resume Extraction API
 * 
 * POST /api/resume/extract
 * 
 * Receives raw text from a parsed resume and uses AI to extract
 * structured profile data (name, skills, experience, etc.)
 * 
 * Rate limiting is handled client-side (3 uploads/day via IndexedDB tracking)
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

// ============================================================================
// Configuration
// ============================================================================

export const runtime = "nodejs";
export const maxDuration = 30;

const openAIProvider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Request/Response Schemas
// ============================================================================

const extractionRequestSchema = z.object({
    rawText: z.string().min(10).max(50000),
});

const profileSchema = z.object({
    name: z.string().nullish().describe("Full name of the candidate"),
    email: z.string().nullish().describe("Email address"),
    phone: z.string().nullish().describe("Phone number"),
    location: z.string().nullish().describe("City or location"),
    summary: z.string().nullish().describe("Professional summary or objective"),
    skills: z.array(z.string()).describe("List of technical and soft skills"),
    experience: z.array(z.object({
        title: z.string().describe("Job title"),
        company: z.string().describe("Company name"),
        duration: z.string().nullish().describe("Employment period"),
        description: z.string().nullish().describe("Key responsibilities or achievements"),
    })).describe("Work experience entries"),
    education: z.array(z.object({
        degree: z.string().describe("Degree name"),
        school: z.string().describe("Institution name"),
        year: z.string().nullish().describe("Graduation year"),
    })).describe("Education entries"),
    certifications: z.array(z.string()).describe("Certifications and courses"),
});

// ============================================================================
// Extraction Prompt
// ============================================================================

const EXTRACTION_PROMPT = `You are a resume parsing expert. Extract structured information from the resume text provided.

INSTRUCTIONS:
- Extract all relevant information accurately
- For skills, include both technical skills (e.g., Python, React) and soft skills (e.g., leadership, communication)
- For experience, list entries in reverse chronological order (most recent first)
- If information is not clearly present, omit that field rather than guessing
- Keep descriptions concise but informative

CONTEXT:
This data will be used to match the candidate with sports industry jobs, so prioritize skills and experience relevant to sports, athletics, coaching, marketing, analytics, events, or fitness.`;

// ============================================================================
// API Handler
// ============================================================================

export async function POST(req: Request) {
    try {
        // Validate API key
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { success: false, error: "OpenAI API key not configured" },
                { status: 500 }
            );
        }

        // Parse and validate request
        const json = await req.json();
        const { rawText } = extractionRequestSchema.parse(json);

        console.log(`📄 [Resume Extract] Processing ${rawText.length} chars`);

        // Use AI to extract structured data
        const result = await generateObject({
            model: openAIProvider("gpt-4o-mini"),
            schema: profileSchema,
            system: EXTRACTION_PROMPT,
            prompt: `Extract profile information from this resume:\n\n${rawText}`,
        });

        console.log(`📄 [Resume Extract] Extracted ${result.object.skills?.length ?? 0} skills, ${result.object.experience?.length ?? 0} experiences`);

        // Build complete profile
        const profile = {
            id: crypto.randomUUID(),
            extractedAt: new Date().toISOString(),
            ...result.object,
            rawText, // Keep raw text for AI context fallback
        };

        return NextResponse.json({
            success: true,
            profile,
        });

    } catch (error) {
        console.error("Resume extraction error:", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Invalid request format" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: "Failed to extract resume data" },
            { status: 500 }
        );
    }
}
