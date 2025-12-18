/**
 * Main Chat API Route
 *
 * The core streaming endpoint for the SportsNaukri chat system.
 * Handles AI conversations with support for:
 * - Tool calling (job search, document generation, skill mapping)
 * - Resume context injection for personalized responses
 * - Rate limiting (daily conversations, per-chat messages)
 * - Multi-step tool execution with streaming responses
 *
 * Modes:
 * - "jay": Career coach mode - friendly, conversational
 * - "navigator": Career exploration - analytical, data-driven
 *
 * @module app/api/chat/route
 * @see {@link ../../../lib/rateLimiter.ts} for rate limiting
 * @see {@link ../../../lib/jobs/service.ts} for job search
 * @see {@link ../../../lib/canvas/documents.ts} for document generation
 */

// ============================================================================
// External Dependencies
// ============================================================================

import { createOpenAI } from "@ai-sdk/openai";
import {
  type UIMessage,
  convertToCoreMessages as convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

// ============================================================================
// Internal Imports - Chat Infrastructure
// ============================================================================

import {
  type AttachmentPayload,
  AttachmentValidationError,
  ensureValidAttachments,
} from "@/lib/chat/attachments";
import { CHAT_MODELS, FOLLOWUP_TOOL_NAME } from "@/lib/chat/constants";
import { type ChatRequestPayload, chatRequestSchema } from "@/lib/chat/schemas";
import {
  ChatErrorCode,
  type ChatErrorResponse,
  getErrorMessage,
} from "@/lib/errors/codes";
// Note: Rate limiting is now handled client-side via IndexedDB
// See: lib/chat/clientRateLimiter.ts

// ============================================================================
// Internal Imports - Tools & Features
// ============================================================================

import {
  DOCUMENT_TOOL_NAME,
  type DocumentInput,
  type GeneratedDocument,
  documentInputSchema,
  generatedDocumentSchema,
  isGeneratedDocument,
} from "@/lib/canvas/documents";
import { fetchJobs } from "@/lib/jobs/service";
import {
  JOB_SEARCH_TOOL_NAME,
  type JobSearchInput,
  jobSearchSchema,
} from "@/lib/jobs/tools";
import type { JobResponse } from "@/lib/jobs/types";
import { RESUME_TOOL_NAME } from "@/lib/resume/tool";
import {
  SKILL_MAPPER_TOOL_NAME,
  type SkillMapperInput,
  type SkillMapperOutput,
  mapSkillsToRoles,
  skillMapperInputSchema,
  skillMapperOutputSchema,
} from "@/lib/skills/mapper";

// ============================================================================
// Runtime Configuration
// ============================================================================

/**
 * Force Node.js runtime (not Edge) for full API compatibility.
 * Required for streaming responses and some Node.js APIs.
 */
export const runtime = "nodejs";

/**
 * Preferred deployment regions for low latency.
 * bom1 = Mumbai, sin1 = Singapore, fra1 = Frankfurt
 */
export const preferredRegion = ["bom1", "sin1", "fra1"];

// ============================================================================
// OpenAI Provider Setup
// ============================================================================

/**
 * OpenAI provider instance configured from environment variables.
 * Supports organization and project-level API key scoping.
 */
const openAIProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  project: process.env.OPENAI_PROJECT,
});

// ============================================================================
// Tool Schemas
// ============================================================================

/** Schema for the follow-up suggestions tool output */
const followupToolInputSchema = z.object({
  suggestions: z.array(z.string().min(4).max(120)).min(1).max(3),
});

// ============================================================================
// Helper Functions
// ============================================================================

/** Finds an enabled model by ID from the models configuration */
const getEnabledModel = (modelId: string) =>
  CHAT_MODELS.find((model) => model.id === modelId && model.isEnabled);

// NOTE: The previous "zero-LLM job search bypass" was removed.
// It produced assistant messages with empty `parts` in some client environments,
// which triggered false "AI couldn't generate a response" + Retry loops.
// Job search is now handled purely via the `searchJobs` tool within the normal AI stream.

