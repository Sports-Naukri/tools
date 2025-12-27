/**
 * Chat Composer Component
 *
 * The primary input interface for the chat system.
 * Features:
 * - Text area with auto-resize and character count
 * - Mode switcher (Jay vs Navigator)
 * - File attachment handling (Select, Upload, Remove)
 * - Model picker integration
 * - Resume context toggle integration
 * - Rate limit warning overlays
 *
 * @module components/chat/ChatComposer
 */

"use client";

import clsx from "clsx";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ChevronDown,
  Info,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import {
  type ChangeEventHandler,
  type FormEventHandler,
  type KeyboardEvent,
  useRef,
  useState,
} from "react";

import { CHAT_MODELS } from "@/lib/chat/constants";
import type { AttachmentPreview } from "@/lib/chat/types";
import type { UsageSnapshot } from "@/lib/chat/types";
import type { Job } from "@/lib/jobs/types";
import { formatDurationShort } from "@/lib/time";
import { ResumeToggle } from "./ResumeToggle";

export type ChatMode = "jay" | "navigator";

type ChatComposerProps = {
  input: string;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  disabled?: boolean;
  isStreaming: boolean;
  usage?: UsageSnapshot | null;
  attachments: AttachmentPreview[];
  onRemoveAttachment: (id: string) => void;
  onRetryAttachment?: (id: string) => void;
  onFileSelect: (files: FileList | null) => void;
  error?: string | null;
  modelId?: string;
  onModelChange?: (modelId: string) => void;
  isSearchEnabled?: boolean;
  limitReachedReason?: "daily" | "chat" | null;
  onNewChat?: () => void;
  selectedJob?: Job | null;
  onRemoveJob?: () => void;

  hasUploadingAttachments?: boolean;
  hasErroredAttachments?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;

  /** Called when the Resume On/Off toggle changes */
  onResumeToggleChange?: (enabled: boolean) => void;
};

const MAX_INPUT_LENGTH = 4000;

/**
 * Mode button with tooltip for Jay/Navigator toggle
 */
function ModeButton({
  mode,
  currentMode,
  onClick,
  label,
  tooltip,
  dotColor,
}: {
  mode: ChatMode;
  currentMode: ChatMode;
  onClick: () => void;
  label: string;
  tooltip: string;
  dotColor: "yellow" | "red";
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const isActive = mode === currentMode;

  const dotColorClass =
    dotColor === "yellow"
      ? isActive
        ? "bg-yellow-500"
        : "bg-slate-400"
      : isActive
        ? "bg-red-500"
        : "bg-slate-400";

  const textColorClass =
    dotColor === "yellow"
      ? isActive
        ? "text-yellow-600"
        : "text-slate-500 hover:text-slate-700"
      : isActive
        ? "text-red-600"
        : "text-slate-500 hover:text-slate-700";

  return (
    <div
      className="relative inline-flex items-center rounded-md bg-white/90 px-2 py-1 shadow-sm ring-1 ring-black/5"
      ref={buttonRef}
    >
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "flex items-center gap-1 text-[11px] font-medium tracking-tight transition-colors",
          textColorClass,
        )}
      >
        <div
          className={clsx("h-1.5 w-1.5 rounded-full shrink-0", dotColorClass)}
        />
        <span className="whitespace-nowrap">{label}</span>
      </button>
      <button
        type="button"
        onClick={() => setShowTooltip((v) => !v)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="ml-1 shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label={`Info about ${label}`}
      >
        <Info className="h-3 w-3" />
      </button>

      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 w-48 z-50 p-2 text-[10px] leading-relaxed text-slate-600 bg-white rounded-lg shadow-lg border border-slate-200">
          <div className="font-medium text-slate-800 mb-1">{label}</div>
          {tooltip}
        </div>
      )}
    </div>
  );
}

/**
 * Component for composing and sending chat messages.
 * Supports text input, file attachments, and model selection.
 */
