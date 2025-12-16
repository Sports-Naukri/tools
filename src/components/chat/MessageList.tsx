/**
 * Message List Component
 * 
 * Renders the chronological list of chat messages.
 * Features:
 * - Message bubbles (User/Assistant) using Markdown
 * - Empty state with "Starter Questions"
 * - Loading indicators/animations for different tool states
 * - Inline suggestions for follow-up questions
 * - Rendering of "Chips" for documents and job context
 * 
 * @module components/chat/MessageList
 * @see {@link ./LottieAnimations.tsx} for loading states
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileText, User, RefreshCw, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

import type { ToolAwareMessage } from "@/lib/chat/tooling";
import type { ChatSuggestion } from "@/lib/chat/types";
import { DOCUMENT_TOOL_NAME, isGeneratedDocument, type CanvasDocument } from "@/lib/canvas/documents";
import { JOB_SEARCH_TOOL_NAME } from "@/lib/jobs/tools";
import { JobList } from "./JobCard";
import type { JobResponse, Job } from "@/lib/jobs/types";
import { DocumentGeneratingAnimation, JobSearchingAnimation } from "./LottieAnimations";

export type MessageListProps = {
  messages: ToolAwareMessage[];
  isStreaming: boolean;
  onSelectDocument?: (documentId: string) => void;
  documentLookup?: Partial<Record<string, CanvasDocument>>;
  // When true the latest message failed and we render an inline retry prompt.
  showRetry?: boolean;
  onRetry?: () => void;
  onSuggestionClick?: (text: string) => void;
  onStarterClick?: (text: string) => void;
  isLimitReached?: boolean;
  onSelectJob?: (job: Job) => void;
  suggestionsByMessage?: Record<string, ChatSuggestion[]>;
  onSuggestionSelect?: (messageId: string) => void;
};

const STARTER_QUESTIONS = [
  { heading: "Resume Help", text: "Help me write a resume for a Football Coach position." },
  { heading: "Interview Prep", text: "What are common interview questions for a Sports Analyst?" },
  { heading: "Cover Letter", text: "Create a cover letter for a Gym Manager role." },
  { heading: "Career Advice", text: "How do I transition from athlete to sports administration?" },
];

/**
 * Renders the list of chat messages.
 * Handles empty states, message bubbles, and loading indicators.
 */