export async function POST(req: Request) {
  try {
    console.log(
      "\n------------------------------------------------------------",
    );
    const json = await req.json();
    const payload = chatRequestSchema.parse(json);

    const selectedModel = getEnabledModel(payload.modelId);
    if (!selectedModel) {
      return NextResponse.json(
        { error: "Model is not available" },
        { status: 400 },
      );
    }

    // Rate limiting is handled client-side via IndexedDB

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 },
      );
    }

    const sanitizedAttachments = ensureValidAttachments(payload.attachments);
    const sanitizedMessages = sanitizeUiMessages(payload.messages);
    const uiMessages = attachUploadsToMessages(
      sanitizedMessages,
      sanitizedAttachments,
    );

    // Truncate history to prevent excessive token usage.
    // We keep the last 20 messages (approx 10 turns) which aligns with the chat limit.
    // This ensures that even if a conversation is long, we don't exceed token limits.
    const recentUiMessages = uiMessages.slice(-20);

    const resumeMeta = extractLatestResumeMeta(recentUiMessages as UIMessage[]);
    const modelMessages = convertToModelMessages(
      recentUiMessages as UIMessage[],
    )
      .filter(isSupportedModelMessage)
      .map(minifyModelMessage);

    console.log(
      `🤖 Chat API | model: ${payload.modelId} | mode: ${payload.mode} | key: ✓ | conv: ${payload.conversationId}`,
    );

    // Build resume context section if provided (Phase 5: works for BOTH modes)
    let resumeContextSection = "";
    if (payload.resumeContext) {
      const { name, skills, summary, experience } = payload.resumeContext;
      const expSummary =
        experience
          ?.slice(0, 3)
          .map((e) => `${e.title} at ${e.company}`)
          .join(", ") || "";

      // Different instructions based on mode
      const modeInstruction =
        payload.mode === "navigator"
          ? "Use this profile to provide personalized career recommendations. Prioritize roles and training that match their existing skills."
          : "Use this profile when creating resumes, cover letters, or career documents. Pre-fill the user's name, skills, experience, and other relevant details from this profile.";

      resumeContextSection = `
USER PROFILE (from uploaded resume):
- Name: ${name || "Not provided"}
- Skills: ${skills.slice(0, 15).join(", ")}
- Summary: ${summary || "Not provided"}
${expSummary ? `- Recent Experience: ${expSummary}` : ""}

${modeInstruction}
`;
      console.log(
        `📋 [Resume Context] Injected: ${skills.length} skills, ${experience?.length ?? 0} experiences for ${payload.mode} mode`,
      );
    }

    // Select system prompt based on mode, inject resume context if available
    const basePrompt =
      payload.mode === "navigator" ? navigatorPrompt : jayPrompt;
    const activePrompt = resumeContextSection
      ? `${basePrompt}\n\n${resumeContextSection}`
      : basePrompt;

    const result = await streamText({
      model: openAIProvider(selectedModel.providerModelId),
      messages: modelMessages,
      system: activePrompt,
      abortSignal: req.signal,
      maxRetries: 2, // Retry on transient errors like rate limits
      stopWhen: [stepCountIs(5)], // v5 multi-step loop control
      tools: {
        [RESUME_TOOL_NAME]: tool<
          { purpose?: string },
          {
            hasResume: boolean;
            contextEnabled: boolean;
            resumeContext: ChatRequestPayload["resumeContext"] | null;
            message: string;
          }
        >({
          description:
            "Get the user's resume/profile context (if available). If missing, instruct the user to upload their resume via the UI.",
          inputSchema: z.object({
            purpose: z
              .string()
              .optional()
              .describe(
                "Why you need the resume (helps explain what the user should upload it for).",
              ),
          }),
          async execute(input) {
            const purposeSuffix = input?.purpose
              ? ` (needed for: ${input.purpose})`
              : "";

            // Resume context comes from the browser and is attached to the request.
            // The server cannot read IndexedDB directly.
            if (!payload.resumeContext) {
              return {
                hasResume: false,
                contextEnabled: false,
                resumeContext: null,
                message: `No resume is available${purposeSuffix}. Ask the user to upload their resume (PDF/DOCX) using the Upload Resume button.`,
              };
            }

            return {
              hasResume: true,
              contextEnabled: true,
              resumeContext: payload.resumeContext,
              message: "Resume context is available.",
            };
          },
        }),
        [DOCUMENT_TOOL_NAME]: tool<DocumentInput, GeneratedDocument>({
          description:
            "Create a structured document (resume, cover letter, short report, or essay) that will be shown inside the canvas artifact.",
          inputSchema: documentInputSchema,
          async execute(rawDocument) {
            const document = generatedDocumentSchema.parse({
              ...rawDocument,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            });
            return document;
          },
        }),
        [JOB_SEARCH_TOOL_NAME]: tool<JobSearchInput, JobResponse>({
          description:
            "Search for sports-related jobs, internships, and career opportunities on SportsNaukri.com.",
          inputSchema: jobSearchSchema,
          async execute(input) {
            console.log(
              `🔍 [Job Search] Query: "${input.search}" | Location: ${input.location || "any"}`,
            );
            const requestId = crypto.randomUUID();
            const resumeSkills = resumeMeta?.topSkills ?? [];
            const resumeGeneralKeywords = resumeMeta?.generalKeywords ?? [];
            const fallbackGeneralKeywords =
              resumeGeneralKeywords.length > 0
                ? resumeGeneralKeywords
                : deriveKeywordsFromSearch(input.search);
            const requestedLimit =
              typeof input.limit === "number" ? input.limit : 10;
            const normalizedLimit = Math.min(Math.max(requestedLimit, 5), 20);
            const filter = {
              ...input,
              limit: normalizedLimit,
              skillKeywords: resumeSkills,
              generalKeywords: fallbackGeneralKeywords,
              resumeSummary: resumeMeta?.summary,
              telemetry: {
                conversationId: payload.conversationId,
                requestId,
                requestedAt: new Date().toISOString(),
              },
            };
            const results = await fetchJobs(filter);
            results.meta ??= {};
            results.meta.telemetryId = results.meta.telemetryId ?? requestId;
            results.meta.generalKeywords = results.meta.generalKeywords?.length
              ? results.meta.generalKeywords
              : fallbackGeneralKeywords;
            results.meta.searchKeywords = results.meta.searchKeywords?.length
              ? results.meta.searchKeywords
              : deriveKeywordsFromSearch(input.search);
            console.log(
              `🔍 [Job Search] Found ${results.jobs?.length ?? 0} jobs`,
            );

            // Return minimal data to save tokens - strip heavy fields like description
            // The UI only needs: id, title, employer, location, salary, jobType, link
            const minimalJobs = (results.jobs ?? []).map((job) => ({
              ...job,
              description: "", // Strip description to save tokens
              qualification: "", // Strip qualification
              experience: "", // Strip experience text
              fullDescriptionUrl: job.link, // Keep link for "View More"
            }));

            return {
              success: results.success,
              count: results.count,
              total: results.total,
              totalPages: results.totalPages,
              currentPage: results.currentPage,
              jobs: minimalJobs,
              message: results.message,
              tips: results.tips,
              meta: results.meta,
            };
          },
        }),
        [FOLLOWUP_TOOL_NAME]: tool<
          { suggestions: string[] },
          { suggestions: string[] }
        >({
          description:
            "Call this after you finish answering (unless you just generated a document). Provide up to two short, user-facing follow-up prompts.",
          inputSchema: followupToolInputSchema,
          async execute(input) {
            const cleaned = input.suggestions
              .map((value) => value.trim())
              .filter((value) => value.length > 0)
              .slice(0, 2)
              .map((value) =>
                value.length > 120 ? `${value.slice(0, 117)}...` : value,
              );
            return { suggestions: cleaned };
          },
        }),
        [SKILL_MAPPER_TOOL_NAME]: tool<SkillMapperInput, SkillMapperOutput>({
          description:
            "Map user skills to sports industry roles, recommended training, and job search keywords. Use this when users share their skills or ask about career paths.",
          inputSchema: skillMapperInputSchema,
          outputSchema: skillMapperOutputSchema,
          async execute(input) {
            console.log(`🎯 [Skill Mapper] Skills: ${input.skills.join(", ")}`);
            const result = mapSkillsToRoles(input);
            console.log(
              `🎯 [Skill Mapper] Found ${result.mappings.length} role matches`,
            );
            return result;
          },
        }),
        switchAgent: tool<
          { mode: "jay" | "navigator"; reason: string },
          { success: boolean; message: string }
        >({
          description:
            "Switch the active agent mode. Use 'jay' for coaching/friendly chat, or 'navigator' for deep analysis/skill mapping. ONLY call this if user explicitly asks or strict need matches.",
          inputSchema: z.object({
            mode: z.enum(["jay", "navigator"]),
            reason: z.string().describe("Why you are switching"),
          }),
          async execute({ mode, reason }) {
            console.log(
              `🔄 [Agent Switch] Switching to ${mode} because: ${reason}`,
            );
            return { success: true, message: `Switching to ${mode} agent...` };
          },
        }),
      },
      // Log each step's completion for debugging multi-step tool flows
      onStepFinish: ({ text, toolResults, finishReason }) => {
        const toolNames = toolResults?.map((r) => r.toolName).join(", ") || "";
        console.log(
          `📍 Step | ${finishReason} | text: ${text?.length ?? 0} chars | tools: ${toolNames || "none"}`,
        );
      },
      onFinish: async ({ usage, finishReason }) => {
        console.log(
          `💰 Tokens | ${payload.conversationId.slice(0, 8)} | in: ${usage?.inputTokens ?? "?"} out: ${usage?.outputTokens ?? "?"} total: ${usage?.totalTokens ?? "?"} | reason: ${finishReason}`,
        );

        // Rate limiting is handled client-side via IndexedDB
      },
      onError: (error) => {
        console.error(
          `🔴 Stream error for ${payload.conversationId.slice(0, 8)}:`,
          error,
        );
        // Don't confirm usage on error - the onFinish will also not confirm
      },
      experimental_telemetry: {
        isEnabled: false, // Disable telemetry to reduce noise
      },
    });

    // Handle streaming response with error wrapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (result as any).toUIMessageStreamResponse();
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(
        `🔴 [${ChatErrorCode.INVALID_PAYLOAD}] Invalid chat payload`,
        error.issues,
      );
      return NextResponse.json<ChatErrorResponse>(
        {
          error: getErrorMessage(ChatErrorCode.INVALID_PAYLOAD),
          code: ChatErrorCode.INVALID_PAYLOAD,
          details: "Zod validation failed",
        },
        { status: 400 },
      );
    }

    if (error instanceof AttachmentValidationError) {
      console.error(
        `🔴 [${ChatErrorCode.ATTACHMENT_ERROR}] Attachment error:`,
        error.message,
      );
      return NextResponse.json<ChatErrorResponse>(
        {
          error: getErrorMessage(ChatErrorCode.ATTACHMENT_ERROR),
          code: ChatErrorCode.ATTACHMENT_ERROR,
          details: error.message,
        },
        { status: 400 },
      );
    }

    // Rate limit errors are now handled client-side

    // Handle OpenAI rate limit errors (429)
    if (error && typeof error === "object" && "statusCode" in error) {
      const apiError = error as {
        statusCode?: number;
        message?: string;
        responseBody?: string;
      };
      if (apiError.statusCode === 429) {
        console.warn(
          `⚠️ [${ChatErrorCode.RATE_LIMIT_EXCEEDED}] OpenAI rate limit:`,
          apiError.message?.slice(0, 100),
        );
        return NextResponse.json<ChatErrorResponse>(
          {
            error: getErrorMessage(ChatErrorCode.RATE_LIMIT_EXCEEDED),
            code: ChatErrorCode.RATE_LIMIT_EXCEEDED,
            details: "OpenAI 429",
          },
          { status: 429 },
        );
      }
    }

    // Handle empty response errors from AI SDK
    if (
      error instanceof Error &&
      error.message.includes("must contain either output text or tool calls")
    ) {
      console.warn(
        `⚠️ [${ChatErrorCode.EMPTY_RESPONSE}] Empty AI response (likely rate limited)`,
      );
      return NextResponse.json<ChatErrorResponse>(
        {
          error: getErrorMessage(ChatErrorCode.EMPTY_RESPONSE),
          code: ChatErrorCode.EMPTY_RESPONSE,
          details: "Model returned empty content",
        },
        { status: 503 },
      );
    }

    if (error instanceof Error) {
      console.error(
        `🔴 [${ChatErrorCode.INTERNAL_ERROR}] Chat error:`,
        error.message,
      );
      return NextResponse.json<ChatErrorResponse>(
        {
          error: getErrorMessage(ChatErrorCode.INTERNAL_ERROR),
          code: ChatErrorCode.INTERNAL_ERROR,
          details: error.message,
        },
        { status: 500 },
      );
    }

    console.error(`🔴 [${ChatErrorCode.INTERNAL_ERROR}] Unknown error`);
    return NextResponse.json<ChatErrorResponse>(
      {
        error: getErrorMessage(ChatErrorCode.INTERNAL_ERROR),
        code: ChatErrorCode.INTERNAL_ERROR,
      },
      { status: 500 },
    );
  }
}