export function ChatComposer({
  input,
  inputRef,
  onInputChange,
  onSubmit,
  disabled,
  isStreaming,
  usage,
  attachments,
  onRemoveAttachment,
  onRetryAttachment,
  onFileSelect,
  error,
  modelId,
  onModelChange,
  // isSearchEnabled currently unused - feature hidden
  limitReachedReason,
  onNewChat,
  selectedJob,
  onRemoveJob,

  hasUploadingAttachments = false,
  hasErroredAttachments = false,
  mode = "jay",
  onModeChange,

  onResumeToggleChange,
}: ChatComposerProps) {
  const fallbackInputRef = useRef<HTMLTextAreaElement>(null);
  const activeInputRef = inputRef ?? fallbackInputRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  // Only show actual errors in the error area, not attachments disabled message (that shows as tooltip)
  const primaryError = error;
  const activeLimitWindow =
    limitReachedReason && usage ? usage[limitReachedReason] : null;
  const activeResetCountdown = activeLimitWindow
    ? formatDurationShort(activeLimitWindow.secondsUntilReset)
    : null;

  // Handle Enter key to submit, Shift+Enter for new line
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // While the assistant is streaming, keep the input editable but prevent
      // additional sends (send button + Enter submit).
      if (!disabled && !isStreaming) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSubmit(e as any);
      }
    }
  };

  const currentModel =
    CHAT_MODELS.find((m) => m.id === modelId) || CHAT_MODELS[0];
  const showCharCount = input.length > MAX_INPUT_LENGTH * 0.8;

  const hasTypedInput = Boolean(input.trim());
  const hasPayload =
    hasTypedInput || attachments.length > 0 || Boolean(selectedJob);
  const sendDisabled =
    disabled ||
    isStreaming ||
    !hasPayload ||
    hasUploadingAttachments ||
    hasErroredAttachments;

  // Theme colors based on mode - Jay is yellow, Navigator is red
  const isNavigatorMode = mode === "navigator";
  const primaryColor = isNavigatorMode ? "#DC2626" : "#EAB308"; // red-600 : yellow-500

  // Stronger glow shadow based on mode - Reduced opacity
  const glowShadow = isNavigatorMode
    ? "0 0 20px rgba(220, 38, 38, 0.15), 0 0 40px rgba(220, 38, 38, 0.05)" // red aura - much lower opacity
    : "0 0 20px rgba(234, 179, 8, 0.2), 0 0 40px rgba(234, 179, 8, 0.1)"; // yellow aura - lower opacity

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-x-hidden">
      {/* Chrome-style tabs container with form */}
      <form
        onSubmit={onSubmit}
        className={clsx(
          "relative flex flex-col rounded-2xl border bg-white transition-all",
          isNavigatorMode ? "border-red-200" : "border-yellow-200",
          disabled && "bg-slate-50",
        )}
        style={{ boxShadow: glowShadow }}
      >
        {/* Limit Reached Overlay */}
        {limitReachedReason && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[1px] p-4 text-center">
            <div className="flex flex-col items-center gap-3 max-w-sm">
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm border border-slate-200">
                <Lock className="h-4 w-4 text-amber-500" />
                {limitReachedReason === "daily"
                  ? "Daily conversation limit reached. Come back tomorrow!"
                  : "Message limit reached for this conversation."}
              </div>

              {activeResetCountdown && (
                <p className="text-xs text-slate-500">
                  Try again in {activeResetCountdown}
                </p>
              )}

              {limitReachedReason === "chat" &&
                onNewChat &&
                usage &&
                (usage.daily.remaining > 0 ? (
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
                ))}
            </div>
          </div>
        )}

        {/* Embedded Mode Toggle - Negative Elevation */}
        {onModeChange && (
          <div className="absolute top-3 left-3 z-10 p-1 bg-slate-100/80 rounded-lg flex items-center gap-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
            <ModeButton
              mode="jay"
              currentMode={mode}
              onClick={() => onModeChange("jay")}
              label="Jay"
              tooltip="Career coach for resumes, cover letters, interview prep & career advice"
              dotColor="yellow"
            />
            <ModeButton
              mode="navigator"
              currentMode={mode}
              onClick={() => onModeChange("navigator")}
              label="Navigator"
              tooltip="Career path analyst - skill mapping, gap analysis & job matching"
              dotColor="red"
            />
          </div>
        )}

        {/* Attachments Preview */}
        {(attachments.length > 0 || selectedJob) && (
          <div
            className={clsx(
              "flex flex-wrap gap-2 px-3 pb-0",
              onModeChange ? "pt-12" : "pt-3",
            )}
          >
            {selectedJob && (
              <div className="relative flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 pr-8 text-sm text-blue-700">
                <span className="max-w-50 truncate font-medium">
                  Job: {selectedJob.title}
                </span>
                <button
                  type="button"
                  onClick={onRemoveJob}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {attachments.map((att) => {
              const isUploading = att.status === "uploading";
              const isError = att.status === "error";
              const isLocalOnly = Boolean(att.isLocalOnly);
              const statusText = isLocalOnly
                ? "Stored locally (resume)"
                : isUploading
                  ? "Uploading…"
                  : isError
                    ? (att.error ?? "Upload failed")
                    : "Ready";

              return (
                <div
                  key={att.id}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-lg border pl-3 pr-1 py-2 text-sm",
                    isError
                      ? "border-red-200 bg-red-50 text-red-600"
                      : isUploading
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-slate-50 text-slate-700",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-500 shrink-0">
                      {isError ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{att.name}</span>
                      <span
                        className={clsx(
                          "text-[11px] truncate",
                          isError ? "text-red-600" : "text-slate-500",
                        )}
                      >
                        {statusText}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isError && !isLocalOnly && (
                      <button
                        type="button"
                        onClick={() => onRetryAttachment?.(att.id)}
                        className="rounded-full px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(att.id)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasUploadingAttachments && (
          <div
            className={clsx(
              "mx-4 text-xs text-slate-500",
              !attachments.length && !selectedJob && onModeChange && "mt-12",
            )}
          >
            Uploads in progress—please wait before sending.
          </div>
        )}
        {hasErroredAttachments && (
          <div
            className={clsx(
              "mx-4 text-xs text-red-600",
              !attachments.length && !selectedJob && onModeChange && "mt-12",
            )}
          >
            Fix or remove failed uploads to continue.
          </div>
        )}

        <div className="relative">
          <textarea
            ref={activeInputRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            className={clsx(
              "min-h-11 w-full resize-none bg-transparent px-4 pb-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50",
              onModeChange && !attachments.length && !selectedJob
                ? "pt-12"
                : "pt-4",
            )}
            rows={1}
            maxLength={MAX_INPUT_LENGTH}
          />
          {showCharCount && (
            <div
              className={clsx(
                "absolute bottom-2 right-4 text-xs pointer-events-none",
                input.length >= MAX_INPUT_LENGTH
                  ? "text-red-500 font-medium"
                  : "text-slate-400",
              )}
            >
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
                            isActive
                              ? "bg-slate-50 text-slate-900"
                              : "text-slate-600",
                            isLocked &&
                              "cursor-not-allowed opacity-60 hover:bg-transparent",
                          )}
                        >
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-slate-400">
                              {model.description}
                            </div>
                          </div>
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-slate-400" />
                          ) : (
                            isActive && (
                              <Check className="h-4 w-4 text-[#006dff]" />
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Low and Search buttons hidden - to be implemented later */}

            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              accept="image/png,image/jpeg,image/webp,.doc,.docx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,application/pdf"
              onChange={(e) => {
                onFileSelect(e.target.files);
                if (e.target.value) {
                  e.target.value = "";
                }
              }}
              data-testid="chat-attachment-input"
            />

            {/* Resume upload/toggle - pill-shaped button */}
            <ResumeToggle onToggleChange={onResumeToggleChange} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={sendDisabled}
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                hasPayload && !sendDisabled
                  ? "text-white hover:opacity-90 shadow-sm"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed",
              )}
              style={
                hasPayload && !sendDisabled
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </form>

      {primaryError && (
        <p className="mt-2 text-center text-xs text-red-500">{primaryError}</p>
      )}

      <div className="mt-2 px-1 text-center">
        <span className="text-[11px] text-slate-400">
          AI can make mistakes. Please double check responses.
        </span>
      </div>
    </div>
  );
}
