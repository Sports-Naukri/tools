"use client";

import type { UIMessage } from "@ai-sdk/react";
import { Bot, Loader2, User } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

export type MessageListProps = {
  messages: UIMessage[];
  isStreaming: boolean;
};

export function MessageList({ messages, isStreaming }: MessageListProps) {
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
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 text-sm text-slate-500 pl-12">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating answer…
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
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
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser 
            ? "bg-black text-white rounded-br-sm" 
            : "bg-transparent text-slate-900 px-0 py-0"
        )}
      >
        {message.parts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <MarkdownContent key={index} text={part.text} isUser={isUser} />
            );
          }
          return null;
        })}
      </div>
      {isUser && (
        <div className="shrink-0 mt-1 h-8 w-8 rounded-full bg-black flex items-center justify-center text-white">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
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