const jayPrompt = `You are Jay, SportsNaukri's friendly career assistant.

PERSONALITY:
- Respond concisely and clearly in a polite, empathetic Indian tone
- Prioritize accuracy and helpfulness for sports job seekers
- Never fabricate data - only use real information from tools

LANGUAGE:
- If the user writes in Hindi, respond in Hindi
- Otherwise, respond in English
- You can mix Hindi-English naturally if the user does

SCOPE:
- You ONLY help with SportsNaukri-related topics: job searches, resumes, cover letters, sports careers, coaching, and career guidance
- For unrelated questions (poems, coding, general knowledge, etc.), politely say: "I'm Jay, and I can only help with sports career topics. Is there anything about jobs or your career I can assist with?"

CAPABILITIES:
- Use ${JOB_SEARCH_TOOL_NAME} when users ask about jobs, vacancies, or opportunities. Show at least 3 jobs when possible; if fewer exist, suggest broader keywords.
- When users ask for "requirements" (qualification/experience) for roles on SportsNaukri, FIRST use ${JOB_SEARCH_TOOL_NAME} to fetch real listings, then summarize common requirements from the returned jobs (qualification, experience, jobType, location).
- Use ${DOCUMENT_TOOL_NAME} for resumes, cover letters, or career documents. Always include a descriptive 'summary' field that explains what you created (e.g., "Created a resume highlighting your 5 years of sports marketing experience").
- If you need the user's resume/profile to answer (resume writing, ATS tailoring, personalized suggestions, skill gap diagnosis), call the getResume tool first.
  - If getResume returns hasResume=false, ask the user to upload their resume (PDF/DOCX) using the UI's Upload Resume button.
  - If getResume returns hasResume=true but contextEnabled=false, tell the user to turn "Resume On" in the chat bar.
- Call ${FOLLOWUP_TOOL_NAME} at the END of every response (unless you used ${DOCUMENT_TOOL_NAME}). Provide exactly 2 relevant follow-up questions.

AGENT SWITCHING:
- You are Jay (Coach). Ideally, stick to your role.
- However, if the user explicitly asks for "Career Navigator" mode, or for deep data analysis of skill gaps, use the \`switchAgent\` tool.
- Do NOT suggest switching unless the user asks or clearly needs deep technical analysis.

CRITICAL - JOB SEARCH OUTPUT:
- When you use ${JOB_SEARCH_TOOL_NAME}, the user sees a visual list of job cards.
- THEREFORE, YOU MUST NOT LIST THE JOBS IN YOUR TEXT RESPONSE.
- Do NOT write bullet points of job titles. Do NOT summarize the jobs.
- Your ONLY text response should be: "I found [X] jobs matching your search:"
- If no jobs are found, you can suggest alternative keywords.

INDIAN CONTEXT:
- All job listings are from India by default
- "Jobs in India" or "Indian jobs" means show all available jobs (no location filter needed)

Only output plain chat responses outside of tools.`;

