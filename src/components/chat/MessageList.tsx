"use client";

import { Bot, FileText, Loader2, User, RefreshCw } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

import type { ToolAwareMessage } from "@/lib/chat/tooling";
import { DOCUMENT_TOOL_NAME, isGeneratedDocument, type CanvasDocument } from "@/lib/canvas/documents";

export type MessageListProps = {
  messages: ToolAwareMessage[];
  isStreaming: boolean;
  onSelectDocument?: (documentId: string) => void;
  documentLookup?: Partial<Record<string, CanvasDocument>>;
  // When true the latest message failed and we render an inline retry prompt.
  showRetry?: boolean;
  onRetry?: () => void;
};

/**
 * Renders the list of chat messages.
 * Handles empty states, message bubbles, and loading indicators.
 */
export function MessageList({ messages, isStreaming, onSelectDocument, documentLookup = {}, showRetry, onRetry }: MessageListProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto w-full">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Bot className="h-6 w-6 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">How can I help you today?</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Ask anything about sports careers, resumes, or interview prep. Attach supporting files for richer responses.
          </p>
        </div>
      )}
      {messages.map((message, index) => (
        <div key={message.id} className="flex flex-col gap-2">
          <MessageBubble
            message={message}
            onSelectDocument={onSelectDocument}
            documentLookup={documentLookup}
          />
          {showRetry && index === messages.length - 1 && (
            <div className="flex justify-end px-4 items-center gap-2">
              <span className="text-xs text-red-500">Failed to send</span>
              <button
                type="button"
                onClick={() => onRetry?.()}
                className="text-red-500 text-sm flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}
        </div>
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 text-sm text-slate-500 pl-12">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating answer…
        </div>
      )}
    </div>
  );
}

type MessageBubbleProps = {
  message: ToolAwareMessage;
  onSelectDocument?: (documentId: string) => void;
  documentLookup: Partial<Record<string, CanvasDocument>>;
};

/**
 * Individual message bubble component.
 * Renders text content and document chips based on message parts.
 */
function MessageBubble({ message, onSelectDocument, documentLookup }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div className={clsx("flex gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="shrink-0 mt-1 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          <Bot className="h-5 w-5" />
        </div>
      )}
      <div
        className={clsx(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed flex flex-col gap-2",
          isUser 
            ? "bg-[#006dff] text-white rounded-br-sm" 
            : "bg-transparent text-slate-900 px-0 py-0"
        )}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <MarkdownContent key={index} text={part.text} isUser={isUser} />
            );
          }

          if (isDocumentToolPart(part)) {
            const docFromLookup = part.toolCallId ? documentLookup[part.toolCallId] : undefined;
            const docFromOutput = isGeneratedDocument(part.output) ? part.output : undefined;
            const resolvedDocument = docFromLookup ?? docFromOutput;

            if (!resolvedDocument) {
              return null;
            }

            return (
              <DocumentChip
                key={`doc-${part.toolCallId ?? index}`}
                document={resolvedDocument}
                onSelectDocument={onSelectDocument}
              />
            );
          }
          return null;
        })}
      </div>
      {isUser && (
        <div className="shrink-0 mt-1 h-8 w-8 rounded-full bg-[#006dff] flex items-center justify-center text-white">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

type DocumentChipProps = {
  document: CanvasDocument;
  onSelectDocument?: (documentId: string) => void;
};

function DocumentChip({ document, onSelectDocument }: DocumentChipProps) {
  if (!document) return null;
  const readableType = document.type.replace(/_/g, " ");
  const isResume = readableType.toLowerCase().includes('resume');
  const label = isResume ? `View generated ${readableType}` : "View document";

  return (
    <button
      type="button"
      onClick={() => onSelectDocument?.(document.id)}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-100 w-fit"
    >
      <FileText className="h-4 w-4" />
      {label}
    </button>
  );
}

const DOCUMENT_PART_TYPE = `tool-${DOCUMENT_TOOL_NAME}`;

type UnknownToolPart = {
  type?: string;
  toolCallId?: string;
  state?: string;
  output?: unknown;
};

function isDocumentToolPart(part: unknown): part is UnknownToolPart {
  return Boolean(part && typeof part === "object" && (part as UnknownToolPart).type === DOCUMENT_PART_TYPE);
}

type MarkdownContentProps = {
  text: string;
  isUser: boolean;
};

function MarkdownContent({ text, isUser }: MarkdownContentProps) {
  const components = getMarkdownComponents(isUser);
  return (
    <div
      className={clsx(
        "prose prose-sm max-w-none whitespace-pre-wrap wrap-break-word",
        isUser ? "prose-invert text-white" : "text-slate-900"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function getMarkdownComponents(isUser: boolean): Components {
  const codeBase = clsx(
    "rounded px-1 py-0.5 text-xs font-mono",
    isUser ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"
  );

  return {
    h1: (props) => <h2 className="text-xl font-semibold mt-4" {...props} />,
    h2: (props) => <h3 className="text-lg font-semibold mt-4" {...props} />,
    h3: (props) => <h4 className="text-base font-semibold mt-3" {...props} />,
    ul: (props) => <ul className="list-disc pl-5 space-y-1" {...props} />,
    ol: (props) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
    li: (props) => <li className="text-sm leading-relaxed" {...props} />,
    p: (props) => <p className="text-sm leading-relaxed" {...props} />,
    strong: (props) => <strong className="font-semibold" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    code: (props) => (
      <code
        className={codeBase}
        {...props}
      />
    ),
  } satisfies Components;
}
