"use client";

import type { ChangeEventHandler, FormEventHandler } from "react";
import { Loader2, Paperclip, Send } from "lucide-react";
import clsx from "clsx";

import type { AttachmentPreview } from "@/lib/chat/types";
import type { UsageSnapshot } from "@/lib/chat/types";

type ChatComposerProps = {
  input: string;
  onInputChange: ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  disabled?: boolean;
  isStreaming: boolean;
  usage?: UsageSnapshot | null;
  attachments: AttachmentPreview[];
  onRemoveAttachment: (id: string) => void;
  onFileSelect: (files: FileList | null) => void;
  error?: string | null;
};

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  disabled,
  isStreaming,
  usage,
  attachments,
  onRemoveAttachment,
  onFileSelect,
  error,
}: ChatComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="relative mt-6 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg"
    >
      <textarea
        value={input}
        onChange={onInputChange}
        placeholder="Ask me anything about sports careers, interviews, or resumes…"
        className="h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-900 outline-none focus:border-[#007FF6]"
        disabled={disabled}
      />

      {attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={clsx(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                attachment.status === "error"
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              )}
            >
              <span className="font-semibold">{attachment.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                {attachment.status === "uploading" ? "Uploading" : formatFileSize(attachment.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.id)}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label={`Remove ${attachment.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="inline-flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
            <Paperclip className="h-4 w-4" /> Add file
            <input
              type="file"
              multiple
              className="sr-only"
              onChange={(event) => onFileSelect(event.target.files)}
            />
          </label>
          <p>Files stay local, reference only.</p>
        </div>
        <div className="flex items-center gap-2">
          <span>{usage ? `${usage.chat.remaining} / ${usage.chat.limit} messages left` : ""}</span>
          <button
            type="submit"
            disabled={disabled || isStreaming}
            className="inline-flex items-center gap-2 rounded-full bg-[#007FF6] px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0F6AD9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </form>
  );
}

function formatFileSize(size: number) {
  if (size > 1_000_000) {
    return `${(size / 1_000_000).toFixed(1)} MB`;
  }
  if (size > 1_000) {
    return `${(size / 1_000).toFixed(1)} KB`;
  }
  return `${size} B`;
}