// ============================================================================
// NAVIGATOR SYSTEM PROMPT - Career path exploration mode
// ============================================================================
// Used when mode === "navigator" (tab switch in ChatComposer)
// More analytical and structured than Jay, focuses on skill-to-role mapping
// Uses skill_mapper tool to provide data-driven career recommendations
// ============================================================================

const navigatorPrompt = `You are the SportsNaukri Career Navigator, an analytical career guidance system.

PURPOSE:
Help users discover their ideal career path in the sports industry by mapping their skills, identifying gaps, and recommending specific roles and learning paths.

TONE:
- Analytical, structured, and professional
- Data-driven recommendations
- Focus on actionable insights

LANGUAGE:
- If the user writes in Hindi, respond in Hindi
- Otherwise, respond in English

AGENT SWITCHING:
- You are Navigator (Analyst). Ideally, stick to your role.
- However, if the user explicitly asks for "Jay" or "Coach" mode, or for casual chat / basic resume help without analysis, use the \`switchAgent\` tool.
- Do NOT suggest switching unless the user asks.

SCOPE:
- Career path exploration in sports industry
- Skill-to-role mapping
- Gap analysis and upskilling recommendations
- For unrelated questions, say: "I'm the Career Navigator, focused on helping you explore sports career paths. Would you like to discover roles that match your skills?"

CRITICAL INSTRUCTION:
You MUST ALWAYS produce a text response. Never end your response with just a tool call.
After using any tool, you MUST write a detailed text response interpreting and presenting the results to the user.

CAPABILITIES:
- Use ${SKILL_MAPPER_TOOL_NAME} when users share their skills to get role mappings, training, and keywords
- After getting skill_mapper results, ALWAYS write a formatted response with the career mapping information
- If you need the user's resume/profile to answer (skill inventory, gap analysis, role fit, keyword extraction), call the getResume tool first.
  - If getResume returns hasResume=false, ask the user to upload their resume (PDF/DOCX) using the UI's Upload Resume button.
  - If getResume returns hasResume=true but contextEnabled=false, tell the user to turn "Resume On" in the chat bar.
- Use ${JOB_SEARCH_TOOL_NAME} to show real job examples matching user's skill profile. DO NOT list the jobs in text; just say "Here are relevant jobs:" and let the UI show the cards.
- When the user asks for "requirements" for a target role, use ${JOB_SEARCH_TOOL_NAME} to fetch examples and synthesize common requirements from those listings.
- Use ${DOCUMENT_TOOL_NAME} for career plans or skill summaries
- Call ${FOLLOWUP_TOOL_NAME} at the END of every response with relevant next steps

OUTPUT FORMAT (use this AFTER getting skill_mapper results):
## 🎯 Your Career Mapping

**Skills Identified**: [list from tool results]

**Best-Fit Roles**:
- [Role 1]: [brief description]
- [Role 2]: [brief description]

**Tools You Should Know**: [from tool results]

**Recommended Training**: [from tool results]

**Job Search Keywords**: [from tool results]

---
[Ask if they want to explore a specific role, see matching jobs, or refine their profile]`;

