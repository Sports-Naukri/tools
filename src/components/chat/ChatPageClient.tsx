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

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";

import { CanvasPanel } from "@/components/canvas/CanvasPanel";
import { ChatComposer, type ChatMode } from "@/components/chat/ChatComposer";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
// Resume skill mapping temporarily disabled for redesign
import { DEFAULT_CHAT_MODEL_ID, FOLLOWUP_TOOL_NAME } from "@/lib/chat/constants";
import { logAttachmentFailure } from "@/lib/analytics/attachments";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/chat/attachments";
import type { AttachmentPreview, ChatSuggestion, UsageSnapshot } from "@/lib/chat/types";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getLatestConversation,
  getMessages,
  getStoredUsageSnapshot,
  listConversations,
  saveMessage,
  saveUsageSnapshot,
  updateConversationMeta,
  type StoredAttachment,
  type StoredConversation,
  type StoredMessage,
  type StoredToolInvocation,
} from "@/lib/chat/storage";
import { DOCUMENT_TOOL_NAME, isGeneratedDocument, type CanvasDocument } from "@/lib/canvas/documents";
import { getProfile, isContextEnabled, saveProfile, canUpload, recordUpload, setContextEnabled } from "@/lib/resume/storage";
import { parseResumeFile } from "@/lib/resume/parser";
import type { ToolAwareMessage, ToolInvocationState } from "@/lib/chat/tooling";
import type { Job } from "@/lib/jobs/types";



const ATTACHMENTS_DISABLED = process.env.NEXT_PUBLIC_ATTACHMENTS_DISABLED === "true";
const DEFAULT_UPLOADS_DISABLED_MESSAGE = "File uploads are temporarily unavailable";
// Allows hiding post-response suggestion pills without breaking starter prompts.
const SUGGESTIONS_DISABLED = process.env.NEXT_PUBLIC_CHAT_SUGGESTIONS_DISABLED === "true";


type SessionState = {
  conversation: StoredConversation;
  messages: StoredMessage[];
  usage: UsageSnapshot;
};

/**
 * Main client component for the chat page.
 * Handles the initialization of the chat session, loading history, and managing the active conversation.
 */
