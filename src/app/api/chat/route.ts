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
  type DocumentInput,
  type GeneratedDocument,
} from "@/lib/canvas/documents";

export const runtime = "edge";
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
    const uiMessages = attachUploadsToMessages(payload.messages, sanitizedAttachments);
    const modelMessages = convertToModelMessages(uiMessages as UIMessage[]);

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