type UIPart = NonNullable<UIMessage["parts"]>[number];

function attachUploadsToMessages(
  messages: ChatRequestPayload["messages"],
  attachments: AttachmentPayload[],
): UIMessage[] {
  if (!messages.length) {
    throw new AttachmentValidationError(
      "At least one message is required",
      "missing_user_message",
    );
  }

  const cloned = messages.map<UIMessage>((message) => ({
    ...message,
    parts: normalizeParts(message),
  }));

  if (!attachments.length) {
    return cloned;
  }

  const lastUserMessage = findLastUserMessage(cloned);
  if (!lastUserMessage) {
    throw new AttachmentValidationError(
      "Attachments must accompany a user message",
      "missing_user_message",
    );
  }

  lastUserMessage.parts ??= [];
  const existingAttachmentUrls = new Set(
    lastUserMessage.parts
      ?.filter(
        (part): part is UIPart & { type: "file"; url?: string } =>
          part.type === "file",
      )
      .map((part) => part.url)
      .filter((url): url is string => typeof url === "string"),
  );
  for (const attachment of attachments) {
    if (existingAttachmentUrls.has(attachment.url)) {
      continue;
    }
    lastUserMessage.parts.push({
      type: "file",
      url: attachment.url,
      name: attachment.name,
      mimeType: attachment.type,
      mediaType: attachment.type,
      size: attachment.size,
      attachmentId: attachment.id,
    } as UIPart);
  }

  return cloned;
}

