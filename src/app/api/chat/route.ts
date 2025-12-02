import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages as convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { CHAT_MODELS } from "@/lib/chat/constants";
import {
  AttachmentValidationError,
  ensureValidAttachments,
  type AttachmentPayload,
} from "@/lib/chat/attachments";
import { chatRequestSchema, type ChatRequestPayload } from "@/lib/chat/schemas";
import { getClientIp } from "@/lib/ip";
import {
  RateLimitError,
  assertCanSendMessage,
  assertCanStartChat,
} from "@/lib/rateLimiter";
import {
  DOCUMENT_TOOL_NAME,
  documentInputSchema,
  generatedDocumentSchema,
  isGeneratedDocument,
  type DocumentInput,
  type GeneratedDocument,
} from "@/lib/canvas/documents";
import { fetchJobs } from "@/lib/jobs/service";
import { JOB_SEARCH_TOOL_NAME, jobSearchSchema, type JobSearchInput } from "@/lib/jobs/tools";
import type { JobResponse } from "@/lib/jobs/types";

export const runtime = "nodejs";
export const preferredRegion = ["bom1", "sin1", "fra1"];

const openAIProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  project: process.env.OPENAI_PROJECT,
});

const getEnabledModel = (modelId: string) => CHAT_MODELS.find((model) => model.id === modelId && model.isEnabled);

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const payload = chatRequestSchema.parse(json);

    const selectedModel = getEnabledModel(payload.modelId);
    if (!selectedModel) {
      return NextResponse.json({ error: "Model is not available" }, { status: 400 });
    }

    const ip = getClientIp(req.headers);

    if (payload.isNewConversation) {
      await assertCanStartChat(ip);
    }

    await assertCanSendMessage(ip, payload.conversationId);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
    }

    const sanitizedAttachments = ensureValidAttachments(payload.attachments);
    const sanitizedMessages = sanitizeUiMessages(payload.messages);
    const uiMessages = attachUploadsToMessages(sanitizedMessages, sanitizedAttachments);

    // Truncate history to prevent excessive token usage.
    // We keep the last 20 messages (approx 10 turns) which aligns with the chat limit.
    // This ensures that even if a conversation is long, we don't exceed token limits.
    const recentUiMessages = uiMessages.slice(-20);

    const modelMessages = convertToModelMessages(recentUiMessages as UIMessage[]).filter(isSupportedModelMessage);

    console.log("/api/chat env", {
      hasKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
      keyLength: process.env.OPENAI_API_KEY?.trim().length,
      project: process.env.OPENAI_PROJECT,
      organization: process.env.OPENAI_ORGANIZATION,
    });

    const result = await streamText({
      model: openAIProvider(selectedModel.providerModelId),
      messages: modelMessages,
      system: systemPrompt,
      abortSignal: req.signal,
      tools: {
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
          description: "Search for sports-related jobs, internships, and career opportunities on SportsNaukri.com.",
          inputSchema: jobSearchSchema,
          async execute(input) {
            const results = await fetchJobs(input);
            return results;
          },
        }),
      },
      onFinish: ({ usage }) => {
        console.log("Token Usage Report:", {
          conversationId: payload.conversationId,
          model: payload.modelId,
          ...usage,
        });
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result as any).toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Invalid chat payload", error.issues);
      return NextResponse.json(
        { error: "Invalid request payload", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof AttachmentValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, code: error.code, remaining: error.remaining },
        { status: error.status }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

const systemPrompt = `You are SportsNaukri's expert career assistant.
Respond conversationally for standard coaching or Q&A.
When the user asks about jobs, vacancies, or career opportunities, use the ${JOB_SEARCH_TOOL_NAME} tool to find real listings.
When the user explicitly asks for a structured asset (resume, cover letter, report, essay) or when a structured document would clearly help, call the ${DOCUMENT_TOOL_NAME} tool exactly once and summarize the output in the live chat instead of pasting the whole document.
Only output plain chat responses outside of the tool.`;

type UIPart = NonNullable<UIMessage["parts"]>[number];

function attachUploadsToMessages(
  messages: ChatRequestPayload["messages"],
  attachments: AttachmentPayload[]
): UIMessage[] {
  if (!messages.length) {
    throw new AttachmentValidationError(
      "At least one message is required",
      "missing_user_message"
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
      "missing_user_message"
    );
  }

  lastUserMessage.parts ??= [];
  const existingAttachmentUrls = new Set(
    lastUserMessage.parts
      ?.filter((part): part is UIPart & { type: "file"; url?: string } => part.type === "file")
      .map((part) => part.url)
      .filter((url): url is string => typeof url === "string")
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

function normalizeParts(message: ChatRequestPayload["messages"][number]): UIPart[] {
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

function sanitizeUiMessages(messages: ChatRequestPayload["messages"]): ChatRequestPayload["messages"] {
  return messages
    .filter((message) => SUPPORTED_ROLES.has(message.role))
    .map((message) => sanitizeUiMessage(message));
}

function sanitizeUiMessage(message: ChatRequestPayload["messages"][number]): ChatRequestPayload["messages"][number] {
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
    delete sanitized.parts;
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

const ALLOWED_PART_TYPES = new Set(["text", "output_text", "file"]);
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

function isDocumentToolPart(part: DocumentToolPart): part is DocumentToolPart & { type: string } {
  return Boolean(part.type === DOCUMENT_PART_TYPE && part.output);
}

function summarizeDocumentPart(part: DocumentToolPart): string | null {
  if (!part.output || !isGeneratedDocument(part.output)) {
    return null;
  }
  const document = part.output;
  const readableType = document.type.replace(/_/g, " ");
  const title = document.title?.trim();
  if (title && title.length > 0) {
    return `Generated ${readableType} titled "${title}".`;
  }
  return `Generated ${readableType}.`;
}

function isJobSearchToolPart(part: JobSearchToolPart): part is JobSearchToolPart & {
  type: string;
  output: JobResponse;
} {
  return Boolean(part.type === JOB_SEARCH_PART_TYPE && part.output);
}
