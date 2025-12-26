/**
 * Chat Page Client Orchestrator
 *
 * Top-level client component that manages the entire chat session state.
 * Responsibilities:
 * - Session Management: Bootstrapping, loading history, new chat creation
 * - Persistence: Saving messages, conversations, and usage stats to IndexedDB
 * - AI Integration: Hooking into `useChat` from Vercel AI SDK
 * - Tool Handling: Intercepting tool results (documents, jobs) for storage
 * - Telemetry & Analytics: Logging upload failures and usage events
 *
 * This component coordinates the Sidebar, MessageList, Composer, and CanvasPanel.
 *
 * @module components/chat/ChatPageClient
 * @see {@link ../../lib/chat/storage.ts} for persistence logic
 */

"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import clsx from "clsx";
import { Loader2, Menu, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { CanvasPanel } from "@/components/canvas/CanvasPanel";
import { ChatComposer, type ChatMode } from "@/components/chat/ChatComposer";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { logAttachmentFailure } from "@/lib/analytics/attachments";
import {
  type CanvasDocument,
  DOCUMENT_TOOL_NAME,
  isGeneratedDocument,
} from "@/lib/canvas/documents";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_ATTACHMENT_FILE_SIZE,
} from "@/lib/chat/attachments";
// Resume skill mapping temporarily disabled for redesign
import {
  DEFAULT_CHAT_MODEL_ID,
  FOLLOWUP_TOOL_NAME,
} from "@/lib/chat/constants";
import {
  type AgentRole,
  type StoredAttachment,
  type StoredConversation,
  type StoredMessage,
  type StoredToolInvocation,
  deleteConversation,
  generateId,
  getConversation,
  getLatestConversation,
  getMessages,
  getStoredUsageSnapshot,
  listConversations,
  saveMessage,
  updateConversationMeta,
  upsertConversation,
} from "@/lib/chat/storage";
import type { ToolAwareMessage, ToolInvocationState } from "@/lib/chat/tooling";
import type {
  AttachmentPreview,
  ChatSuggestion,
  UsageSnapshot,
} from "@/lib/chat/types";
import type { Job } from "@/lib/jobs/types";
import { parseResumeFile } from "@/lib/resume/parser";
import {
  canUpload,
  getProfile,
  isContextEnabled,
  recordUpload,
  saveProfile,
  setContextEnabled,
} from "@/lib/resume/storage";

const ATTACHMENTS_DISABLED =
  process.env.NEXT_PUBLIC_ATTACHMENTS_DISABLED === "true";
const DEFAULT_UPLOADS_DISABLED_MESSAGE =
  "File uploads are temporarily unavailable";
// Allows hiding post-response suggestion pills without breaking starter prompts.
const SUGGESTIONS_DISABLED =
  process.env.NEXT_PUBLIC_CHAT_SUGGESTIONS_DISABLED === "true";

/**
 * Convert AI SDK message role to storage role.
 * Maps 'assistant' to the current agent mode (jay/navigator).
 */
function convertRole(
  role: "user" | "assistant" | "system",
  agentMode: AgentRole,
): "user" | AgentRole | "system" {
  if (role === "assistant") {
    return agentMode;
  }
  return role;
}

type SessionState = {
  conversation: StoredConversation;
  messages: StoredMessage[];
  usage: UsageSnapshot;
};

type ChatPageClientProps = {
  /** Conversation ID from URL. If new, creates conversation with this ID. */
  conversationId?: string;
  /** Optional seed message to auto-send on first load */
  initialMessage?: string;
};

/**
 * Main client component for the chat page.
 * Handles the initialization of the chat session, loading history, and managing the active conversation.
 */