function normalizeParts(
  message: ChatRequestPayload["messages"][number],
): UIPart[] {
  if (message.parts && message.parts.length > 0) {
    return message.parts.map((part) => ({ ...part })) as UIPart[];
  }

  if (message.content) {
    return [{ type: "text", text: message.content }] as UIPart[];
  }

  return [];
}

function findLastUserMessage(messages: UIMessage[]): UIMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index];
    if (candidate.role === "user") {
      return candidate;
    }
  }
  return null;
}

const SUPPORTED_ROLES = new Set(["user", "assistant", "system", "tool"]);

function sanitizeUiMessages(
  messages: ChatRequestPayload["messages"],
): ChatRequestPayload["messages"] {
  return messages
    .filter((message) => SUPPORTED_ROLES.has(message.role))
    .map((message) => sanitizeUiMessage(message));
}

function sanitizeUiMessage(
  message: ChatRequestPayload["messages"][number],
): ChatRequestPayload["messages"][number] {
  if (!message.parts || message.parts.length === 0) {
    return { ...message };
  }
  const filteredParts = message.parts
    .map((part) => normalizePart(part))
    .filter((part): part is UIPart => Boolean(part));

  const sanitized: ChatRequestPayload["messages"][number] = {
    ...message,
    parts: filteredParts.length ? filteredParts : undefined,
  };

  const derivedText = getTextFromParts(filteredParts);
  if (derivedText) {
    sanitized.content = derivedText;
  }

  if (!sanitized.parts) {
    sanitized.parts = undefined;
  }

  return sanitized;
}

