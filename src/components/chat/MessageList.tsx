"use client";

import type { UIMessage } from "@ai-sdk/react";
import { Bot, Loader2, User } from "lucide-react";
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
              <div key={index} className={clsx("prose prose-sm max-w-none", isUser ? "text-white" : "text-slate-900")}>
                {part.text}
              </div>
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
