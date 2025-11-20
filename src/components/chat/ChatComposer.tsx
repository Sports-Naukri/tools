"use client";

import { useRef, useState, type ChangeEventHandler, type FormEventHandler, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, X, ChevronDown, Globe, Zap, Loader2, Check, Lock } from "lucide-react";
import clsx from "clsx";

import type { AttachmentPreview } from "@/lib/chat/types";
import type { UsageSnapshot } from "@/lib/chat/types";
import { CHAT_MODELS } from "@/lib/chat/constants";

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
  onSearchToggle?: () => void;
};

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  disabled,
  isStreaming,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  usage,
  attachments,
  onRemoveAttachment,
  onFileSelect,
  error,
  modelId,
  onModelChange,
  isSearchEnabled,
  onSearchToggle,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);

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

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6">
      <form
        onSubmit={onSubmit}
        className={clsx(
          "relative flex flex-col rounded-2xl border bg-white shadow-sm transition-colors",
          "border-slate-200 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200"
        )}
      >
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
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

        <textarea
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          className="min-h-[60px] w-full resize-none bg-transparent px-4 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          rows={1}
          disabled={disabled}
        />

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
              onClick={onSearchToggle}
              className={clsx(
                "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors border",
                isSearchEnabled 
                  ? "bg-blue-50 text-[#006dff] border-blue-200" 
                  : "text-slate-500 hover:text-[#006dff] hover:bg-blue-50 hover:border-blue-200 border-slate-200"
              )}
            >
              <div className="relative">
                <Globe className="h-3 w-3" />
                {!isSearchEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[150%] h-[1.5px] bg-slate-500 group-hover:bg-[#006dff] rotate-45 transition-colors" />
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
      
      <div className="mt-2 text-center text-xs text-slate-400">
        AI can make mistakes. Please double check responses.
      </div>
    </div>
  );
}