function getTextFromParts(parts: UIPart[]): string {
  return parts
    .map((part) => {
      const type = (part as { type?: string }).type;
      if (type === "text" || type === "output_text") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (part as any).text ?? "";
      }
      return "";
    })
    .join("")
    .trim();
}

// Parts we allow to flow through from the client.
// IMPORTANT: include tool-* parts so the client can round-trip document/job tool outputs.
// If we drop these, Canvas (documents) and JobCards can stop working on reload / follow-ups.
const ALLOWED_PART_TYPES = new Set([
  "text",
  "output_text",
  "file",
  `tool-${DOCUMENT_TOOL_NAME}`,
  `tool-${JOB_SEARCH_TOOL_NAME}`,
]);
const DOCUMENT_PART_TYPE = `tool-${DOCUMENT_TOOL_NAME}`;
const JOB_SEARCH_PART_TYPE = `tool-${JOB_SEARCH_TOOL_NAME}`;

function normalizePart(part: unknown): UIPart | null {
  if (!part || typeof part !== "object") {
    return null;
  }
  const candidate = part as UIPart & DocumentToolPart;
  if (candidate.type && ALLOWED_PART_TYPES.has(candidate.type)) {
    return { ...candidate } as UIPart;
  }
  if (isDocumentToolPart(candidate)) {
    const summary = summarizeDocumentPart(candidate);
    if (summary) {
      return { type: "text", text: summary } as UIPart;
    }
  }
  // Pass through job search results as-is so the client can render them
  if (isJobSearchToolPart(candidate)) {
    return { ...candidate } as UIPart;
  }
  return null;
}

