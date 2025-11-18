"use client";

import type { Message } from "ai";
import { Bot, Loader2, User } from "lucide-react";
import clsx from "clsx";

export type MessageListProps = {
  messages: Message[];
  isStreaming: boolean;
};

export function MessageList({ messages, isStreaming }: MessageListProps) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl bg-white/70 p-6 shadow-inner">
      {messages.length === 0 && (
        <div className="min-h-60 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-slate-500">
          Ask anything about sports careers, resumes, or interview prep. Attach supporting files for richer responses.
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating answer…
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={clsx("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mt-1 rounded-2xl bg-[#E6F1FF] p-2 text-[#007FF6]">
          <Bot className="h-5 w-5" />
        </div>
      )}
      <div
        className={clsx(
          "max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed",
          isUser ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-800"
        )}
      >
        {message.content.split("\n").map((line, index) => (
          <p key={index} className="whitespace-pre-wrap">
            {line}
          </p>
        ))}
      </div>
      {isUser && (
        <div className="mt-1 rounded-2xl bg-slate-900 p-2 text-white">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