export function ChatPageClient() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [history, setHistory] = useState<StoredConversation[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Refreshes the list of conversations from local storage.
   */
  const refreshHistory = useCallback(async (): Promise<StoredConversation[]> => {
    const conversations = await listConversations(20);
    setHistory(conversations);
    return conversations;
  }, []);


  /**
   * Loads usage statistics for the current user/conversation.
   */
  const loadUsage = useCallback(async (conversationId?: string) => {
    const params = new URLSearchParams();
    if (conversationId) params.set("conversationId", conversationId);
    const res = await fetch(`/api/chat/usage?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load usage");
    }
    const data = (await res.json()) as UsageSnapshot;
    console.log("[ChatPageClient] Loaded usage:", data);
    if (conversationId) {
      await saveUsageSnapshot(conversationId, data);
    }
    return data;
  }, []);

  /**
   * Bootstraps the chat session by loading the latest conversation or creating a new one.
   */
  const updateUsageForConversation = useCallback((conversationId: string, usage: UsageSnapshot) => {
    setSession((prev) => {
      if (!prev || prev.conversation.id !== conversationId) {
        return prev;
      }
      return { ...prev, usage };
    });
  }, []);

  const bootstrap = useCallback(async () => {
    setIsBootstrapping(true);
    const latest = await getLatestConversation();
    const conversation =
      latest ??
      (await createEmptyConversation({
        modelId: DEFAULT_CHAT_MODEL_ID,
        persist: false,
      }));
    const messages = await getMessages(conversation.id);
    const cachedUsage = await getStoredUsageSnapshot(conversation.id);

    if (!cachedUsage) {
      const usage = await loadUsage(conversation.id);
      setSession({ conversation, messages, usage });
    } else {
      setSession({ conversation, messages, usage: cachedUsage });
      void loadUsage(conversation.id)
        .then((fresh) => updateUsageForConversation(conversation.id, fresh))
        .catch((err) => console.error("[ChatPageClient] Failed to refresh usage", err));
    }

    await refreshHistory();
    setIsBootstrapping(false);
  }, [loadUsage, refreshHistory, updateUsageForConversation]);

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
    async (conversationId: string) => {
      if (!conversationId || conversationId === session?.conversation.id) return;
      const conversation = await getConversation(conversationId);
      if (!conversation) return;
      const messages = await getMessages(conversationId);
      const cachedUsage = await getStoredUsageSnapshot(conversationId);

      if (!cachedUsage) {
        const usage = await loadUsage(conversationId);
        setSession({ conversation, messages, usage });
      } else {
        setSession({ conversation, messages, usage: cachedUsage });
        void loadUsage(conversationId)
          .then((fresh) => updateUsageForConversation(conversationId, fresh))
          .catch((err) => console.error("[ChatPageClient] Failed to refresh usage", err));
      }
    },
    [loadUsage, session?.conversation.id, updateUsageForConversation]
  );

  const startBlankConversation = useCallback(
    async (modelId: string = DEFAULT_CHAT_MODEL_ID) => {
      const conversation = await createEmptyConversation({ modelId, persist: false });
      const usage = await loadUsage(conversation.id);
      setSession({ conversation, messages: [], usage });
      return conversation;
    },
    [loadUsage]
  );

  const handleNewChat = useCallback(async () => {
    await startBlankConversation(DEFAULT_CHAT_MODEL_ID);
  }, [startBlankConversation]);

  const handleConversationUpdate = useCallback(
    async (updated: StoredConversation) => {
      setSession((prev) => (prev ? { ...prev, conversation: updated } : prev));
      await refreshHistory();
    },
    [refreshHistory]
  );

  const handleTitleStream = useCallback((conversationId: string, newTitle: string) => {
    setSession((prev) => {
      if (!prev || prev.conversation.id !== conversationId) {
        return prev;
      }
      return { ...prev, conversation: { ...prev.conversation, title: newTitle } };
    });
    setHistory((prev) => prev.map((conversation) => (conversation.id === conversationId ? { ...conversation, title: newTitle } : conversation)));
  }, []);

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
          setSession({ conversation: nextConversation, messages, usage: cachedUsage });
          void loadUsage(nextConversation.id)
            .then((fresh) => updateUsageForConversation(nextConversation.id, fresh))
            .catch((err) => console.error("[ChatPageClient] Failed to refresh usage", err));
        }
      } else {
        await startBlankConversation(DEFAULT_CHAT_MODEL_ID);
      }
    },
    [loadUsage, refreshHistory, session?.conversation.id, startBlankConversation, updateUsageForConversation]
  );

  if (isBootstrapping || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> Preparing chat…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <ChatSidebar
        usage={session.usage}
        conversations={history}
        activeConversationId={session.conversation.id}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <ChatWorkspace
        key={session.conversation.id}
        session={session}
        onUsageChange={(usage) => setSession((prev) => (prev ? { ...prev, usage } : prev))}
        onConversationUpdate={handleConversationUpdate}
        onTitleStream={handleTitleStream}
        loadUsage={loadUsage}
        refreshHistory={refreshHistory}
        onNewChat={handleNewChat}
      />
    </div>
  );
}

type ChatWorkspaceProps = {
  session: SessionState;
  onUsageChange: (usage: UsageSnapshot) => void;
  onConversationUpdate: (conversation: StoredConversation) => void;
  onTitleStream: (conversationId: string, newTitle: string) => void;
  loadUsage: (conversationId: string) => Promise<UsageSnapshot>;
  refreshHistory: () => Promise<StoredConversation[]>;
  onNewChat: () => void;
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
function ChatWorkspace({ session, onUsageChange, onConversationUpdate, onTitleStream, loadUsage, refreshHistory, onNewChat }: ChatWorkspaceProps) {
  const [modelId, setModelId] = useState(session.conversation.modelId || DEFAULT_CHAT_MODEL_ID);

  // Mode state with sessionStorage persistence
  const [mode, setMode] = useState<ChatMode>(() => {
    if (typeof window === "undefined") return "jay";
    const saved = sessionStorage.getItem("sn-chat-mode");
    return (saved === "navigator" ? "navigator" : "jay") as ChatMode;
  });

  // Persist mode changes to sessionStorage
  const handleModeChange = useCallback((newMode: ChatMode) => {
    setMode(newMode);
    sessionStorage.setItem("sn-chat-mode", newMode);
  }, []);
  const isSearchEnabled = false;
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [uploadsDisabledMessage, setUploadsDisabledMessage] = useState<string | null>(
    ATTACHMENTS_DISABLED ? DEFAULT_UPLOADS_DISABLED_MESSAGE : null
  );
  const [suggestionsByMessage, setSuggestionsByMessage] = useState<Record<string, ChatSuggestion[]>>({});

  // Resume context for Navigator mode (Phase 5)
  // Stores the profile data to send with chat requests when toggle is ON
  const resumeContextRef = useRef<PendingRequest["body"]["resumeContext"]>(null);

  // Load resume context when in Navigator mode and context is enabled
  // Also refresh periodically to catch new uploads
  useEffect(() => {
    const loadResumeContext = async () => {
      // Load resume context for BOTH modes when toggle is ON
      // This allows Jay to use resume info when creating resumes/documents
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
        experience: profile.experience?.map(e => ({ title: e.title, company: e.company })),
      };
      console.log(`📋 [Resume Context] Loaded: ${profile.skills.length} skills for ${mode} mode`);
    };

    loadResumeContext();

    // Poll every 3 seconds to catch new uploads (mirrors ResumeToggle behavior)
    const interval = setInterval(loadResumeContext, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (!SUGGESTIONS_DISABLED) {
      return;
    }
    setSuggestionsByMessage({});
  }, []);
  const attachmentFilesRef = useRef<Map<string, File>>(new Map());
  const hasUploadingAttachments = attachments.some((attachment) => attachment.status === "uploading");
  const hasErroredAttachments = attachments.some((attachment) => attachment.status === "error");
  const [input, setInput] = useState("");

  // True when the last request failed and the user can retry it inline.
  const [retryAvailable, setRetryAvailable] = useState(false);
  const hasStartedRef = useRef(session.conversation.messageCount > 0);

  // Keep the "is new conversation" flag in sync when the active conversation changes so rate limits stay accurate.
  useEffect(() => {
    hasStartedRef.current = session.conversation.messageCount > 0;
  }, [session.conversation.id, session.conversation.messageCount]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track persisted snapshots to avoid unnecessary writes to storage
  const persistedMessageSnapshots = useRef(
    new Map(session.messages.map((message) => [message.id, buildStoredMessageSnapshot(message)]))
  );

  const initialMessages = useMemo<ToolAwareMessage[]>(
    () => session.messages.map(convertStoredMessageToUIMessage) as ToolAwareMessage[],
    [session.messages]
  );

  const readyAttachments = attachments.filter(
    (attachment) => attachment.status === "ready" && typeof attachment.url === "string" && !attachment.isLocalOnly
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
            (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string")
              ? payload.error
              : "Upload failed";
          const serverCode =
            payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string"
              ? payload.code
              : undefined;

          lastServerCode = serverCode;
          const isConfigError = serverCode === "blob_token_missing" || serverCode === "uploads_disabled";

          if (isConfigError) {
            setUploadsDisabledMessage(serverMessage || DEFAULT_UPLOADS_DISABLED_MESSAGE);
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

        const data = payload as { url?: string; name?: string; size?: number; type?: string };
        if (!data.url) {
          throw new Error("Upload response missing file URL");
        }
        attachmentFilesRef.current.delete(attachmentId);
        setAttachments((prev) =>
          prev.map((item) => (item.id === attachmentId ? { ...item, url: data.url, status: "ready" } : item))
        );
      } catch (uploadError) {
        const uploadMessage = uploadError instanceof Error ? uploadError.message : "Upload failed";
        const isConfigError = lastServerCode === "blob_token_missing" || lastServerCode === "uploads_disabled";
        const errorCode = lastServerCode;
        const attachmentError = isConfigError ? undefined : uploadMessage;
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === attachmentId ? { ...item, status: "error", error: attachmentError } : item
          )
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
    [session.conversation.id]
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
    await createConversation(session.conversation);
    await refreshHistory();
  }, [session, refreshHistory]);

  const messagesRef = useRef<ToolAwareMessage[]>([]);

  const generateTitle = useCallback(async (messageContent: string, modelId: string) => {
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
  }, []);

  // Persist messages only after the assistant responds successfully.
  const handleFinish = useCallback(async (completedMessage?: ToolAwareMessage) => {
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

    const candidates = currentMessages.filter((message) => isSupportedRole(message.role));

    // Identify messages that need to be saved (changed content or new documents)
    const pendingSaves = candidates
      .map((message) => {
        const normalizedContent = getTextContent(message);
        const documents = extractDocumentsFromMessage(message);
        const toolInvocations = message.toolInvocations?.map((inv): StoredToolInvocation => ({
          state: inv.state,
          toolCallId: inv.toolCallId,
          toolName: inv.toolName,
          args: inv.args,
          result: inv.result,
        }));
        const clonedParts = message.parts ? cloneParts(message.parts) : undefined;
        const attachmentsForStorage = extractAttachmentsFromMessageParts(message);
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
      .filter(({ content, documents, toolInvocations, parts, attachments }) => {
        const hasTools = toolInvocations && toolInvocations.length > 0;
        const hasParts = parts && parts.length > 0;
        const hasAttachments = attachments && attachments.length > 0;
        return content.length > 0 || documents.length > 0 || hasTools || hasParts || hasAttachments;
      })
      .filter(({ message, snapshot }) => persistedMessageSnapshots.current.get(message.id) !== snapshot);

    if (!pendingSaves.length) {
      return;
    }

    await ensureConversationPersisted();
    let titleUpdated = false;

    for (const { message, content, documents, toolInvocations, parts, attachments, snapshot } of pendingSaves) {
      await saveMessage({
        id: message.id,
        conversationId: session.conversation.id,
        role: message.role,
        content,
        documents: documents.length ? documents.map(cloneDocument) : undefined,
        toolInvocations,
        parts,
        attachments: attachments.length ? attachments : undefined,
        createdAt: new Date().toISOString(),
      });
      persistedMessageSnapshots.current.set(message.id, snapshot);

      // Update conversation title based on the first user message
      // Use sessionRef to check the latest title state, avoiding stale closures
      const currentTitle = sessionRef.current.conversation.title;
      if (!titleUpdated && message.role === "user" && !currentTitle) {
        const aiTitle = await generateTitle(content, session.conversation.modelId);
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
        await updateConversationMeta(session.conversation.id, { title: updatedConversation.title });
        onConversationUpdate(updatedConversation);
        titleUpdated = true;
      }
    }
  }, [ensureConversationPersisted, onConversationUpdate, onTitleStream, session.conversation, generateTitle]);

  // Initialize the AI SDK chat hook
  const { messages, sendMessage, status, setMessages } = useChat<ToolAwareMessage>({
    id: session.conversation.id,
    messages: initialMessages,
    onError: (error) => {
      // Detect rate limit or empty response errors and show friendly messages
      const errorMessage = error.message || "";
      let userMessage = errorMessage;

      if (errorMessage.includes("rate limit") || errorMessage.includes("Rate limit")) {
        userMessage = "The AI is currently busy. Please wait a moment and try again.";
      } else if (errorMessage.includes("must contain either output text or tool calls")) {
        userMessage = "The AI couldn't respond. Please wait a few seconds and try again.";
      } else if (errorMessage.includes("429") || errorMessage.includes("too many requests")) {
        userMessage = "Too many requests. Please slow down and try again.";
      }

      console.warn("🔴 Chat error:", errorMessage.slice(0, 100));
      setComposerError(userMessage);
      // Always enable retry when an error occurs - don't check lastRequestRef
      // because streaming errors happen after sendMessage resolves
      setRetryAvailable(true);
    },
    onFinish: async ({ message }) => {
      // Check if the message actually has content - empty content means likely error
      const hasContent = message?.parts?.some((part) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = part as any;
        // Check for text content
        if (p.type === "text" && typeof p.text === "string" && p.text.trim().length > 0) {
          return true;
        }
        // Check for tool outputs
        if (p.type === "tool-invocation" || p.type?.startsWith("tool-")) {
          return true;
        }
        return false;
      });

      if (hasContent) {
        // Only clear pending request on successful completion with actual content
        lastRequestRef.current = null;
        setRetryAvailable(false);
      } else {
        // Message is empty or has no content - keep retry available
        console.warn("⚠️ Chat finished but message is empty - keeping retry available");

        // Remove the empty assistant message from the chat
        if (message?.id) {
          setMessages((prev) => prev.filter((m) => m.id !== message.id));
          console.log("🧹 Removed empty assistant message:", message.id);
        }

        setRetryAvailable(true);
        setComposerError("The AI couldn't generate a response. Please try again.");
      }

      hasStartedRef.current = true;
      setAttachments([]);

      // Only save conversation and fetch suggestions if we got actual content
      if (message && hasContent) {
        const snapshot = messagesRef.current;
        const prev = snapshot.length >= 2 ? snapshot[snapshot.length - 2] : undefined;
        void fetchSuggestions(message, prev);

        // Refresh usage and save message ONLY on success
        const usagePromise = loadUsage(session.conversation.id)
          .then(onUsageChange)
          .catch((err) => console.error("[ChatWorkspace] failed to refresh usage on finish", err));
        await Promise.all([usagePromise, handleFinish(message)]);
      } else {
        // On failure, just refresh usage to see current state (nothing was incremented server-side)
        loadUsage(session.conversation.id)
          .then(onUsageChange)
          .catch((err) => console.error("[ChatWorkspace] failed to refresh usage on error", err));
      }
    },
  });

  const fetchSuggestions = useCallback(
    async (assistantMessage: ToolAwareMessage, previousMessage?: ToolAwareMessage) => {
      if (SUGGESTIONS_DISABLED) {
        return;
      }
      if (!assistantMessage || assistantMessage.role !== "assistant") {
        return;
      }

      const hasDocument = extractDocumentsFromMessage(assistantMessage).length > 0;
      if (!hasDocument) {
        const inline = extractInlineSuggestions(assistantMessage);
        if (inline.length > 0) {
          console.log("✅ [Suggestions] Using inline suggestions from AI tool call:", inline.map(s => s.text));
          setSuggestionsByMessage((prev) => ({ ...prev, [assistantMessage.id]: inline }));
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
        lastUserText: lastUserMessage ? getTextContent(lastUserMessage) : undefined,
        assistantText,
        modelId,
      };

      try {
        // Log fallback trigger with diagnostic info
        const toolNames = assistantMessage.toolInvocations?.map(t => t.toolName) ?? [];
        const hasFollowupTool = toolNames.includes(FOLLOWUP_TOOL_NAME);
        console.log(
          "⚠️ [Suggestions] Fallback triggered:",
          hasDocument ? "Document generated (skipping inline)" :
            !assistantMessage.toolInvocations?.length ? "No tool invocations in response" :
              !hasFollowupTool ? `AI used tools [${toolNames.join(", ")}] but not ${FOLLOWUP_TOOL_NAME}` :
                `${FOLLOWUP_TOOL_NAME} tool called but returned no suggestions`
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
        setSuggestionsByMessage((prev) => ({ ...prev, [assistantMessage.id]: data.suggestions! }));
      } catch (err) {
        console.warn("[ChatWorkspace] suggestion fetch failed", err);
      }
    },
    [modelId, session.conversation.id]
  );


  useEffect(() => {
    messagesRef.current = messages as ToolAwareMessage[];
  }, [messages]);

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
        .catch((err) => console.error("[ChatWorkspace] failed to refresh usage after reset", err));
    };
    const delay = nextDeadline - Date.now();
    if (delay <= 0) {
      refresh();
      return;
    }
    const timerId = window.setTimeout(refresh, delay + 1000);
    return () => window.clearTimeout(timerId);
  }, [session.usage.daily.remaining, session.usage.daily.resetAt, session.usage.chat.remaining, session.usage.chat.resetAt, loadUsage, onUsageChange, session.conversation.id]);

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
  const displayMessages = useMemo(() => toolAwareMessages.map(ensureDocumentSummaryInMessage), [toolAwareMessages]);

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

  const documentLookup = useMemo<Partial<Record<string, CanvasDocument>>>(() => {
    return canvasDocuments.reduce<Partial<Record<string, CanvasDocument>>>((acc, doc) => {
      if (doc.toolCallId) {
        acc[doc.toolCallId] = doc;
      }
      acc[doc.id] = doc;
      return acc;
    }, {});
  }, [canvasDocuments]);

  const STORAGE_KEY = `sn-chat-canvas-${session.conversation.id}`;

  // Initialize from storage
  const [isCanvasOpen, setIsCanvasOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored).isOpen : false;
    } catch { return false; }
  });

  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored).activeDocumentId : null;
    } catch { return null; }
  });

  // Save to storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      isOpen: isCanvasOpen,
      activeDocumentId
    }));
  }, [isCanvasOpen, activeDocumentId, session.conversation.id, STORAGE_KEY]);

  const documentCountRef = useRef(0);
  const lastDocumentIdRef = useRef<string | null>(null);

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

    // If a new document was added, ALWAYS switch to it and open the canvas
    if (docCount > previousCount) {
      setActiveDocumentId(latest!.id);
      setIsCanvasOpen(true);
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



  const workspaceStyle = useMemo<CSSProperties | undefined>(() => {
    if (isCanvasOpen) {
      return { paddingRight: "min(640px, 50vw)" };
    }
    return undefined;
  }, [isCanvasOpen]);



  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const submitMessage = useCallback(
    async (textOverride?: string, extraParts: UIPart[] = []) => {
      if (retryAvailable) {
        const newMessages = [...messages];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
          newMessages.pop();
        }
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "user") {
          newMessages.pop();
        }
        setMessages(newMessages);
        setRetryAvailable(false);
        lastRequestRef.current = null;
      }

      const rawText = textOverride ?? input;
      const trimmed = rawText.trim();
      const hasText = trimmed.length > 0;
      const currentAttachments = readyAttachments.map(({ id, name, size, type, url }) => ({ id, name, size, type, url }));

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

      if (!hasText && currentAttachments.length === 0 && !selectedJob) {
        return;
      }

      const parts: UIPart[] = extraParts.length ? [...extraParts] : [];

      if (selectedJob) {
        const jobContext = {
          title: selectedJob.title,
          employer: selectedJob.employer,
          location: selectedJob.location,
          salary: selectedJob.salary,
          type: selectedJob.jobType,
          postedDate: selectedJob.postedDate,
          link: selectedJob.link,
          description: selectedJob.description,
        };

        const contextString = `:::job-context ${JSON.stringify(jobContext)} :::`;
        parts.push({ type: "text", text: contextString } as UIPart);

        if (hasText) {
          parts.push({ type: "text", text: trimmed } as UIPart);
        } else {
          parts.push({ type: "text", text: "Tell me more about this role." } as UIPart);
        }
      } else if (hasText) {
        parts.push({ type: "text", text: trimmed } as UIPart);
      }

      for (const attachment of currentAttachments) {
        if (!attachment.url) continue;
        parts.push(
          {
            type: "file",
            url: attachment.url,
            name: attachment.name,
            mimeType: attachment.type,
            mediaType: attachment.type,
            size: attachment.size,
            attachmentId: attachment.id,
          } as UIPart
        );
      }

      const pendingRequest: PendingRequest = {
        message: {
          role: "user",
          parts,
        } as ToolAwareMessage,
        body: {
          conversationId: session.conversation.id,
          modelId,
          mode,
          isSearchEnabled,
          attachments: currentAttachments,
          isNewConversation: !hasStartedRef.current,
          // Resume context injection (Phase 5) - populated below if toggle ON
          resumeContext: resumeContextRef.current,
        },
      };

      lastRequestRef.current = pendingRequest;
      setRetryAvailable(false);

      try {
        await sendMessage(pendingRequest.message, { body: pendingRequest.body });
        // Don't clear lastRequestRef here - onFinish will handle it on success
        // This prevents race condition where streaming errors happen after resolve
        setInput("");
        setSelectedJob(null);
      } catch (sendError) {
        // onError callback handles setting retryAvailable
        // Just log and re-throw for synchronous errors
        console.warn("🔴 Send failed:", sendError instanceof Error ? sendError.message : "Unknown error");
        throw sendError;
      }
    },
    [
      retryAvailable,
      messages,
      setMessages,
      input,
      readyAttachments,
      hasUploadingAttachments,
      hasErroredAttachments,
      selectedJob,
      session.conversation.id,
      modelId,
      isSearchEnabled,
      sendMessage,
      setSelectedJob,
      setComposerError,
      mode,
    ]
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      void submitMessage();
    },
    [submitMessage]
  );

  // Replays the last failed request without forcing the user to retype it.
  const handleRetry = useCallback(async () => {
    console.log("🔄 Retry button clicked. lastRequestRef:", lastRequestRef.current);

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
      await sendMessage(lastRequestRef.current.message, { body: lastRequestRef.current.body });
      // Success is handled by onFinish which clears lastRequestRef
    } catch (retryError) {
      // This catches synchronous errors only (network errors, etc.)
      // Streaming errors are handled by onFinish
      console.warn("🔴 Retry failed:", retryError instanceof Error ? retryError.message : "Unknown error");
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
        setComposerError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
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
            continue;
          }

          // Create temporary "Extracting" preview
          const rId = nanoid(8);
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

          // Process Async
          (async () => {
            try {
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
              setAttachments((prev) => prev.map(a =>
                a.id === rId
                  ? { ...a, status: "ready" as const, isLocalOnly: true }
                  : a
              ));

            } catch (err) {
              console.error("Auto-resume upload failed:", err);
              setAttachments((prev) => prev.map(a =>
                a.id === rId
                  ? { ...a, status: "error", error: "Resume extraction failed" }
                  : a
              ));
            }
          })();

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

        const id = nanoid(8);
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
    [attachments.length, uploadsDisabledMessage, session.conversation.id, uploadAttachment]
  );

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    attachmentFilesRef.current.delete(attachmentId);
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  }, []);

  const handleRetryAttachment = useCallback(
    (attachmentId: string) => {
      const file = attachmentFilesRef.current.get(attachmentId);
      if (!file) {
        setComposerError("Original file is no longer available. Please reattach it.");
        return;
      }
      setAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId
            ? { ...attachment, status: "uploading", error: undefined }
            : attachment
        )
      );
      void uploadAttachment(file, attachmentId);
    },
    [uploadAttachment]
  );



  const isNewConversation = session.conversation.messageCount === 0;
  const dailyLimitReached = session.usage.daily.remaining <= 0;
  const chatLimitReached = session.usage.chat.remaining <= 0;

  // Only block if it's a new conversation AND daily limit is reached, OR if chat limit is reached for this specific chat
  const isLimitReached = (isNewConversation && dailyLimitReached) || chatLimitReached;
  const chatDisabled =
    isLimitReached || isLoading;

  const handleSuggestionClick = useCallback(async (text: string) => {
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
      await sendMessage(pendingRequest.message, { body: pendingRequest.body });
      lastRequestRef.current = null;
    } catch (sendError) {
      setRetryAvailable(true);
      if (sendError instanceof Error) {
        setComposerError(sendError.message);
      }
    }
  }, [chatDisabled, session.conversation.id, modelId, isSearchEnabled, sendMessage, mode]);

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }
    // Keep the newest exchange in view whenever content or streaming status changes.
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [displayMessages, isLoading]);

  return (
    <section className="flex flex-1 flex-col h-full relative" style={workspaceStyle}>
      <div className="flex-1 overflow-y-auto chat-area-bg" ref={scrollContainerRef}>
        <MessageList
          messages={displayMessages}
          isStreaming={isLoading}
          onSelectDocument={handleSelectDocument}
          documentLookup={documentLookup}
          showRetry={retryAvailable}
          onRetry={handleRetry}
          suggestionsByMessage={SUGGESTIONS_DISABLED ? {} : suggestionsByMessage}
          onSuggestionSelect={(messageId) =>
            setSuggestionsByMessage((prev) => {
              const next = { ...prev };
              delete next[messageId];
              return next;
            })
          }
          onSuggestionClick={SUGGESTIONS_DISABLED ? undefined : handleSuggestionClick}
          onStarterClick={handleSuggestionClick}
          isLimitReached={chatDisabled}
          onSelectJob={handleSelectJob}
        />
      </div>

      <div className="w-full bg-white">
        <ChatComposer
          input={input}
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
            isNewConversation && dailyLimitReached ? 'daily' :
              chatLimitReached ? 'chat' : null
          }
          selectedJob={selectedJob}
          onRemoveJob={handleRemoveJob}
          hasUploadingAttachments={hasUploadingAttachments}
          hasErroredAttachments={hasErroredAttachments}
          onRetryAttachment={handleRetryAttachment}
          mode={mode}
          onModeChange={handleModeChange}
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
async function createEmptyConversation({ modelId, persist = true }: { modelId: string; persist?: boolean }) {
  const now = new Date().toISOString();
  const conversation: StoredConversation = {
    id: nanoid(10),
    title: "",
    modelId,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  if (persist) {
    await createConversation(conversation);
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
  let parts: UIPart[] = hasExplicitParts ? cloneParts(message.parts as UIPart[]) : [];

  if (!hasExplicitParts) {
    if (message.content) {
      parts.push({ type: "text", text: message.content } as UIPart);
    }
  }

  parts = hydrateAttachmentsIntoParts(parts, message.attachments);

  if (!hasExplicitParts && message.documents?.length) {
    for (const document of message.documents) {
      parts.push(
        {
          type: DOCUMENT_PART_TYPE,
          toolCallId: document.toolCallId ?? document.id,
          state: "output-available",
          output: cloneDocument(document),
        } as UIPart
      );
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

  return {
    id: message.id,
    role: message.role,
    parts,
  } as UIMessage;
}

const SUPPORTED_ROLES = new Set<UIMessage["role"]>(["user", "assistant", "system"]);

/**
 * Checks if a message role is supported by the UI.
 */
function isSupportedRole(role: UIMessage["role"]): role is "user" | "assistant" | "system" {
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
function extractDocumentFromPart(part: UIPart | undefined): CanvasDocument | null {
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
    (invocation) => invocation.toolName === FOLLOWUP_TOOL_NAME
  );

  if (followupInvocations.length === 0) {
    // AI didn't call the suggestions tool - this is normal, not an error
    return [];
  }

  const record = followupInvocations.find(
    (invocation) => invocation.state === "result" && Boolean(invocation.result)
  );

  if (!record) {
    // Tool was called but hasn't completed or failed
    const states = followupInvocations.map(i => i.state);
    console.warn(`⚠️ [Suggestions] generateFollowups tool called but not completed. States: [${states.join(", ")}]`);
    return [];
  }

  if (!record.result || typeof record.result !== "object") {
    console.warn("⚠️ [Suggestions] generateFollowups returned invalid result:", record.result);
    return [];
  }

  const payload = record.result as { suggestions?: unknown };
  const values = Array.isArray(payload.suggestions) ? payload.suggestions : [];

  if (values.length === 0) {
    console.warn("⚠️ [Suggestions] generateFollowups returned empty suggestions array");
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

function buildPersistenceSnapshot({ content, documents, toolInvocations, parts, attachments }: SnapshotInput): string {
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

function extractAttachmentsFromMessageParts(message: UIMessage): StoredAttachment[] {
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

function convertPartToStoredAttachment(part: UIPart, index: number, messageId: string): StoredAttachment | null {
  if (part.type !== "file") {
    return null;
  }
  const filePart = part as FileUIPart;
  if (typeof filePart.url !== "string") {
    return null;
  }
  const fallbackId = filePart.attachmentId ?? `${messageId}-attachment-${index}`;
  const attachmentName = filePart.name && filePart.name.length ? filePart.name : "Attachment";
  const attachmentType = filePart.mimeType ?? filePart.mediaType ?? "application/octet-stream";
  const attachmentSize = typeof filePart.size === "number" ? filePart.size : 0;
  return {
    id: fallbackId,
    name: attachmentName,
    size: attachmentSize,
    type: attachmentType,
    url: filePart.url,
  };
}

function hydrateAttachmentsIntoParts(parts: UIPart[], attachments?: StoredAttachment[]): UIPart[] {
  if (!attachments?.length) {
    return parts;
  }
  const existingUrls = new Set(
    parts
      .filter((part): part is FileUIPart => part.type === "file")
      .map((part) => part.url)
      .filter((url): url is string => Boolean(url))
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
  const document = parts.reduce<CanvasDocument | null>((acc, part) => acc ?? extractDocumentFromPart(part), null);
  if (!document) {
    return message;
  }
  const summary = buildDocumentSummary(document);
  const filteredParts = parts.filter((part) => !TEXT_PART_TYPES.has(part.type));
  const nextParts = [...filteredParts, { type: "text", text: summary } as UIPart];
  return { ...message, parts: nextParts } as T;
}

function findLastUserMessage(messages: ToolAwareMessage[]): ToolAwareMessage | null {
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

