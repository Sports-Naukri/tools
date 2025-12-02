"use client";

import { useRef, useState, type ChangeEventHandler, type FormEventHandler, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, X, ChevronDown, Globe, Zap, Loader2, Check, Lock } from "lucide-react";
import clsx from "clsx";

import type { AttachmentPreview } from "@/lib/chat/types";
import type { UsageSnapshot } from "@/lib/chat/types";
import { CHAT_MODELS } from "@/lib/chat/constants";
import type { Job } from "@/lib/jobs/types";

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
  modelId?: string;
  onModelChange?: (modelId: string) => void;
  isSearchEnabled?: boolean;
  limitReachedReason?: 'daily' | 'chat' | null;
  onNewChat?: () => void;
  selectedJob?: Job | null;
  onRemoveJob?: () => void;
};

const MAX_INPUT_LENGTH = 4000;

/**
 * Component for composing and sending chat messages.
 * Supports text input, file attachments, and model selection.
 */
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
  modelId,
  onModelChange,
  isSearchEnabled,
  limitReachedReason,
  onNewChat,
  selectedJob,
  onRemoveJob,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);

  // Handle Enter key to submit, Shift+Enter for new line
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isStreaming) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmit(e as any);
      }
    }
  };

  const currentModel = CHAT_MODELS.find((m) => m.id === modelId) || CHAT_MODELS[0];
  const showCharCount = input.length > MAX_INPUT_LENGTH * 0.8;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6">
      <form
        onSubmit={onSubmit}
        className={clsx(
          "relative flex flex-col rounded-2xl border bg-white shadow-sm transition-colors",
          "border-slate-200 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200",
          disabled && "bg-slate-50"
        )}
      >
        {/* Limit Reached Overlay */}
        {limitReachedReason && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[1px] p-4 text-center">
            <div className="flex flex-col items-center gap-3 max-w-sm">
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm border border-slate-200">
                <Lock className="h-4 w-4 text-amber-500" />
                {limitReachedReason === 'daily' 
                  ? "Daily conversation limit reached. Come back tomorrow!" 
                  : "Message limit reached for this conversation."}
              </div>
              
              {limitReachedReason === 'chat' && onNewChat && usage && (
                usage.daily.remaining > 0 ? (
                  <button
                    type="button"
                    onClick={onNewChat}
                    className="text-xs text-[#006dff] hover:underline font-medium"
                  >
                    Start a new chat to continue
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    You have also reached your daily chat limit.
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Attachments Preview */}
        {(attachments.length > 0 || selectedJob) && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {selectedJob && (
              <div className="relative flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 pr-8 text-sm text-blue-700">
                <span className="max-w-[200px] truncate font-medium">Job: {selectedJob.title}</span>
                <button
                  type="button"
                  onClick={onRemoveJob}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {attachments.map((att) => (
              <div
                key={att.id}
                className={clsx(
                  "relative flex items-center gap-2 rounded-lg border px-3 py-2 pr-8 text-sm",
                  att.status === "error"
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                <span className="max-w-[150px] truncate font-medium">{att.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            className="min-h-[60px] w-full resize-none bg-transparent px-4 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            rows={1}
            disabled={disabled}
            maxLength={MAX_INPUT_LENGTH}
          />
          {showCharCount && (
            <div className={clsx(
              "absolute bottom-2 right-4 text-xs pointer-events-none",
              input.length >= MAX_INPUT_LENGTH ? "text-red-500 font-medium" : "text-slate-400"
            )}>
              {input.length} / {MAX_INPUT_LENGTH}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {currentModel.name}
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </button>

              {isModelPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsModelPickerOpen(false)} 
                  />
                  <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-20">
                    {CHAT_MODELS.map((model) => {
                      const isActive = model.id === currentModel.id;
                      const isLocked = !model.isEnabled;
                      const vendorLabel = model.vendor.toUpperCase();

                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            if (isLocked) return;
                            onModelChange?.(model.id);
                            setIsModelPickerOpen(false);
                          }}
                          className={clsx(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                            isActive ? "bg-slate-50 text-slate-900" : "text-slate-600",
                            isLocked && "cursor-not-allowed opacity-60 hover:bg-transparent"
                          )}
                        >
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{vendorLabel}</div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-slate-400">{model.description}</div>
                          </div>
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-slate-400" />
                          ) : (
                            isActive && <Check className="h-4 w-4 text-[#006dff]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <button type="button" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">
              <Zap className="h-3 w-3" />
              Low
            </button>

            <button
              type="button"
              aria-disabled="true"
              title="Search coming soon"
              className={clsx(
                "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors border",
                "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-500"
              )}
            >
              <div className="relative">
                <Globe className="h-3 w-3" />
                {!isSearchEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[150%] h-[1.5px] bg-slate-500 group-hover:bg-slate-400 rotate-45 transition-colors" />
                  </div>
                )}
              </div>
              Search
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => onFileSelect(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Add attachment"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={disabled || isStreaming || (!input.trim() && attachments.length === 0)}
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                input.trim() || attachments.length > 0
                  ? "bg-[#006dff] text-white hover:bg-[#0056cc] shadow-sm"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              )}
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </form>
      
      {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
      
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-400">
        <span>AI can make mistakes. Please double check responses.</span>
        {usage && (
          <span className={clsx(
            "font-medium",
            usage.chat.remaining === 0 ? "text-red-500" :
            usage.chat.remaining < 3 ? "text-amber-500" : "text-slate-400"
          )}>
            {usage.chat.remaining} messages left
          </span>
        )}
      </div>
    </div>
  );
}