export function MessageList({
  messages,
  isStreaming,
  onSelectDocument,
  documentLookup = {},
  showRetry,
  onRetry,
  onSuggestionClick,
  onStarterClick,
  isLimitReached,
  onSelectJob,
  suggestionsByMessage = {},
  onSuggestionSelect,
}: MessageListProps) {
  const handleStarter = onStarterClick ?? onSuggestionClick;
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-3xl mx-auto w-full">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 empty-state-bg">
          <div className="space-y-4 flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Bot className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">How can I help you today?</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Ask anything about sports careers, resumes, or interview prep. Attach supporting files for richer responses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
            {STARTER_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleStarter?.(q.text)}
                disabled={isLimitReached}
                className={clsx(
                  "text-left p-4 rounded-xl border transition-all group starter-card",
                  isLimitReached
                    ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className={clsx("font-medium text-sm mb-1", isLimitReached ? "text-slate-400" : "text-slate-900")}>
                  {q.heading}
                </div>
                <div className={clsx("text-xs", isLimitReached ? "text-slate-400" : "text-slate-500 group-hover:text-slate-600")}>
                  {q.text}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {messages.map((message, index) => {
        const isAssistantStreaming =
          isStreaming && index === messages.length - 1 && message.role === "assistant";

        const suggestions = suggestionsByMessage[message.id] ?? [];

        return (
          <div key={message.id} className="flex flex-col gap-2">
            <MessageBubble
              message={message}
              onSelectDocument={onSelectDocument}
              documentLookup={documentLookup}
              isStreamingAssistant={isAssistantStreaming}
              onSelectJob={onSelectJob}
            />
            {!isAssistantStreaming && suggestions.length > 0 && (
              <SuggestionRow
                suggestions={suggestions}
                onSuggestionClick={(text) => {
                  onSuggestionClick?.(text);
                  onSuggestionSelect?.(message.id);
                }}
                onDismiss={() => onSuggestionSelect?.(message.id)}
              />
            )}
            {/* Retry button removed from here - now shown at end of list */}
          </div>
        );
      })}

      {/* Retry button - shown at end of message list, not tied to specific message */}
      {showRetry && !isStreaming && (
        <div className="flex justify-center px-4 py-3 items-center gap-2">
          <span className="text-xs text-red-500">Failed to send</span>
          <button
            type="button"
            onClick={() => onRetry?.()}
            className="bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Only show generic generating indicator when NO special tool animation is showing */}
      {isStreaming && (() => {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== "assistant") return true;

        const hasSpecialTool = lastMessage.parts?.some(part => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any;

          // Check for tool-invocation type
          if (p.type === "tool-invocation") {
            const toolName = p.toolInvocation?.toolName;
            return toolName === DOCUMENT_TOOL_NAME || toolName === JOB_SEARCH_TOOL_NAME;
          }

          // Check for direct tool part types
          if (p.type === `tool-${DOCUMENT_TOOL_NAME}` || p.type === `tool-${JOB_SEARCH_TOOL_NAME}`) {
            return true;
          }

          return false;
        });

        return !hasSpecialTool;
      })() && <GeneratingIndicator />}
    </div>
  );
}

const GENERATING_PHRASES = ["Thinking", "Analyzing", "Crafting response", "Almost there"];

/**
 * Animated indicator shown while the AI is generating a response.
 * Features a morphing text animation and animated gradient border.
 */
function GeneratingIndicator() {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % GENERATING_PHRASES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 pl-12">
      <div className="ai-generating-indicator">
        <div className="ai-generating-indicator-inner">
          <div className="indicator-dot" />
          <span key={textIndex} className="morphing-text-enter min-w-[120px]">
            {GENERATING_PHRASES[textIndex]}
            <span className="animate-pulse">...</span>
          </span>
        </div>
      </div>
    </div>
  );
}

type MessageBubbleProps = {
  message: ToolAwareMessage;
  onSelectDocument?: (documentId: string) => void;
  documentLookup: Partial<Record<string, CanvasDocument>>;
  isStreamingAssistant?: boolean;
  onSelectJob?: (job: Job) => void;
};

/**
 * Individual message bubble component.
 * Renders text content and document chips based on message parts.
 */