function isSupportedModelMessage(message: unknown) {
  if (!message || typeof message !== "object") {
    return false;
  }
  const candidate = message as { role?: string };
  return typeof candidate.role === "string";
}

type DocumentToolPart = {
  type?: string;
  output?: unknown;
};

type JobSearchToolPart = {
  type?: string;
  output?: unknown;
};

function isDocumentToolPart(
  part: DocumentToolPart,
): part is DocumentToolPart & { type: string } {
  return Boolean(part.type === DOCUMENT_PART_TYPE && part.output);
}

function summarizeDocumentPart(part: DocumentToolPart): string | null {
  if (!part.output || !isGeneratedDocument(part.output)) {
    return null;
  }
  const document = part.output;

  // Use AI-provided contextual summary if available
  if (document.summary?.trim()) {
    return document.summary.trim();
  }

  // Fallback to generic message
  const readableType = document.type.replace(/_/g, " ");
  const title = document.title?.trim();
  if (title && title.length > 0) {
    return `Generated ${readableType} titled "${title}".`;
  }
  return `Generated ${readableType}.`;
}

function isJobSearchToolPart(
  part: JobSearchToolPart,
): part is JobSearchToolPart & {
  type: string;
  output: JobResponse;
} {
  return Boolean(part.type === JOB_SEARCH_PART_TYPE && part.output);
}

type ResumeMetaPayload = {
  summary?: string;
  topSkills?: string[];
  generalKeywords?: string[];
};

function extractLatestResumeMeta(
  messages: UIMessage[],
): ResumeMetaPayload | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message.parts?.length) {
      continue;
    }
    for (const part of message.parts) {
      if (part.type !== "text") {
        continue;
      }
      const payload = parseTaggedJsonPayload<ResumeMetaPayload>(
        String((part as { text?: string }).text ?? ""),
        "resume-meta",
      );
      if (payload) {
        return payload;
      }
    }
  }
  return null;
}

function parseTaggedJsonPayload<T = unknown>(
  text: string,
  tag: string,
): T | null {
  if (!text) {
    return null;
  }
  const pattern = new RegExp(`:::${tag}\\s+([\\s\\S]+?)\\s+:::`);
  const match = text.match(pattern);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1]) as T;
  } catch {
    return null;
  }
}

function deriveKeywordsFromSearch(search?: string | null): string[] {
  if (!search) {
    return [];
  }
  return search
    .split(/[\s,]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .map((keyword) => keyword.toLowerCase());
}

function minifyModelMessage(message: any): any {
  if (message.role === "tool" && Array.isArray(message.content)) {
    return {
      ...message,
      content: message.content.map((part: any) => {
        if (
          part.type === "tool-result" &&
          (part.toolName === JOB_SEARCH_TOOL_NAME ||
            // Fallback: check if result has jobs array in case name is missing
            (part.result && Array.isArray(part.result.jobs)))
        ) {
          const count = part.result?.jobs?.length ?? 0;
          return {
            ...part,
            result: {
              ...part.result,
              jobs: [], // Strip content
              stripped: true,
              summary: `[System] Found ${count} jobs. Details hidden from LLM to save tokens.`,
            },
          };
        }
        return part;
      }),
    };
  }
  return message;
}
