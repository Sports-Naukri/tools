import { openai } from "@ai-sdk/openai";
import {
  convertToCoreMessages,
  streamText,
} from "ai";
import { NextResponse } from "next/server";

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

export const runtime = "edge";
export const preferredRegion = ["bom1", "sin1", "fra1"];

function isAllowedModel(modelId: string) {
  return CHAT_MODELS.some((model) => model.id === modelId && model.isEnabled);
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const payload = chatRequestSchema.parse(json);

    if (!isAllowedModel(payload.modelId)) {
      return NextResponse.json({ error: "Model is not available" }, { status: 400 });
    }

    const ip = getClientIp(req.headers);

    if (payload.isNewConversation) {
      await assertCanStartChat(ip);
    }

    await assertCanSendMessage(ip, payload.conversationId);

    let sanitizedAttachments: AttachmentPayload[] = [];
    try {
      sanitizedAttachments = ensureValidAttachments(payload.attachments);
    } catch (validationError) {
      if (validationError instanceof AttachmentValidationError) {
        return NextResponse.json(
          { error: validationError.message, code: validationError.code },
          { status: 400 }
        );
      }
      throw validationError;
    }

    let uiMessages: any[] = [];
    try {
      uiMessages = attachUploadsToMessages(payload.messages, sanitizedAttachments);
    } catch (attachmentError) {
      if (attachmentError instanceof AttachmentValidationError) {
        return NextResponse.json(
          { error: attachmentError.message, code: attachmentError.code },
          { status: 400 }
        );
      }
      throw attachmentError;
    }
    const coreMessages = convertToCoreMessages(uiMessages as any);

    const result = await streamText({
      model: openai(payload.modelId),
      messages: coreMessages,
    });

    return (result as any).toDataStreamResponse();
  } catch (error) {
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

function attachUploadsToMessages(
  messages: ChatRequestPayload["messages"],
  attachments: AttachmentPayload[]
): any[] {
  const mapped = messages.map((message) => {
    const parts = message.parts ? [...message.parts] : [{ type: 'text', text: message.content || '' }];
    return {
      id: message.id,
      role: message.role,
      parts,
    };
  });

  if (attachments.length > 0) {
    const lastIndex = mapped.length - 1;
    if (lastIndex >= 0 && mapped[lastIndex].role === "user") {
      mapped[lastIndex].parts.push(...attachments.map(a => ({
        type: 'file',
        url: a.url,
        mediaType: a.type,
        name: a.name,
      })));
    } else {
       throw new AttachmentValidationError(
        "Attachments must be sent with a user message",
        "missing_user_message"
      );
    }
  }

  return mapped;
}