export function ChatPageClient({
  conversationId,
  initialMessage,
}: ChatPageClientProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const updateUrlShallow = useCallback(
    (path: string) => {
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState(null, "", path);
      } else {
        router.replace(path, { scroll: false });
      }
    },
    [router],
  );
  const [session, setSession] = useState<SessionState | null>(null);
  const [history, setHistory] = useState<StoredConversation[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Refreshes the list of conversations from local storage.
   */
  const refreshHistory = useCallback(async (): Promise<
    StoredConversation[]
  > => {
    const conversations = await listConversations(20);
    setHistory(conversations);
    return conversations;
  }, []);

  /**
   * Loads usage statistics from client-side IndexedDB.
   * Replaces the server API call for rate limiting.
   */
  const loadUsage = useCallback(async (_conversationId?: string) => {
    // Import dynamically to avoid SSR issues
    const { getClientUsageSnapshot } = await import(
      "@/lib/chat/clientRateLimiter"
    );
    const data = await getClientUsageSnapshot();
    console.log("[ChatPageClient] Loaded client usage:", data);
    return data;
  }, []);

  /**
   * Bootstraps the chat session by loading the latest conversation or creating a new one.
   */
  const updateUsageForConversation = useCallback(
    (conversationId: string, usage: UsageSnapshot) => {
      setSession((prev) => {
        if (!prev || prev.conversation.id !== conversationId) {
          return prev;
        }
        return { ...prev, usage };
      });
    },
    [],
  );

  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);

    let conversation: StoredConversation;

    if (conversationId) {
      // Try to load existing conversation from URL
      const existing = await getConversation(conversationId);
      if (existing) {
        conversation = existing;
      } else {
        // Create new conversation with ID from URL
        conversation = await createEmptyConversation({
          modelId: DEFAULT_CHAT_MODEL_ID,
          agentMode: "jay",
          persist: true,
          id: conversationId,
        });
      }
    } else {
      // Fallback: load latest or create new
      const latest = await getLatestConversation();
      conversation =
        latest ??
        (await createEmptyConversation({
          modelId: DEFAULT_CHAT_MODEL_ID,
          persist: false,
        }));
    }

    const [messages, cachedUsage] = await Promise.all([
      getMessages(conversation.id),
      getStoredUsageSnapshot(conversation.id),
    ]);

    if (!cachedUsage) {
      const usage = await loadUsage(conversation.id);
      setSession({ conversation, messages, usage });
    } else {
      setSession({ conversation, messages, usage: cachedUsage });
      void loadUsage(conversation.id)
        .then((fresh) => updateUsageForConversation(conversation.id, fresh))
        .catch((err) =>
          console.error("[ChatPageClient] Failed to refresh usage", err),
        );
    }

    await refreshHistory();
    setIsBootstrapping(false);
  }, [conversationId, loadUsage, refreshHistory, updateUsageForConversation]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await bootstrap();
      } catch (err) {
        if (!cancelled && err instanceof Error) {
          setError(err.message);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  const handleSelectConversation = useCallback(
    async (targetConversationId: string) => {
      if (
        !targetConversationId ||
        targetConversationId === session?.conversation.id
      )
        return;
      const conversation = await getConversation(targetConversationId);
      if (!conversation) return;
      const messages = await getMessages(targetConversationId);
      const cachedUsage = await getStoredUsageSnapshot(targetConversationId);

      if (!cachedUsage) {
        const usage = await loadUsage(targetConversationId);
        setSession({ conversation, messages, usage });
      } else {
        setSession({ conversation, messages, usage: cachedUsage });
        void loadUsage(targetConversationId)
          .then((fresh) =>
            updateUsageForConversation(targetConversationId, fresh),
          )
          .catch((err) =>
            console.error("[ChatPageClient] Failed to refresh usage", err),
          );
      }

      // Update URL to reflect selected conversation
      updateUrlShallow(`/chat/${targetConversationId}`);
      setIsMobileSidebarOpen(false);
    },
    [
      loadUsage,
      session?.conversation.id,
      updateUrlShallow,
      updateUsageForConversation,
    ],
  );

  const startBlankConversation = useCallback(
    async (modelId: string = DEFAULT_CHAT_MODEL_ID) => {
      const newId = generateId();
      const conversation = await createEmptyConversation({
        modelId,
        id: newId,
        persist: false,
      });
      const usage = await loadUsage(conversation.id);
      setSession({ conversation, messages: [], usage });

      // Update URL to new chat
      updateUrlShallow(`/chat/${conversation.id}`);

      return conversation;
    },
    [loadUsage, updateUrlShallow],
  );

  const handleNewChat = useCallback(async () => {
    await startBlankConversation(DEFAULT_CHAT_MODEL_ID);
  }, [startBlankConversation]);

  const handleConversationUpdate = useCallback(
    async (updated: StoredConversation) => {
      setSession((prev) => (prev ? { ...prev, conversation: updated } : prev));
      await refreshHistory();
    },
    [refreshHistory],
  );

  const handleTitleStream = useCallback(
    (conversationId: string, newTitle: string) => {
      setSession((prev) => {
        if (!prev || prev.conversation.id !== conversationId) {
          return prev;
        }
        return {
          ...prev,
          conversation: { ...prev.conversation, title: newTitle },
        };
      });
      setHistory((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title: newTitle }
            : conversation,
        ),
      );
    },
    [],
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      await deleteConversation(conversationId);
      const conversations = await refreshHistory();
      if (session?.conversation.id !== conversationId) {
        return;
      }
      if (conversations && conversations.length > 0) {
        const nextConversation = conversations[0];
        const messages = await getMessages(nextConversation.id);
        const cachedUsage = await getStoredUsageSnapshot(nextConversation.id);
        if (!cachedUsage) {
          const usage = await loadUsage(nextConversation.id);
          setSession({ conversation: nextConversation, messages, usage });
        } else {
          setSession({
            conversation: nextConversation,
            messages,
            usage: cachedUsage,
          });
          void loadUsage(nextConversation.id)
            .then((fresh) =>
              updateUsageForConversation(nextConversation.id, fresh),
            )
            .catch((err) =>
              console.error("[ChatPageClient] Failed to refresh usage", err),
            );
        }
      } else {
        await startBlankConversation(DEFAULT_CHAT_MODEL_ID);
      }
    },
    [
      loadUsage,
      refreshHistory,
      session?.conversation.id,
      startBlankConversation,
      updateUsageForConversation,
    ],
  );

  if (isBootstrapping || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white px-6 text-slate-800">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-11 w-11 rounded-full border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-800">Loading chat…</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Restoring your conversations and context.
            </p>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2.5 py-1 mt-1">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white max-w-[100vw]">
      <div className="hidden h-full md:flex">
        <ChatSidebar
          usage={session.usage}
          conversations={history}
          activeConversationId={session.conversation.id}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Mobile Sidebar with smooth animation */}
      <div
        className={clsx(
          "fixed inset-0 z-40 md:hidden transition-opacity duration-300",
          isMobileSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        {/* Sidebar panel with slide animation */}
        <div
          className={clsx(
            "absolute inset-y-0 left-0 w-[min(85vw,320px)] shadow-2xl transition-transform duration-300 ease-out",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <ChatSidebar
            usage={session.usage}
            conversations={history}
            activeConversationId={session.conversation.id}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            variant="mobile"
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <ChatWorkspace
          session={session}
          onUsageChange={(usage) =>
            setSession((prev) => (prev ? { ...prev, usage } : prev))
          }
          onConversationUpdate={handleConversationUpdate}
          onTitleStream={handleTitleStream}
          loadUsage={loadUsage}
          refreshHistory={refreshHistory}
          onNewChat={handleNewChat}
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          onDeleteConversation={() =>
            handleDeleteConversation(session.conversation.id)
          }
          initialMessage={initialMessage}
        />
      </div>
    </div>
  );
}

type ChatWorkspaceProps = {
  session: SessionState;
  className?: string;
  onUsageChange: (usage: UsageSnapshot) => void;
  onConversationUpdate: (conversation: StoredConversation) => void;
  onTitleStream: (conversationId: string, newTitle: string) => void;
  loadUsage: (conversationId?: string) => Promise<UsageSnapshot>;
  refreshHistory: () => Promise<StoredConversation[]>;
  onNewChat: () => void;
  onOpenSidebar: () => void;
  onDeleteConversation: () => void;
  initialMessage?: string;
};

type UIPart = NonNullable<UIMessage["parts"]>[number];
// Captures the outbound payload so we can replay it if the request fails.
type PendingRequest = {
  message: ToolAwareMessage;
  body: {
    conversationId: string;
    modelId: string;
    mode: "jay" | "navigator";
    isSearchEnabled: boolean;
    attachments: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      url?: string;
    }>;
    isNewConversation: boolean;
    // Resume context injection (Phase 5) - sent when toggle is ON in Navigator mode
    resumeContext?: {
      name?: string | null;
      skills: string[];
      summary?: string | null;
      experience?: Array<{ title: string; company: string }>;
    } | null;
  };
};

/**
 * Component responsible for the active chat interface.
 * Manages the message list, composer, and canvas panel.
 */
function ChatWorkspace({
  session,
  className,
  onUsageChange,
  onConversationUpdate,
  onTitleStream,
  loadUsage,
  refreshHistory,
  onNewChat,
  onOpenSidebar,
  onDeleteConversation,
  initialMessage,
}: ChatWorkspaceProps) {
  const [modelId, setModelId] = useState(
    session.conversation.modelId || DEFAULT_CHAT_MODEL_ID,
  );

  // Mode state with sessionStorage persistence
  const [mode, setMode] = useState<ChatMode>(() => {
    if (typeof window === "undefined") return "jay";
    const saved = sessionStorage.getItem("sn-chat-mode");
    return (saved === "navigator" ? "navigator" : "jay") as ChatMode;
  });
  const modeRef = useRef<ChatMode>(
    typeof window === "undefined"
      ? "jay"
      : ((sessionStorage.getItem("sn-chat-mode") === "navigator"
          ? "navigator"
          : "jay") as ChatMode),
  );

  // Persist mode changes to sessionStorage
  const handleModeChange = useCallback((newMode: ChatMode) => {
    setMode(newMode);
    modeRef.current = newMode;
    sessionStorage.setItem("sn-chat-mode", newMode);
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const isSearchEnabled = false;
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [autoSwitchMessage, setAutoSwitchMessage] = useState<string | null>(
    null,
  );
  const [uploadsDisabledMessage, setUploadsDisabledMessage] = useState<
    string | null
  >(ATTACHMENTS_DISABLED ? DEFAULT_UPLOADS_DISABLED_MESSAGE : null);
  const [suggestionsByMessage, setSuggestionsByMessage] = useState<
    Record<string, ChatSuggestion[]>
  >({});

  // Resume context for Navigator mode (Phase 5)
  // Stores the profile data to send with chat requests when toggle is ON
  const resumeContextRef =
    useRef<PendingRequest["body"]["resumeContext"]>(null);

  const refreshResumeContext = useCallback(async () => {
    const enabled = await isContextEnabled();
    if (!enabled) {
      resumeContextRef.current = null;
      return;
    }
    const profile = await getProfile();
    if (!profile) {
      resumeContextRef.current = null;
      return;
    }
    resumeContextRef.current = {
      name: profile.name,
      skills: profile.skills,
      summary: profile.summary,
      experience: profile.experience?.map((e) => ({
        title: e.title,
        company: e.company,
      })),
    };
  }, []);

  // Load resume context when in Navigator mode and context is enabled
  // Also refresh periodically to catch new uploads
  useEffect(() => {
    const loadResumeContext = async () => {
      // Load resume context for BOTH modes when toggle is ON
      // This allows Jay to use resume info when creating resumes/documents
      await refreshResumeContext();
    };

    loadResumeContext();

    // Poll every 3 seconds to catch new uploads (mirrors ResumeToggle behavior)
    const interval = setInterval(loadResumeContext, 3000);
    return () => clearInterval(interval);
  }, [refreshResumeContext]);

  useEffect(() => {
    if (!SUGGESTIONS_DISABLED) {
      return;
    }
    setSuggestionsByMessage({});
  }, []);

  // Heuristic agent classifier to avoid extra LLM calls while picking the best-fit agent.
  const classifyAgentMode = useCallback(
    (
      text: string,
      options?: { hasJobContext?: boolean },
    ): { mode: ChatMode; reason: string } => {
      const normalized = text.toLowerCase();

      // Navigator signals: job search, openings, mapping skills to roles, career planning.
      const navigatorSignals = [
        /\b(job|opening|vacancy|position|role)s?\b/,
        /\b(find|search|show|get|list|looking for)\b/,
        /\bcareer (plan|path|options|opportunities)\b/,
        /\bskills? (to|for) (role|job|position)\b/,
        /\bmap(ping)? skills\b/,
        /\bwhich role\b/,
        /\bwhat jobs\b/,
        /\bmatch (my )?skills\b/,
      ];

      // Jay signals: resume/cover letter authoring, rewrites, coaching tone.
      const jaySignals = [
        /\bresume\b/,
        /\bcover letter\b/,
        /\bdraft|rewrite|rephrase|polish|improve\b/,
        /\bbullet points?\b/,
        /\bsummary\b/,
        /\bmock interview\b/,
        /\bcoach|coaching|encourage|motivate\b/,
      ];

      if (options?.hasJobContext) {
        return { mode: "navigator", reason: "job context attached" };
      }

      if (navigatorSignals.some((re) => re.test(normalized))) {
        return { mode: "navigator", reason: "job/career search intent" };
      }
      if (jaySignals.some((re) => re.test(normalized))) {
        return { mode: "jay", reason: "resume/coach intent" };
      }

      // Default to Jay for general conversation.
      return { mode: "jay", reason: "default" };
    },
    [],
  );
  const attachmentFilesRef = useRef<Map<string, File>>(new Map());
  const hasUploadingAttachments = attachments.some(
    (attachment) => attachment.status === "uploading",
  );
  const hasErroredAttachments = attachments.some(
    (attachment) => attachment.status === "error",
  );
  const [input, setInput] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // True when the last request failed and the user can retry it inline.
  const [retryAvailable, setRetryAvailable] = useState(false);
  const hasStartedRef = useRef(session.conversation.messageCount > 0);
  const initialMessageSentRef = useRef(false);

  // Keep the "is new conversation" flag in sync when the active conversation changes so rate limits stay accurate.
  // biome-ignore lint/correctness/useExhaustiveDependencies: session.conversation properties are sufficient
  useEffect(() => {
    hasStartedRef.current = session.conversation.messageCount > 0;
  }, [session.conversation.id, session.conversation.messageCount]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track persisted snapshots to avoid unnecessary writes to storage
  const persistedMessageSnapshots = useRef(
    new Map(
      session.messages.map((message) => [
        message.id,
        buildStoredMessageSnapshot(message),
      ]),
    ),
  );

  const initialMessages = useMemo<ToolAwareMessage[]>(
    () =>
      session.messages.map(
        convertStoredMessageToUIMessage,
      ) as ToolAwareMessage[],
    [session.messages],
  );

  const readyAttachments = attachments.filter(
    (attachment) =>
      attachment.status === "ready" &&
      typeof attachment.url === "string" &&
      !attachment.isLocalOnly,
  );

  const uploadAttachment = useCallback(
    async (file: File, attachmentId: string) => {
      attachmentFilesRef.current.set(attachmentId, file);
      const formData = new FormData();
      formData.append("file", file);
      let lastServerCode: string | undefined;
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload) {
          const serverMessage =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Upload failed";
          const serverCode =
            payload &&
            typeof payload === "object" &&
            "code" in payload &&
            typeof payload.code === "string"
              ? payload.code
              : undefined;

          lastServerCode = serverCode;
          const isConfigError =
            serverCode === "blob_token_missing" ||
            serverCode === "uploads_disabled";

          if (isConfigError) {
            setUploadsDisabledMessage(
              serverMessage || DEFAULT_UPLOADS_DISABLED_MESSAGE,
            );
          }

          logAttachmentFailure({
            attachmentId,
            mimeType: file.type,
            size: file.size,
            message: serverMessage || "Upload failed",
            source: "upload_error",
            errorCode: serverCode,
            conversationId: session.conversation.id,
          });

          throw new Error(serverMessage || "Upload failed");
        }

        const data = payload as {
          url?: string;
          name?: string;
          size?: number;
          type?: string;
        };
        if (!data.url) {
          throw new Error("Upload response missing file URL");
        }
        attachmentFilesRef.current.delete(attachmentId);
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === attachmentId
              ? { ...item, url: data.url, status: "ready" }
              : item,
          ),
        );
      } catch (uploadError) {
        const uploadMessage =
          uploadError instanceof Error ? uploadError.message : "Upload failed";
        const isConfigError =
          lastServerCode === "blob_token_missing" ||
          lastServerCode === "uploads_disabled";
        const errorCode = lastServerCode;
        const attachmentError = isConfigError ? undefined : uploadMessage;
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === attachmentId
              ? { ...item, status: "error", error: attachmentError }
              : item,
          ),
        );
        if (isConfigError) {
          setComposerError(null);
        } else {
          setComposerError(uploadMessage);
        }
        logAttachmentFailure({
          attachmentId,
          mimeType: file.type,
          size: file.size,
          message: uploadMessage,
          source: "upload_error",
          errorCode,
          conversationId: session.conversation.id,
        });
      } finally {
        lastServerCode = undefined;
      }
    },
    [session.conversation.id],
  );

  // Holds the most recent outbound request until it succeeds.
  const lastRequestRef = useRef<PendingRequest | null>(null);

  // Keep a ref to the current session to avoid stale closures in callbacks
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const ensureConversationPersisted = useCallback(async () => {
    if (!session) {
      return;
    }
    const existing = await getConversation(session.conversation.id);
    if (existing) {
      return;
    }

    // Check rate limit before creating new conversation
    const { canStartConversation } = await import(
      "@/lib/chat/clientRateLimiter"
    );
    const check = await canStartConversation();
    if (!check.allowed) {
      throw new Error("Global message limit reached. Please try again later.");
    }

    await upsertConversation(session.conversation);
    // Note: We no longer record conversations against a limit.
    // Limits are now on messages (global).

    await refreshHistory();

    // Refresh usage after recording new conversation
    const freshUsage = await loadUsage(session.conversation.id);
    onUsageChange(freshUsage);
  }, [session, refreshHistory, loadUsage, onUsageChange]);

  const messagesRef = useRef<ToolAwareMessage[]>([]);

  const generateTitle = useCallback(
    async (messageContent: string, modelId: string) => {
      try {
        const res = await fetch("/api/chat/title", {
          method: "POST",
          body: JSON.stringify({ message: messageContent, modelId }),
        });
        if (!res.ok) return deriveTitle(messageContent);
        const data = await res.json();
        return data.title as string;
      } catch (error) {
        console.error("Failed to generate title:", error);
        return deriveTitle(messageContent);
      }
    },
    [],
  );

  // Persist messages only after the assistant responds successfully.
  const handleFinish = useCallback(
    async (completedMessage?: ToolAwareMessage) => {
      let currentMessages = messagesRef.current;

      // Ensure we have the latest content for the completed message
      if (completedMessage) {
        const last = currentMessages[currentMessages.length - 1];
        if (last && last.id === completedMessage.id) {
          // Replace with the authoritative completed message
          currentMessages = [...currentMessages.slice(0, -1), completedMessage];
        } else if (last && last.role === "user") {
          // If the ref hasn't updated yet to include the assistant message
          currentMessages = [...currentMessages, completedMessage];
        }
      }

      const candidates = currentMessages.filter((message) =>
        isSupportedRole(message.role),
      );

      // Identify messages that need to be saved (changed content or new documents)
      const pendingSaves = candidates
        .map((message) => {
          const normalizedContent = getTextContent(message);
          const documents = extractDocumentsFromMessage(message);
          const toolInvocations = message.toolInvocations?.map(
            (inv): StoredToolInvocation => ({
              state: inv.state,
              toolCallId: inv.toolCallId,
              toolName: inv.toolName,
              args: inv.args,
              result: inv.result,
            }),
          );
          const clonedParts = message.parts
            ? cloneParts(message.parts)
            : undefined;
          const attachmentsForStorage =
            extractAttachmentsFromMessageParts(message);
          const snapshot = buildPersistenceSnapshot({
            content: normalizedContent,
            documents,
            toolInvocations: toolInvocations ?? [],
            parts: clonedParts,
            attachments: attachmentsForStorage,
          });
          return {
            message,
            content: normalizedContent,
            documents,
            toolInvocations,
            parts: clonedParts,
            attachments: attachmentsForStorage,
            snapshot,
          };
        })
        .filter(
          ({ content, documents, toolInvocations, parts, attachments }) => {
            const hasTools = toolInvocations && toolInvocations.length > 0;
            const hasParts = parts && parts.length > 0;
            const hasAttachments = attachments && attachments.length > 0;
            return (
              content.length > 0 ||
              documents.length > 0 ||
              hasTools ||
              hasParts ||
              hasAttachments
            );
          },
        )
        .filter(
          ({ message, snapshot }) =>
            persistedMessageSnapshots.current.get(message.id) !== snapshot,
        );

      if (!pendingSaves.length) {
        return;
      }

      await ensureConversationPersisted();
      let titleUpdated = false;

      for (const {
        message,
        content,
        documents,
        toolInvocations,
        parts,
        attachments,
        snapshot,
      } of pendingSaves) {
        await saveMessage({
          id: message.id,
          conversationId: session.conversation.id,
          role: convertRole(message.role, modeRef.current),
          content,
          documents: documents.length
            ? documents.map(cloneDocument)
            : undefined,
          toolInvocations,
          parts,
          attachments: attachments.length ? attachments : undefined,
          createdAt: new Date().toISOString(),
          // Persist the current agent mode in metadata so styling is preserved
          data: { ...(message.data ?? {}), agent: mode },
        });
        persistedMessageSnapshots.current.set(message.id, snapshot);

        // Update conversation title based on the first user message
        // Use sessionRef to check the latest title state, avoiding stale closures
        const currentTitle = sessionRef.current.conversation.title;
        if (!titleUpdated && message.role === "user" && !currentTitle) {
          const aiTitle = await generateTitle(
            content,
            session.conversation.modelId,
          );
          const conversationId = session.conversation.id;

          // Animate the title update
          let animatedTitle = "";
          for (let i = 0; i < aiTitle.length; i++) {
            animatedTitle += aiTitle[i];
            onTitleStream(conversationId, animatedTitle);
            await new Promise((resolve) => setTimeout(resolve, 30));
          }

          const updatedConversation: StoredConversation = {
            ...session.conversation,
            title: aiTitle,
          };
          await updateConversationMeta(session.conversation.id, {
            title: updatedConversation.title,
          });
          onConversationUpdate(updatedConversation);
          titleUpdated = true;
        }
      }
    },
    [
      ensureConversationPersisted,
      onConversationUpdate,
      onTitleStream,
      session.conversation,
      generateTitle,
      mode,
    ],
  );

  // Initialize the AI SDK chat hook
  const { messages, sendMessage, status, setMessages } =
    useChat<ToolAwareMessage>({
      id: session.conversation.id,
      messages: initialMessages,
      onError: (error) => {
        // Detect rate limit or empty response errors and show friendly messages
        const errorMessage = error.message || "";
        let userMessage = errorMessage;

        if (
          errorMessage.includes("rate limit") ||
          errorMessage.includes("Rate limit")
        ) {
          userMessage =
            "The AI is currently busy. Please wait a moment and try again.";
        } else if (
          errorMessage.includes("must contain either output text or tool calls")
        ) {
          userMessage =
            "The AI couldn't respond. Please wait a few seconds and try again.";
        } else if (
          errorMessage.includes("429") ||
          errorMessage.includes("too many requests")
        ) {
          userMessage = "Too many requests. Please slow down and try again.";
        }

        console.warn("🔴 Chat error:", errorMessage.slice(0, 100));
        setComposerError(userMessage);
        // Always enable retry when an error occurs - don't check lastRequestRef
        // because streaming errors happen after sendMessage resolves
        setRetryAvailable(true);
      },
      onFinish: async ({ message }) => {
        // Determine if the assistant produced *any meaningful output*.
        // NOTE: Our zero-LLM bypass + AI SDK streaming can emit tool results without text.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msgAny = message as any;
        const hasContent =
          (!!message &&
            (typeof msgAny?.content === "string"
              ? msgAny.content.trim().length > 0
              : false)) ||
          message?.parts?.some((part) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = part as any;

            // Text part
            if (
              p.type === "text" &&
              typeof p.text === "string" &&
              p.text.trim().length > 0
            ) {
              return true;
            }

            // Any tool-related part should count as content.
            // Different AI SDK versions / adapters can encode these slightly differently.
            if (
              p.type === "tool-invocation" ||
              p.type === "tool-result" ||
              (typeof p.type === "string" && p.type.startsWith("tool-")) ||
              p.toolCallId ||
              p.toolName ||
              p.result
            ) {
              return true;
            }

            return false;
          }) ||
          // Fallback: if there's a tool invocation array, it's content.
          (Array.isArray(msgAny?.toolInvocations) &&
            msgAny.toolInvocations.length > 0);

        if (hasContent) {
          // Record the user's message against the client-side rate limiter
          // (decrement messagesLeft + update lastMessageAt)
          try {
            const { recordMessage } = await import(
              "@/lib/chat/clientRateLimiter"
            );
            await recordMessage();
          } catch (err) {
            console.error("[ChatWorkspace] failed to record message", err);
          }

          // Only clear pending request on successful completion with actual content
          lastRequestRef.current = null;
          setRetryAvailable(false);
        } else {
          // Message is empty or has no content - keep retry available
          console.warn(
            "⚠️ Chat finished but message is empty - keeping retry available",
          );

          // Dev-only telemetry to help us see what the UI is receiving.
          if (process.env.NODE_ENV !== "production") {
            try {
              const partTypes = (message?.parts ?? []).map((part) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const p = part as any;
                return p?.type ?? "<no-type>";
              });
              console.log("[ChatWorkspace] empty message debug", {
                id: message?.id,
                role: message?.role,
                content: msgAny?.content,
                partTypes,
                parts: message?.parts,
              });
            } catch {
              // ignore
            }
          }

          // Do NOT delete the assistant message automatically.
          // If tool payloads are present but our detection missed them, deletion causes a false "Retry" loop.

          setRetryAvailable(true);
          setComposerError(
            "The AI couldn't generate a response. Please try again.",
          );
        }

        hasStartedRef.current = true;
        setAttachments([]);

        // Only save conversation and fetch suggestions if we got actual content
        if (message && hasContent) {
          const snapshot = messagesRef.current;
          const prev =
            snapshot.length >= 2 ? snapshot[snapshot.length - 2] : undefined;
          void fetchSuggestions(message, prev);

          // Refresh usage and save message ONLY on success
          const usagePromise = loadUsage(session.conversation.id)
            .then(onUsageChange)
            .catch((err) =>
              console.error(
                "[ChatWorkspace] failed to refresh usage on finish",
                err,
              ),
            );
          await Promise.all([usagePromise, handleFinish(message)]);
        } else {
          // On failure, just refresh usage to see current state (nothing was incremented server-side)
          loadUsage(session.conversation.id)
            .then(onUsageChange)
            .catch((err) =>
              console.error(
                "[ChatWorkspace] failed to refresh usage on error",
                err,
              ),
            );
        }
      },
    });

  // Sync messages when conversation changes (for smooth switching without remount)
  const conversationIdRef = useRef(session.conversation.id);
  useEffect(() => {
    if (conversationIdRef.current !== session.conversation.id) {
      // Conversation changed - update messages immediately
      setMessages(initialMessages);
      conversationIdRef.current = session.conversation.id;
      // Clear any pending state
      setRetryAvailable(false);
      setComposerError(null);
      lastRequestRef.current = null;
    }
  }, [session.conversation.id, initialMessages, setMessages]);

  const fetchSuggestions = useCallback(
    async (
      assistantMessage: ToolAwareMessage,
      previousMessage?: ToolAwareMessage,
    ) => {
      if (SUGGESTIONS_DISABLED) {
        return;
      }
      if (!assistantMessage || assistantMessage.role !== "assistant") {
        return;
      }

      const hasDocument =
        extractDocumentsFromMessage(assistantMessage).length > 0;
      if (!hasDocument) {
        const inline = extractInlineSuggestions(assistantMessage);
        if (inline.length > 0) {
          console.log(
            "✅ [Suggestions] Using inline suggestions from AI tool call:",
            inline.map((s) => s.text),
          );
          setSuggestionsByMessage((prev) => ({
            ...prev,
            [assistantMessage.id]: inline,
          }));
          return;
        }
      }

      const assistantText = getTextContent(assistantMessage);
      if (!assistantText.trim()) {
        return;
      }

      const lastUserMessage =
        previousMessage && previousMessage.role === "user"
          ? previousMessage
          : findLastUserMessage(messagesRef.current);
      const body = {
        conversationId: session.conversation.id,
        messageId: assistantMessage.id,
        lastUserText: lastUserMessage
          ? getTextContent(lastUserMessage)
          : undefined,
        assistantText,
        modelId,
      };

      try {
        // Log fallback trigger with diagnostic info
        const toolNames =
          assistantMessage.toolInvocations?.map((t) => t.toolName) ?? [];
        const hasFollowupTool = toolNames.includes(FOLLOWUP_TOOL_NAME);
        console.log(
          "⚠️ [Suggestions] Fallback triggered:",
          hasDocument
            ? "Document generated (skipping inline)"
            : !assistantMessage.toolInvocations?.length
              ? "No tool invocations in response"
              : !hasFollowupTool
                ? `AI used tools [${toolNames.join(", ")}] but not ${FOLLOWUP_TOOL_NAME}`
                : `${FOLLOWUP_TOOL_NAME} tool called but returned no suggestions`,
        );

        const res = await fetch("/api/chat/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { suggestions?: ChatSuggestion[] };
        if (!data.suggestions || data.suggestions.length === 0) {
          return;
        }
        setSuggestionsByMessage((prev) => ({
          ...prev,
          [assistantMessage.id]: data.suggestions!,
        }));
      } catch (err) {
        console.warn("[ChatWorkspace] suggestion fetch failed", err);
      }
    },
    [modelId, session.conversation.id],
  );

  useEffect(() => {
    messagesRef.current = messages as ToolAwareMessage[];
  }, [messages]);

  // Stamp the active agent onto assistant messages as soon as they arrive
  // so icon/avatar rendering remains stable even after switching agents.
  useEffect(() => {
    let changed = false;

    const next = (messages as ToolAwareMessage[]).map((msg) => {
      if (msg.role !== "assistant") return msg;

      const agent = (msg.data as { agent?: AgentRole } | undefined)?.agent;
      if (agent === "jay" || agent === "navigator") {
        return msg;
      }

      changed = true;
      return {
        ...msg,
        data: { ...(msg.data ?? {}), agent: mode },
      } as ToolAwareMessage;
    });

    if (changed) {
      setMessages(next);
    }
  }, [messages, mode, setMessages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const deadlines: number[] = [];
    if (session.usage.daily.remaining <= 0 && session.usage.daily.resetAt) {
      deadlines.push(new Date(session.usage.daily.resetAt).getTime());
    }
    if (session.usage.chat.remaining <= 0 && session.usage.chat.resetAt) {
      deadlines.push(new Date(session.usage.chat.resetAt).getTime());
    }
    if (!deadlines.length) {
      return;
    }
    const nextDeadline = Math.min(...deadlines);
    const refresh = () => {
      void loadUsage(session.conversation.id)
        .then(onUsageChange)
        .catch((err) =>
          console.error(
            "[ChatWorkspace] failed to refresh usage after reset",
            err,
          ),
        );
    };
    const delay = nextDeadline - Date.now();
    if (delay <= 0) {
      refresh();
      return;
    }
    const timerId = window.setTimeout(refresh, delay + 1000);
    return () => window.clearTimeout(timerId);
  }, [
    session.usage.daily.remaining,
    session.usage.daily.resetAt,
    session.usage.chat.remaining,
    session.usage.chat.resetAt,
    loadUsage,
    onUsageChange,
    session.conversation.id,
  ]);

  const isLoading = status === "streaming" || status === "submitted";
  const isError = status === "error";

  // Detect error status from useChat and enable retry
  useEffect(() => {
    if (isError) {
      console.warn("🔴 Chat status error detected");
      setRetryAvailable(true);
      setComposerError("Something went wrong. Please try again.");
    }
  }, [isError]);

  // Debug logging for status changes
  useEffect(() => {
    console.log(`📊 Chat status: ${status}`);
  }, [status]);

  const toolAwareMessages = messages as ToolAwareMessage[];

  // Ensure document summaries are present in the message list for display
  const displayMessages = useMemo(
    () => toolAwareMessages.map(ensureDocumentSummaryInMessage),
    [toolAwareMessages],
  );

  // Extract all documents from the message history for the canvas
  const canvasDocuments = useMemo<CanvasDocument[]>(() => {
    const docs = new Map<string, CanvasDocument>();
    for (const message of toolAwareMessages) {
      message.parts?.forEach((part) => {
        const document = extractDocumentFromPart(part);
        if (!document) return;
        const lookupKey = document.toolCallId ?? document.id;
        docs.set(lookupKey, document);
      });
    }
    return Array.from(docs.values());
  }, [toolAwareMessages]);

  const documentLookup = useMemo<
    Partial<Record<string, CanvasDocument>>
  >(() => {
    return canvasDocuments.reduce<Partial<Record<string, CanvasDocument>>>(
      (acc, doc) => {
        if (doc.toolCallId) {
          acc[doc.toolCallId] = doc;
        }
        acc[doc.id] = doc;
        return acc;
      },
      {},
    );
  }, [canvasDocuments]);

  const STORAGE_KEY = `sn-chat-canvas-${session.conversation.id}`;

  // Initialize from storage
  const [isCanvasOpen, setIsCanvasOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored).isOpen : false;
    } catch {
      return false;
    }
  });

  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored).activeDocumentId : null;
      } catch {
        return null;
      }
    },
  );

  // Save to storage
  // biome-ignore lint/correctness/useExhaustiveDependencies: storage key and conversation id are enough
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isOpen: isCanvasOpen,
        activeDocumentId,
      }),
    );
  }, [isCanvasOpen, activeDocumentId, session.conversation.id, STORAGE_KEY]);

  const documentCountRef = useRef(0);
  const lastDocumentIdRef = useRef<string | null>(null);

  // Mobile detection for canvas auto-open behavior
  const isMobileRef = useRef(
    typeof window !== "undefined" && window.innerWidth < 768,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      isMobileRef.current = window.innerWidth < 768;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const docCount = canvasDocuments.length;
    const latest = docCount ? canvasDocuments[docCount - 1] : null;
    const previousCount = documentCountRef.current;
    const previousLatestId = lastDocumentIdRef.current;
    const didCountChange = docCount !== previousCount;
    const didLatestChange = (latest?.id ?? null) !== previousLatestId;

    if (!didCountChange && !didLatestChange) {
      return;
    }

    documentCountRef.current = docCount;
    lastDocumentIdRef.current = latest?.id ?? null;

    if (docCount === 0) {
      setIsCanvasOpen(false);
      setActiveDocumentId(null);
      return;
    }

    // If a new document was added, switch to it
    // Only auto-open on desktop, not on mobile
    if (docCount > previousCount) {
      setActiveDocumentId(latest!.id);
      // Auto-open canvas only on desktop (>= 768px)
      if (!isMobileRef.current) {
        setIsCanvasOpen(true);
      }
      return;
    }

    // Otherwise, maintain current selection if valid, or fallback to latest
    setActiveDocumentId((prev) => {
      if (!prev) {
        return latest!.id;
      }
      const stillExists = canvasDocuments.some((doc) => doc.id === prev);
      return stillExists ? prev : latest!.id;
    });
  }, [canvasDocuments]);

  const activeDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return canvasDocuments.find((doc) => doc.id === activeDocumentId) ?? null;
  }, [canvasDocuments, activeDocumentId]);

  const handleSelectDocument = useCallback((documentId: string) => {
    setActiveDocumentId(documentId);
    setIsCanvasOpen(true);
  }, []);

  const handleSelectJob = useCallback((job: Job) => {
    setSelectedJob(job);
    // Focus the input area if possible, or just let user type
  }, []);

  const handleRemoveJob = useCallback(() => {
    setSelectedJob(null);
  }, []);

  // Track if we're on mobile for responsive workspace styling
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // On desktop, apply padding when canvas is open. On mobile, canvas is fullscreen overlay.
  const workspaceStyle = useMemo<CSSProperties | undefined>(() => {
    if (isCanvasOpen && !isMobileView) {
      return { paddingRight: "min(640px, 50vw)" };
    }
    return undefined;
  }, [isCanvasOpen, isMobileView]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: safe to ignore for this large callback
  const submitMessage = useCallback(
    async (textOverride?: string, extraParts: UIPart[] = []) => {
      if (retryAvailable) {
        const newMessages = [...messages];
        if (
          newMessages.length > 0 &&
          newMessages[newMessages.length - 1].role === "assistant"
        ) {
          newMessages.pop();
        }
        if (
          newMessages.length > 0 &&
          newMessages[newMessages.length - 1].role === "user"
        ) {
          newMessages.pop();
        }
        setMessages(newMessages);
        setRetryAvailable(false);
        lastRequestRef.current = null;
      }

      const rawText = textOverride ?? input;
      const trimmed = rawText.trim();
      const hasText = trimmed.length > 0;
      const currentAttachments = readyAttachments.map(
        ({ id, name, size, type, url }) => ({ id, name, size, type, url }),
      );

      if (hasUploadingAttachments) {
        const message = "Please wait for uploads to finish before sending.";
        setComposerError(message);
        throw new Error(message);
      }

      if (hasErroredAttachments) {
        const message = "Remove or retry attachments that failed to upload.";
        setComposerError(message);
        throw new Error(message);
      }

      // Check global message rate limit
      const { canSendMessage } = await import("@/lib/chat/clientRateLimiter");
      const limitCheck = await canSendMessage();
      if (!limitCheck.allowed) {
        const message =
          limitCheck.reason === "message_limit"
            ? "⏳ Global message limit reached. Please wait for reset."
            : "Global message limit reached.";
        setComposerError(message);
        throw new Error(message);
      }

      if (!hasText && currentAttachments.length === 0 && !selectedJob) {
        return;
      }

      // Auto-select the best agent before sending to avoid wrong-tab UX.
      const { mode: preferredMode, reason: modeReason } = classifyAgentMode(
        trimmed,
        { hasJobContext: Boolean(selectedJob) },
      );
      if (preferredMode !== mode) {
        handleModeChange(preferredMode);
        setAutoSwitchMessage(
          preferredMode === "navigator"
            ? `Switched to Navigator (${modeReason}).`
            : `Switched to Jay (${modeReason}).`,
        );
        // Clear the notice after a short delay
        setTimeout(() => setAutoSwitchMessage(null), 4000);
      }

      // Clear the composer immediately so the user sees the message was sent,
      // and keep the cursor ready for the next prompt.
      setInput("");
      requestAnimationFrame(() => {
        chatInputRef.current?.focus();
      });

      const parts: UIPart[] = extraParts.length ? [...extraParts] : [];

      if (hasText) {
        parts.push({ type: "text", text: trimmed } as UIPart);
      }

      if (selectedJob) {
        parts.push({
          type: "job_context",
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
        } as unknown as UIPart);
      }

      await sendMessage(
        { role: "user", content: trimmed, parts } as unknown as UIMessage,
        {
          body: {
            conversationId: session.conversation.id,
            modelId,
            mode: modeRef.current,
            isSearchEnabled,
            attachments: currentAttachments,
            isNewConversation: !hasStartedRef.current,
            resumeContext: resumeContextRef.current,
          },
        },
      );
    },
    [
      input,
      retryAvailable,
      messages,
      readyAttachments,
      hasUploadingAttachments,
      hasErroredAttachments,
      selectedJob,
      sendMessage,
    ],
  );

  // Monitor for 'switchAgent' tool calls and update mode
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      !lastMessage ||
      lastMessage.role !== "assistant" ||
      !lastMessage.toolInvocations
    ) {
      return;
    }

    const switchTool = lastMessage.toolInvocations.find(
      (t) => t.toolName === "switchAgent" && t.state === "result",
    );

    if (switchTool?.args) {
      const args = switchTool.args as { mode: "jay" | "navigator" };
      if (args.mode && (args.mode === "jay" || args.mode === "navigator")) {
        // Only switch if we aren't already in that mode
        if (args.mode !== mode) {
          console.log(`🔄 [Auto-Switch] Changing mode to ${args.mode}`);
          handleModeChange(args.mode);
        }
      }
    }
  }, [messages, mode, handleModeChange]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      void submitMessage();
    },
    [submitMessage],
  );

  // Auto-seed a new conversation with the initial message (from homepage CTA)
  useEffect(() => {
    if (!initialMessage || initialMessageSentRef.current) {
      return;
    }

    const trimmed = initialMessage.trim();
    if (!trimmed) {
      return;
    }

    const hasAnyMessages =
      session.conversation.messageCount > 0 || messages.length > 0;
    if (hasAnyMessages) {
      return;
    }

    initialMessageSentRef.current = true;
    setInput(trimmed);
    void submitMessage(trimmed);
  }, [
    initialMessage,
    messages.length,
    session.conversation.messageCount,
    submitMessage,
  ]);

  // Replays the last failed request without forcing the user to retype it.
  const handleRetry = useCallback(async () => {
    console.log(
      "🔄 Retry button clicked. lastRequestRef:",
      lastRequestRef.current,
    );

    if (!lastRequestRef.current) {
      console.warn("⚠️ No pending request to retry - lastRequestRef is null");
      return;
    }

    console.log("🔄 Retrying last request:", {
      messageParts: lastRequestRef.current.message.parts?.length,
      conversationId: lastRequestRef.current.body.conversationId,
    });

    try {
      setRetryAvailable(false);
      setComposerError(null);

      // Don't clear lastRequestRef here - onFinish will handle it
      // If the retry fails, onFinish will detect empty content and re-enable retry
      await sendMessage(lastRequestRef.current.message, {
        body: lastRequestRef.current.body,
      });
      // Success is handled by onFinish which clears lastRequestRef
    } catch (retryError) {
      // This catches synchronous errors only (network errors, etc.)
      // Streaming errors are handled by onFinish
      console.warn(
        "🔴 Retry failed:",
        retryError instanceof Error ? retryError.message : "Unknown error",
      );
      setRetryAvailable(true);
      if (retryError instanceof Error) {
        setComposerError(retryError.message);
      }
    }
  }, [sendMessage]);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      if (uploadsDisabledMessage) {
        logAttachmentFailure({
          message: uploadsDisabledMessage,
          source: "uploads_disabled",
          errorCode: "uploads_disabled",
          conversationId: session.conversation.id,
        });
        return;
      }

      if (attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
        setComposerError(
          `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
        );
        logAttachmentFailure({
          message: "Attachment limit reached",
          source: "client_validation",
          errorCode: "limit_exceeded",
          conversationId: session.conversation.id,
        });
        return;
      }

      const availableSlots = MAX_ATTACHMENTS_PER_MESSAGE - attachments.length;
      const selectedFiles = Array.from(files).slice(0, availableSlots);

      let errorMessage: string | null = null;
      if (selectedFiles.length < files.length) {
        errorMessage = `Only ${availableSlots} attachment${availableSlots === 1 ? "" : "s"} can be added now.`;
      }

      for (const file of selectedFiles) {
        if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
          errorMessage = `"${file.name}" is larger than 5MB.`;
          logAttachmentFailure({
            attachmentId: file.name,
            mimeType: file.type,
            size: file.size,
            message: errorMessage,
            source: "client_validation",
            errorCode: "file_too_large",
            conversationId: session.conversation.id,
          });
          continue;
        }

        // Resume Interception: PDF handling
        // If file is PDF, treat it as a Resume Upload because normal attachments block PDF.
        if (file.type === "application/pdf") {
          // Check limits
          const allowedIdx = await canUpload();
          if (!allowedIdx) {
            errorMessage = "Resume upload limit reached (3/day).";
            setComposerError(errorMessage);
            toast.error("Upload limit reached", {
              description:
                "You can upload up to 3 resumes per day. Try again tomorrow.",
              duration: 4000,
            });
            continue;
          }

          // Create temporary "Extracting" preview
          const rId = generateId();
          const resumePreview: AttachmentPreview = {
            id: rId,
            name: file.name,
            size: file.size,
            type: file.type,
            status: "uploading",
            isLocalOnly: true, // Mark as local so it doesn't try to sync to message history as valid attachment
          };
          // We overload the 'isLocalOnly' status to show "Stored locally (resume)" in UI (see ChatComposer logic)

          setAttachments((prev) => [...prev, resumePreview]);

          // Process Async with toast
          const uploadPromise = (async () => {
            // Parse
            const parsed = await parseResumeFile(file);
            // Extract
            const response = await fetch("/api/resume/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rawText: parsed.text }),
            });

            if (!response.ok) throw new Error("Extraction failed");
            const data = await response.json();
            if (!data.success || !data.profile) throw new Error(data.error);

            // Save
            await saveProfile(data.profile);
            await recordUpload(file.name);
            await setContextEnabled(true);

            // Update the preview to show success
            // We use isLocalOnly=true so it displays "Stored locally (resume)" and Check icon
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === rId
                  ? { ...a, status: "ready" as const, isLocalOnly: true }
                  : a,
              ),
            );

            return data.profile;
          })();

          toast.promise(uploadPromise, {
            loading: "Analyzing your resume...",
            success: (profile) =>
              profile?.name
                ? `Welcome, ${profile.name}! Your profile is ready.`
                : "Resume uploaded successfully!",
            error: "Failed to process resume. Please try again.",
          });

          uploadPromise.catch((err) => {
            console.error("Auto-resume upload failed:", err);
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === rId
                  ? {
                      ...a,
                      status: "error",
                      error: "Resume extraction failed",
                    }
                  : a,
              ),
            );
          });

          continue; // Skip standard attachment upload
        }

        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
          errorMessage = `"${file.name}" type is not supported.`;
          logAttachmentFailure({
            attachmentId: file.name,
            mimeType: file.type,
            size: file.size,
            message: errorMessage,
            source: "client_validation",
            errorCode: "unsupported_type",
            conversationId: session.conversation.id,
          });
          continue;
        }

        const id = generateId();
        const preview: AttachmentPreview = {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "uploading",
        };
        setAttachments((prev) => [...prev, preview]);
        attachmentFilesRef.current.set(id, file);
        void uploadAttachment(file, id);
      }

      setComposerError(errorMessage);
    },
    [
      attachments.length,
      uploadsDisabledMessage,
      session.conversation.id,
      uploadAttachment,
    ],
  );

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    attachmentFilesRef.current.delete(attachmentId);
    setAttachments((prev) =>
      prev.filter((attachment) => attachment.id !== attachmentId),
    );
  }, []);

  const handleRetryAttachment = useCallback(
    (attachmentId: string) => {
      const file = attachmentFilesRef.current.get(attachmentId);
      if (!file) {
        setComposerError(
          "Original file is no longer available. Please reattach it.",
        );
        return;
      }
      setAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId
            ? { ...attachment, status: "uploading", error: undefined }
            : attachment,
        ),
      );
      void uploadAttachment(file, attachmentId);
    },
    [uploadAttachment],
  );

  const isNewConversation = session.conversation.messageCount === 0;
  const dailyLimitReached = session.usage.daily.remaining <= 0;
  const chatLimitReached = session.usage.chat.remaining <= 0;

  // Only block if it's a new conversation AND daily limit is reached, OR if chat limit is reached for this specific chat
  const isLimitReached =
    (isNewConversation && dailyLimitReached) || chatLimitReached;
  const chatDisabled = isLimitReached || isLoading;

  // biome-ignore lint/correctness/useExhaustiveDependencies: safe to ignore for suggestion handler
  const handleSuggestionClick = useCallback(
    async (text: string) => {
      if (chatDisabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const pendingRequest: PendingRequest = {
        message: {
          role: "user",
          parts: [{ type: "text", text: trimmed } as UIPart],
        } as ToolAwareMessage,
        body: {
          conversationId: session.conversation.id,
          modelId,
          mode,
          isSearchEnabled,
          attachments: [],
          isNewConversation: !hasStartedRef.current,
        },
      };

      lastRequestRef.current = pendingRequest;
      setRetryAvailable(false);

      try {
        await sendMessage(pendingRequest.message, {
          body: pendingRequest.body,
        });

        // Record usage and refresh UI
        const { recordMessage } = await import("@/lib/chat/clientRateLimiter");
        await recordMessage();

        // Refresh usage
        const freshUsage = await loadUsage();
        onUsageChange(freshUsage);

        lastRequestRef.current = null;
      } catch (sendError) {
        setRetryAvailable(true);
        if (sendError instanceof Error) {
          setComposerError(sendError.message);
        }
      }
    },
    [
      chatDisabled,
      session.conversation.id,
      modelId,
      isSearchEnabled,
      sendMessage,
      mode,
    ],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll should happen on message/loading change
  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }
    // Keep the newest exchange in view whenever content or streaming status changes.
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [displayMessages, isLoading]);

  return (
    <section
      className={`flex flex-1 flex-col h-full relative chat-area-bg ${className ?? ""}`}
      style={workspaceStyle}
    >
      {/* Mobile Header - only visible on small screens */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 1000 1000"
            width={22}
            height={22}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <g>
              <polygon
                fill="#654E9F"
                points="302,245.7 302.6,251.5 302.4,257.4 418.1,257.1 427.8,251.2 417.7,245.4"
              />
              <polygon
                fill="#654E9F"
                points="490.9,308.2 493.3,367.6 513,367.5 510.6,308.1"
              />
              <path
                fill="#6D28D9"
                d="M497.6,6.3L76,249.9l421.5,243.6l421.5-243.6L497.6,6.3z M550,383c-1,1.3-2.3,2.5-4.1,3.6
                c-1.8,1.1-3.7,1.9-5.8,2.6s-4.5,0.9-7.2,1l-57.7,0.3c-2.7,0-5.2-0.3-7.3-0.9c-2.2-0.6-4.2-1.4-6-2.5c-1.9-1.1-3.3-2.2-4.4-3.5
                c-1.1-1.3-1.6-2.7-1.7-4.4l-3.2-82.5c-0.1-1.6,0.4-3.1,1.4-4.3c1-1.3,2.3-2.5,4.1-3.5c1.8-1.1,3.7-1.9,5.8-2.5s4.5-0.9,7.2-0.9
                l57.5-0.2c2.7,0,5.1,0.3,7.3,0.9c2.2,0.6,4.2,1.4,6,2.5c1.8,1.1,3.3,2.2,4.4,3.5c1.1,1.3,1.6,2.7,1.7,4.3l3.4,82.3
                C551.4,380.2,551,381.7,550,383z M675.7,302.9c-5.2,3.2-11.2,5.7-18.1,7.5c-6.9,1.8-14.1,2.7-21.7,2.7l-1.5-34.1l-37.6,0.1
                l-0.7-16.8l-139.7,0.4l-27.8,17L284,280c-2.7,0-5.3-0.3-7.6-0.8c-2.3-0.5-4.4-1.3-6.2-2.4s-3.3-2.3-4.4-3.7
                c-1.1-1.4-1.6-2.9-1.7-4.5l-1.1-33.9c-0.1-1.6,0.4-3.1,1.4-4.5c1-1.4,2.4-2.7,4.2-3.7c1.8-1.1,3.8-1.9,6.1-2.4
                c2.3-0.5,4.8-0.8,7.5-0.8l144.1-0.2l29.4,17l23,0l-2.6-66l-19.7-11.4l-1.9-48.2l75.9,0.1l2,48.1l-18.7,11.4l2.7,65.9l78.1-0.2
                l-0.8-17.2l37.5-0.1l-38.9-22.5l-0.5-11.2l94.9-0.1l0.5,11.1l-36.7,22.5l37.4-0.1L691,279c0.2,4.5-1,8.8-3.6,12.9
                C684.8,296,680.9,299.7,675.7,302.9z"
              />
              <path
                d="M963.7,324.3L539.2,562.8l3,430.3l424.5-238.5L963.7,324.3z M861.1,731.2l-53.5,25.9l-80.9-133.6l-28.9,186.7L650,833.2
                l39.4-262.5l53.2-27.5l81.2,135.6l32.5-194.3l52.1-26.9L861.1,731.2z"
              />
              <path
                fill="#006DFF"
                d="M32.5,754.7L457,993.1l3-430.3L35.5,324.3L32.5,754.7z M158.6,691.9c22.5,37.5,42.9,60.7,64.5,74
                c31.3,19.3,50.6,14.6,50.6-13.9c0-15.8-7.4-32.7-24.7-47.9l-31.4-27.6c-36.1-31.5-52.4-67.9-52.4-100.3c0-58.9,32.1-80.9,91.4-42.4
                c30,19.5,56.7,50.3,77.7,86.4l-21.6,26c-15.7-26.6-36.2-51.1-55.8-63.7c-28.5-18.4-44.9-12.6-44.9,12.9c0,15.9,8.6,30.1,25.9,45.5
                l31.5,27.9c34.3,30.4,50,69.5,50,101.2c0.1,66.7-38.4,80.2-102,41.4c-32.4-19.7-61.9-53.3-81.7-93.2L158.6,691.9z"
              />
            </g>
          </svg>
          <span className="text-sm font-semibold text-slate-800">
            SportsNaukri
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewChat}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="New chat"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onDeleteConversation}
            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete conversation"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <MessageList
          messages={displayMessages}
          isStreaming={isLoading}
          onSelectDocument={handleSelectDocument}
          documentLookup={documentLookup}
          showRetry={retryAvailable}
          onRetry={handleRetry}
          suggestionsByMessage={
            SUGGESTIONS_DISABLED ? {} : suggestionsByMessage
          }
          onSuggestionSelect={(messageId) =>
            setSuggestionsByMessage((prev) => {
              const next = { ...prev };
              delete next[messageId];
              return next;
            })
          }
          onSuggestionClick={
            SUGGESTIONS_DISABLED ? undefined : handleSuggestionClick
          }
          onStarterClick={handleSuggestionClick}
          isLimitReached={chatDisabled}
          onSelectJob={handleSelectJob}
          mode={mode}
        />
      </div>

      <div className="w-full">
        {autoSwitchMessage && (
          <div className="mx-auto mb-2 max-w-3xl px-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 shadow-sm">
              {autoSwitchMessage}
            </div>
          </div>
        )}
        <ChatComposer
          input={input}
          inputRef={chatInputRef}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={chatDisabled}
          isStreaming={isLoading}
          usage={session.usage}
          attachments={attachments}
          onRemoveAttachment={handleRemoveAttachment}
          onFileSelect={handleFileSelect}
          error={composerError}
          modelId={modelId}
          onModelChange={setModelId}
          isSearchEnabled={isSearchEnabled}
          onNewChat={onNewChat}
          limitReachedReason={
            isNewConversation && dailyLimitReached
              ? "daily"
              : chatLimitReached
                ? "chat"
                : null
          }
          selectedJob={selectedJob}
          onRemoveJob={handleRemoveJob}
          hasUploadingAttachments={hasUploadingAttachments}
          hasErroredAttachments={hasErroredAttachments}
          onRetryAttachment={handleRetryAttachment}
          mode={mode}
          onModeChange={handleModeChange}
          onResumeToggleChange={() => {
            void refreshResumeContext();
          }}
        />
      </div>

      <CanvasPanel
        document={activeDocument}
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
      />
    </section>
  );
}

/**
 * Creates a new empty conversation with a generated ID and title.
 * @param options Configuration options for the new conversation
 * @param options.modelId The ID of the model to use
 * @param options.persist Whether to save the conversation to storage immediately (default: true)
 */
async function createEmptyConversation({
  modelId,
  agentMode = "jay",
  persist = true,
  id,
}: { modelId: string; agentMode?: AgentRole; persist?: boolean; id?: string }) {
  const now = new Date().toISOString();
  const conversation: StoredConversation = {
    id: id ?? generateId(),
    title: "",
    modelId,
    agentMode,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  if (persist) {
    await upsertConversation(conversation);
  }
  return conversation;
}

/**
 * Derives a short title from the message content.
 * Truncates text to 50 characters.
 */
function deriveTitle(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 50) return trimmed;
  return `${trimmed.slice(0, 47)}…`;
}

const DOCUMENT_PART_TYPE = `tool-${DOCUMENT_TOOL_NAME}`;

/**
 * Converts a stored message format to the UI message format required by the AI SDK.
 * Handles reconstruction of file attachments and document tool outputs.
 */
function convertStoredMessageToUIMessage(message: StoredMessage): UIMessage {
  const hasExplicitParts = Boolean(message.parts?.length);
  let parts: UIPart[] = hasExplicitParts
    ? cloneParts(message.parts as UIPart[])
    : [];

  if (!hasExplicitParts) {
    if (message.content) {
      parts.push({ type: "text", text: message.content } as UIPart);
    }
  }

  parts = hydrateAttachmentsIntoParts(parts, message.attachments);

  if (!hasExplicitParts && message.documents?.length) {
    for (const document of message.documents) {
      parts.push({
        type: DOCUMENT_PART_TYPE,
        toolCallId: document.toolCallId ?? document.id,
        state: "output-available",
        output: cloneDocument(document),
      } as UIPart);
    }
  }

  if (!hasExplicitParts && message.toolInvocations?.length) {
    for (const invocation of message.toolInvocations) {
      parts.push({
        type: "tool-invocation",
        toolInvocation: {
          toolCallId: invocation.toolCallId,
          toolName: invocation.toolName,
          args: invocation.args,
          result: invocation.result,
          state: invocation.state,
        },
      } as ToolInvocationPart);
    }
  }

  const storedData = (message.data ?? {}) as Record<string, unknown>;
  const storedAgent = (storedData as { agent?: AgentRole }).agent;
  const persistedAgent =
    storedAgent === "jay" || storedAgent === "navigator"
      ? storedAgent
      : message.role === "jay" || message.role === "navigator"
        ? message.role
        : undefined;

  return {
    id: message.id,
    // Convert agent roles back to 'assistant' for API compatibility
    role:
      message.role === "jay" || message.role === "navigator"
        ? "assistant"
        : message.role,
    // Persist original agent role for styling
    data: persistedAgent
      ? { ...storedData, agent: persistedAgent }
      : storedData,
    parts,
  } as UIMessage;
}

const SUPPORTED_ROLES = new Set<UIMessage["role"]>([
  "user",
  "assistant",
  "system",
]);

/**
 * Checks if a message role is supported by the UI.
 */
function isSupportedRole(
  role: UIMessage["role"],
): role is "user" | "assistant" | "system" {
  return SUPPORTED_ROLES.has(role);
}

const TEXT_PART_TYPES = new Set(["text", "output_text"]);

/**
 * Extracts the plain text content from a UI message.
 * Combines multiple text parts if present.
 */
function getTextContent(message: UIMessage): string {
  const normalized = ensureDocumentSummaryInMessage(message);
  const textParts = (normalized.parts ?? [])
    .filter((part) => TEXT_PART_TYPES.has(part.type))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((part) => (part as any).text)
    .join("")
    .trim();

  if (textParts.length > 0) {
    return textParts;
  }

  if (typeof (message as { content?: string }).content === "string") {
    return (message as { content?: string }).content ?? "";
  }

  return "";
}

type DocumentToolPart = UIPart & {
  type: typeof DOCUMENT_PART_TYPE;
  toolCallId?: string;
  state?: string;
  output?: unknown;
};

type ToolInvocationPart = UIPart & {
  type: "tool-invocation";
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    result?: unknown;
    state: ToolInvocationState;
  };
};

/**
 * Extracts a canvas document from a message part if it exists.
 * Validates that the part is a document tool output.
 */
function extractDocumentFromPart(
  part: UIPart | undefined,
): CanvasDocument | null {
  if (!part || part.type !== DOCUMENT_PART_TYPE) {
    return null;
  }
  const docPart = part as DocumentToolPart;
  if (docPart.state && docPart.state !== "output-available") {
    return null;
  }
  if (!docPart.output || !isGeneratedDocument(docPart.output)) {
    return null;
  }
  const toolCallId = docPart.toolCallId ?? docPart.output.id;
  return {
    ...docPart.output,
    toolCallId,
  };
}

/**
 * Extracts all canvas documents from a message.
 */
function extractDocumentsFromMessage(message: UIMessage): CanvasDocument[] {
  if (!message.parts?.length) {
    return [];
  }
  return message.parts
    .map((part) => extractDocumentFromPart(part))
    .filter((document): document is CanvasDocument => Boolean(document))
    .map((document) => cloneDocument(document));
}

function extractInlineSuggestions(message: ToolAwareMessage): ChatSuggestion[] {
  if (!message.toolInvocations?.length) {
    return [];
  }

  // Find all followup tool calls (for debugging)
  const followupInvocations = message.toolInvocations.filter(
    (invocation) => invocation.toolName === FOLLOWUP_TOOL_NAME,
  );

  if (followupInvocations.length === 0) {
    // AI didn't call the suggestions tool - this is normal, not an error
    return [];
  }

  const record = followupInvocations.find(
    (invocation) => invocation.state === "result" && Boolean(invocation.result),
  );

  if (!record) {
    // Tool was called but hasn't completed or failed
    const states = followupInvocations.map((i) => i.state);
    console.warn(
      `⚠️ [Suggestions] generateFollowups tool called but not completed. States: [${states.join(", ")}]`,
    );
    return [];
  }

  if (!record.result || typeof record.result !== "object") {
    console.warn(
      "⚠️ [Suggestions] generateFollowups returned invalid result:",
      record.result,
    );
    return [];
  }

  const payload = record.result as { suggestions?: unknown };
  const values = Array.isArray(payload.suggestions) ? payload.suggestions : [];

  if (values.length === 0) {
    console.warn(
      "⚠️ [Suggestions] generateFollowups returned empty suggestions array",
    );
  }

  return values
    .map((value, index) => {
      if (typeof value !== "string" || value.trim().length === 0) {
        return null;
      }
      return {
        id: `${message.id}-inline-suggestion-${index}`,
        text: value.trim(),
      } satisfies ChatSuggestion;
    })
    .filter((item): item is ChatSuggestion => Boolean(item));
}

/**
 * Creates a deep copy of a document object.
 */
function cloneDocument(document: CanvasDocument): CanvasDocument {
  return {
    ...document,
    content: document.content.map((section) => ({ ...section })),
  };
}

/**
 * Creates a snapshot string for change detection.
 * Used to determine if a message needs to be persisted.
 */
type SnapshotInput = {
  content: string;
  documents: CanvasDocument[];
  toolInvocations: StoredToolInvocation[];
  parts?: UIPart[];
  attachments?: StoredAttachment[];
};

function buildStoredMessageSnapshot(message: StoredMessage): string {
  return JSON.stringify({
    content: message.content ?? "",
    documents: message.documents ?? [],
    toolInvocations: message.toolInvocations ?? [],
    parts: message.parts ?? null,
    attachments: message.attachments ?? [],
  });
}

function buildPersistenceSnapshot({
  content,
  documents,
  toolInvocations,
  parts,
  attachments,
}: SnapshotInput): string {
  return JSON.stringify({
    content,
    documents,
    toolInvocations,
    parts: parts ?? null,
    attachments: attachments ?? [],
  });
}

function cloneParts(parts: UIPart[]): UIPart[] {
  if (typeof structuredClone === "function") {
    return structuredClone(parts);
  }
  return JSON.parse(JSON.stringify(parts));
}

type FileUIPart = UIPart & {
  type: "file";
  url?: string;
  name?: string;
  mimeType?: string;
  mediaType?: string;
  size?: number;
  attachmentId?: string;
};

function extractAttachmentsFromMessageParts(
  message: UIMessage,
): StoredAttachment[] {
  if (!message.parts?.length) {
    return [];
  }
  const messageId = (message.id ?? "message") as string;
  const attachments: StoredAttachment[] = [];
  message.parts.forEach((part, index) => {
    const attachment = convertPartToStoredAttachment(part, index, messageId);
    if (attachment) {
      attachments.push(attachment);
    }
  });
  return attachments;
}

function convertPartToStoredAttachment(
  part: UIPart,
  index: number,
  messageId: string,
): StoredAttachment | null {
  if (part.type !== "file") {
    return null;
  }
  const filePart = part as FileUIPart;
  if (typeof filePart.url !== "string") {
    return null;
  }
  const fallbackId =
    filePart.attachmentId ?? `${messageId}-attachment-${index}`;
  const attachmentName = filePart.name?.length ? filePart.name : "Attachment";
  const attachmentType =
    filePart.mimeType ?? filePart.mediaType ?? "application/octet-stream";
  const attachmentSize = typeof filePart.size === "number" ? filePart.size : 0;
  return {
    id: fallbackId,
    name: attachmentName,
    size: attachmentSize,
    type: attachmentType,
    url: filePart.url,
  };
}

function hydrateAttachmentsIntoParts(
  parts: UIPart[],
  attachments?: StoredAttachment[],
): UIPart[] {
  if (!attachments?.length) {
    return parts;
  }
  const existingUrls = new Set(
    parts
      .filter((part): part is FileUIPart => part.type === "file")
      .map((part) => part.url)
      .filter((url): url is string => Boolean(url)),
  );
  const nextParts = [...parts];
  for (const attachment of attachments) {
    if (!attachment.url || existingUrls.has(attachment.url)) {
      continue;
    }
    nextParts.push({
      type: "file",
      url: attachment.url,
      name: attachment.name,
      mimeType: attachment.type,
      mediaType: attachment.type,
      size: attachment.size,
      attachmentId: attachment.id,
    } as UIPart);
  }
  return nextParts;
}

/**
 * Ensures a message has a text summary if it contains a document.
 * Adds a generated summary if one is missing.
 */
function ensureDocumentSummaryInMessage<T extends UIMessage>(message: T): T {
  const parts = message.parts ?? [];
  const document = parts.reduce<CanvasDocument | null>(
    (acc, part) => acc ?? extractDocumentFromPart(part),
    null,
  );
  if (!document) {
    return message;
  }
  const summary = buildDocumentSummary(document);
  const filteredParts = parts.filter((part) => !TEXT_PART_TYPES.has(part.type));
  const nextParts = [
    ...filteredParts,
    { type: "text", text: summary } as UIPart,
  ];
  return { ...message, parts: nextParts } as T;
}

function findLastUserMessage(
  messages: ToolAwareMessage[],
): ToolAwareMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const candidate = messages[i];
    if (candidate?.role === "user") {
      return candidate;
    }
  }
  return null;
}

/**
 * Builds a human-readable summary string for a document.
 * Prioritizes the AI-provided contextual summary, falls back to generic message.
 */
function buildDocumentSummary(document: CanvasDocument): string {
  // Use AI-provided contextual summary if available
  if (document.summary?.trim()) {
    return document.summary.trim();
  }

  // Fallback to generic message
  const readableType = document.type.replace(/_/g, " ");
  if (document.title?.trim()) {
    return `I've created a ${readableType} for you: "${document.title.trim()}".`;
  }
  return `Here is your generated ${readableType}.`;
}