function MessageBubble({ message, onSelectDocument, documentLookup, isStreamingAssistant = false, onSelectJob }: MessageBubbleProps) {
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
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed flex flex-col gap-2 message-enter",
          isUser
            ? "bg-[#006dff] text-white rounded-br-sm user-message-glow"
            : "assistant-message text-slate-900"
        )}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            if (part.text.startsWith(":::resume-meta")) {
              return null;
            }
            if (part.text.startsWith(":::resume-context")) {
              return <ResumeContextChip key={index} text={part.text} />;
            }
            if (part.text.startsWith(":::job-context")) {
              return <JobContextChip key={index} text={part.text} />;
            }
            return (
              <MarkdownContent key={index} text={part.text} isUser={isUser} isStreaming={isStreamingAssistant} />
            );
          }

          const isDocPart = isDocumentToolPart(part);

          if (isDocPart) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = part as any;
            const docOutput = p.output || p.toolInvocation?.result;
            const toolCallId = p.toolCallId || p.toolInvocation?.toolCallId;
            const docFromLookup = toolCallId ? documentLookup[toolCallId] : undefined;
            const docFromOutput = isGeneratedDocument(docOutput) ? docOutput : undefined;
            const resolvedDocument = docFromLookup ?? docFromOutput;

            if (!resolvedDocument) {
              return <DocumentGeneratingAnimation key={`doc-loading-${index}`} />;
            }

            return (
              <DocumentChip
                key={`doc-${toolCallId ?? index}`}
                document={resolvedDocument}
                onSelectDocument={onSelectDocument}
              />
            );
          }

          if (isJobSearchToolPart(part)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = part as any;
            // AI SDK v5 uses .output, older versions use .result
            const output = p.output || p.toolInvocation?.output || p.toolInvocation?.result;
            const toolCallId = p.toolCallId || p.toolInvocation?.toolCallId;
            return (
              <DelayedJobResults
                key={`job-${toolCallId ?? index}`}
                output={output as JobResponse | null}
                onSelectJob={onSelectJob}
              />
            );
          }

          // Check for in-progress tool invocations
          if (isToolInProgress(part, DOCUMENT_TOOL_NAME)) {
            return <DocumentGeneratingAnimation key={`doc-loading-${index}`} />;
          }
          if (isToolInProgress(part, JOB_SEARCH_TOOL_NAME)) {
            return <JobSearchingAnimation key={`job-loading-${index}`} />;
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

type SuggestionRowProps = {
  suggestions: ChatSuggestion[];
  onSuggestionClick: (text: string) => void;
  onDismiss?: () => void;
};

function SuggestionRow({ suggestions, onSuggestionClick, onDismiss }: SuggestionRowProps) {
  return (
    <div className="flex flex-wrap gap-2 pl-12 animate-in fade-in duration-300">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onSuggestionClick(suggestion.text)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-[#006dff] hover:-translate-y-0.5 transition"
        >
          {suggestion.text}
        </button>
      ))}
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full border border-transparent px-2 text-[11px] text-slate-400 hover:text-slate-600"
        aria-label="Dismiss suggestions"
      >
        Dismiss
      </button>
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

function JobContextChip({ text }: { text: string }) {
  const data = useMemo(() => extractJobContext(text), [text]);
  if (!data) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 w-fit mb-2">
      <Briefcase className="h-3.5 w-3.5" />
      <span>Asking about: {data.title} at {data.employer}</span>
    </div>
  );
}

function extractJobContext(text: string) {
  const match = text.match(/:::job-context\s+(.+?)\s+:::/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    const title = data.title || "Job";
    const employer = data.employer || "Company";
    return { title, employer };
  } catch {
    return null;
  }
}



type DelayedJobResultsProps = {
  output: JobResponse | null;
  onSelectJob?: (job: Job) => void;
};

/**
 * Shows job search animation while loading, then reveals results immediately when ready.
 * Previous 3-second delay was removed because streaming re-renders kept cancelling the timer.
 */
function DelayedJobResults({ output, onSelectJob }: DelayedJobResultsProps) {
  // Show animation while loading
  if (!output) {
    return <JobSearchingAnimation />;
  }

  // Output is ready - render cards immediately
  return <JobList response={output} onSelectJob={onSelectJob} />;
}

function ResumeContextChip({ text }: { text: string }) {
  const data = useMemo(() => extractResumeContext(text), [text]);
  const [isOpen, setIsOpen] = useState(false);
  if (!data) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 font-semibold text-slate-700"
      >
        <FileText className="h-3.5 w-3.5 text-[#006dff]" />
        <span>Resume context • {data.fileName}</span>
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {isOpen && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-slate-500">
            {data.wordCount} words · {data.readingTimeMinutes} min read
          </p>
          {data.summary && (
            <p className="text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">Summary:</span> {data.summary}
            </p>
          )}
          {Array.isArray(data.strengths) && data.strengths.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.strengths.map((skill: string) => (
                <span key={skill} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  {skill}
                </span>
              ))}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600 whitespace-pre-wrap">
            {data.fullText || "Full resume text unavailable."}
          </div>
        </div>
      )}
    </div>
  );
}

function extractResumeContext(text: string) {
  const match = text.match(/:::resume-context\s+([\s\S]+?)\s+:::/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

const DOCUMENT_PART_TYPE = `tool-${DOCUMENT_TOOL_NAME}`;
const JOB_SEARCH_PART_TYPE = `tool-${JOB_SEARCH_TOOL_NAME}`;

/**
 * Checks if a part represents a tool invocation that is currently in progress.
 * Returns true when the tool has been called but hasn't returned results yet.
 */
function isToolInProgress(part: unknown, toolName: string): boolean {
  if (!part || typeof part !== "object") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;

  // Check for standard SDK tool invocation in "call" state
  if (
    p.type === "tool-invocation" &&
    p.toolInvocation?.toolName === toolName &&
    (p.toolInvocation?.state === "call" || p.toolInvocation?.state === "partial-call")
  ) {
    return true;
  }

  return false;
}

type UnknownToolPart = {
  type?: string;
  toolCallId?: string;
  state?: string;
  output?: unknown;
};

function isDocumentToolPart(part: unknown): part is UnknownToolPart {
  if (!part || typeof part !== "object") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;

  // Check for custom part type
  if (p.type === DOCUMENT_PART_TYPE) {
    return true;
  }

  // Check for standard SDK tool invocation
  if (
    p.type === "tool-invocation" &&
    p.toolInvocation?.toolName === DOCUMENT_TOOL_NAME &&
    (p.toolInvocation?.result || p.toolInvocation?.state === "result")
  ) {
    return true;
  }

  return false;
}

function isJobSearchToolPart(part: unknown): part is UnknownToolPart {
  if (!part || typeof part !== "object") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = part as any;

  // Check for custom part type
  if (p.type === JOB_SEARCH_PART_TYPE && p.output) {
    return true;
  }

  // Check for standard SDK tool invocation
  // AI SDK v5 uses .output instead of .result, so check both for compatibility
  if (
    p.type === "tool-invocation" &&
    p.toolInvocation?.toolName === JOB_SEARCH_TOOL_NAME &&
    (p.toolInvocation?.result || p.toolInvocation?.output)
  ) {
    return true;
  }

  return false;
}

type MarkdownContentProps = {
  text: string;
  isUser: boolean;
  isStreaming?: boolean;
};

function MarkdownContent({ text, isUser, isStreaming = false }: MarkdownContentProps) {
  const components = useMemo(() => getMarkdownComponents(isUser), [isUser]);
  const normalizedText = useMemo(() => normalizeMarkdown(text), [text]);
  const [displayText, setDisplayText] = useState(normalizedText);
  const targetRef = useRef(normalizedText);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = normalizedText;

    if (!isStreaming) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const raf = requestAnimationFrame(() => {
        setDisplayText(normalizedText);
      });
      return () => cancelAnimationFrame(raf);
    }

    const tick = () => {
      setDisplayText((prev) => {
        const target = targetRef.current ?? "";
        if (prev === target) {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          return prev;
        }
        const remaining = target.length - prev.length;
        const chunk = remaining > 20 ? Math.ceil(remaining / 14) : 1;
        return target.slice(0, prev.length + chunk);
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [normalizedText, isStreaming]);

  return (
    <div className={clsx("chat-markdown text-sm leading-relaxed", isUser ? "text-white" : "text-slate-900")}>
      <div className={clsx(isStreaming && "animate-in fade-in duration-500")}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {displayText}
        </ReactMarkdown>
      </div>
      {isStreaming && displayText.length < normalizedText.length && (
        <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-slate-400 animate-pulse" />
      )}
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

function normalizeMarkdown(input: string): string {
  if (!input) {
    return "";
  }

  const normalizedNewlines = input.replace(/\r\n/g, "\n").replace(/\u00A0/g, " ");
  const collapsed = normalizedNewlines
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n");

  const needsLeadingWhitespace = collapsed.trimStart().startsWith("```");
  const trimmed = needsLeadingWhitespace ? collapsed.trimEnd() : collapsed.trim();

  return trimmed;
}
