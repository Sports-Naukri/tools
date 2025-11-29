"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";

import { CanvasPanel } from "@/components/canvas/CanvasPanel";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/chat/constants";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/chat/attachments";
import type { AttachmentPreview, UsageSnapshot } from "@/lib/chat/types";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getLatestConversation,
  getMessages,
  listConversations,
  saveMessage,
  updateConversationMeta,
  type StoredConversation,
  type StoredMessage,
} from "@/lib/chat/storage";
import { DOCUMENT_TOOL_NAME, isGeneratedDocument, type CanvasDocument } from "@/lib/canvas/documents";
import type { ToolAwareMessage } from "@/lib/chat/tooling";

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
    syncChatTitleCounter(conversations);
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
    return data;
  }, []);

  /**
   * Bootstraps the chat session by loading the latest conversation or creating a new one.
   */
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
    const usage = await loadUsage(conversation.id);
    setSession({ conversation, messages, usage });
    await refreshHistory();
    setIsBootstrapping(false);
  }, [loadUsage, refreshHistory]);

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
      const usage = await loadUsage(conversationId);
      setSession({ conversation, messages, usage });
    },
    [loadUsage, session?.conversation.id]
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
        const usage = await loadUsage(nextConversation.id);
        setSession({ conversation: nextConversation, messages, usage });
      } else {
        await startBlankConversation(DEFAULT_CHAT_MODEL_ID);
      }
    },
    [loadUsage, refreshHistory, session?.conversation.id, startBlankConversation]
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
    isSearchEnabled: boolean;
    attachments: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      url?: string;
    }>;
    isNewConversation: boolean;
  };
};

/**
 * Component responsible for the active chat interface.
 * Manages the message list, composer, and canvas panel.
 */
function ChatWorkspace({ session, onUsageChange, onConversationUpdate, loadUsage, refreshHistory, onNewChat }: ChatWorkspaceProps) {
  const [modelId, setModelId] = useState(session.conversation.modelId || DEFAULT_CHAT_MODEL_ID);
  const isSearchEnabled = false;
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  // True when the last request failed and the user can retry it inline.
  const [retryAvailable, setRetryAvailable] = useState(false);
  const hasStartedRef = useRef(session.conversation.messageCount > 0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track persisted snapshots to avoid unnecessary writes to storage
  const persistedMessageSnapshots = useRef(
    new Map(
      session.messages.map((message) => [
        message.id,
        buildPersistenceSnapshot(message.content ?? "", message.documents ?? []),
      ])
    )
  );

  const initialMessages = useMemo<ToolAwareMessage[]>(
    () => session.messages.map(convertStoredMessageToUIMessage) as ToolAwareMessage[],
    [session.messages]
  );

  const readyAttachments = attachments.filter(
    (attachment) => attachment.status === "ready" && typeof attachment.url === "string"
  );

  // Holds the most recent outbound request until it succeeds.
  const lastRequestRef = useRef<PendingRequest | null>(null);
  
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
        const snapshot = buildPersistenceSnapshot(normalizedContent, documents);
        return { message, content: normalizedContent, documents, snapshot };
      })
      .filter(({ content, documents }) => content.length > 0 || documents.length > 0)
      .filter(({ message, snapshot }) => persistedMessageSnapshots.current.get(message.id) !== snapshot);

    if (!pendingSaves.length) {
      return;
    }

    await ensureConversationPersisted();
    let titleUpdated = false;

    for (const { message, content, documents, snapshot } of pendingSaves) {
      await saveMessage({
        id: message.id,
        conversationId: session.conversation.id,
        role: message.role,
        content,
        documents: documents.length ? documents.map(cloneDocument) : undefined,
        createdAt: new Date().toISOString(),
      });
      persistedMessageSnapshots.current.set(message.id, snapshot);

      // Update conversation title based on the first user message
      if (!titleUpdated && message.role === "user" && isPlaceholderTitle(session.conversation.title)) {
        const updatedConversation: StoredConversation = {
          ...session.conversation,
          title: deriveTitle(content),
        };
        await updateConversationMeta(session.conversation.id, { title: updatedConversation.title });
        onConversationUpdate(updatedConversation);
        titleUpdated = true;
      }
    }
  }, [ensureConversationPersisted, onConversationUpdate, session.conversation]);

  // Initialize the AI SDK chat hook
  const { messages, sendMessage, status, setMessages } = useChat<ToolAwareMessage>({
    id: session.conversation.id,
    messages: initialMessages,
    onError: (error) => {
      setComposerError(error.message);
      if (lastRequestRef.current) {
        setRetryAvailable(true);
      }
    },
    onFinish: async ({ message }) => {
      hasStartedRef.current = true;
      setAttachments([]);
      const usage = await loadUsage(session.conversation.id);
      onUsageChange(usage);
      await handleFinish(message);
    },
  });

  useEffect(() => {
    messagesRef.current = messages as ToolAwareMessage[];
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";
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

  const workspaceStyle = useMemo<CSSProperties | undefined>(() => {
    if (isCanvasOpen) {
      return { paddingRight: "min(640px, 50vw)" };
    }
    return undefined;
  }, [isCanvasOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (retryAvailable) {
      const newMessages = [...messages];
      // Remove failed assistant message if present
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages.pop();
      }
      // Remove failed user message if present
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'user') {
        newMessages.pop();
      }
      setMessages(newMessages);
      setRetryAvailable(false);
      lastRequestRef.current = null;
    }

    const trimmed = input.trim();
    const hasText = trimmed.length > 0;
    const currentAttachments = readyAttachments.map(({ id, name, size, type, url }) => ({ id, name, size, type, url }));

    if (!hasText && currentAttachments.length === 0) {
      return;
    }

    const parts: UIPart[] = [];
    if (hasText) {
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
        isSearchEnabled,
        attachments: currentAttachments,
        isNewConversation: !hasStartedRef.current,
      },
    };

    lastRequestRef.current = pendingRequest;
    setRetryAvailable(false);

    try {
      await sendMessage(pendingRequest.message, { body: pendingRequest.body });
      lastRequestRef.current = null;
      setInput("");
    } catch (sendError) {
      setRetryAvailable(true);
      if (sendError instanceof Error) {
        setComposerError(sendError.message);
      }
      return;
    }
  };

  // Replays the last failed request without forcing the user to retype it.
  const handleRetry = useCallback(async () => {
    if (!lastRequestRef.current) {
      return;
    }
    try {
      setRetryAvailable(false);
      await sendMessage(lastRequestRef.current.message, { body: lastRequestRef.current.body });
      lastRequestRef.current = null;
    } catch (retryError) {
      setRetryAvailable(true);
      if (retryError instanceof Error) {
        setComposerError(retryError.message);
      }
    }
  }, [sendMessage]);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      if (attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
        setComposerError(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`);
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
          continue;
        }

        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
          errorMessage = `"${file.name}" type is not supported.`;
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
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          setAttachments((prev) =>
            prev.map((item) => (item.id === id ? { ...item, url: data.url, status: "ready" } : item))
          );
        } catch (uploadError) {
          console.error(uploadError);
          setAttachments((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: "error", error: "Upload failed" } : item))
          );
        }
      }

      setComposerError(errorMessage);
    },
    [attachments.length]
  );

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  }, []);

  const isNewConversation = session.conversation.messageCount === 0;
  const dailyLimitReached = session.usage.daily.remaining <= 0;
  const chatLimitReached = session.usage.chat.remaining <= 0;
  
  // Only block if it's a new conversation AND daily limit is reached, OR if chat limit is reached for this specific chat
  const isLimitReached = (isNewConversation && dailyLimitReached) || chatLimitReached;
  const chatDisabled = isLimitReached || isLoading;

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
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        <MessageList
          messages={displayMessages}
          isStreaming={isLoading}
          onSelectDocument={handleSelectDocument}
          documentLookup={documentLookup}
          showRetry={retryAvailable}
          onRetry={handleRetry}
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
    title: getNextChatTitle(),
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
  const parts: UIPart[] = [];

  if (message.content) {
    parts.push({ type: "text", text: message.content } as UIPart);
  }

  if (message.attachments?.length) {
    for (const attachment of message.attachments) {
      if (!attachment.url) continue;
      parts.push(
        {
          type: "file",
          url: attachment.url,
          name: attachment.name,
          mimeType: attachment.type,
          mediaType: attachment.type,
        } as UIPart
      );
    }
  }

  if (message.documents?.length) {
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
function buildPersistenceSnapshot(content: string, documents: CanvasDocument[]): string {
  return JSON.stringify({
    content,
    documents,
  });
}

const CHAT_TITLE_COUNTER_KEY = "sn-chat-title-counter";
const CHAT_PLACEHOLDER_REGEX = /^chat\s+(\d+)$/i;

/**
 * Generates the next default chat title (e.g., "Chat 1", "Chat 2").
 */
function getNextChatTitle() {
  const nextValue = incrementChatCounter();
  return `Chat ${nextValue}`;
}

/**
 * Increments the persistent chat counter in local storage.
 */
function incrementChatCounter() {
  const current = getStoredChatCounter();
  const next = current + 1;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CHAT_TITLE_COUNTER_KEY, String(next));
  }
  return next;
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

/**
 * Builds a human-readable summary string for a document.
 */
function buildDocumentSummary(document: CanvasDocument): string {
  const readableType = document.type.replace(/_/g, " ");
  if (document.title?.trim()) {
    return `Generated ${readableType} titled "${document.title.trim()}".`;
  }
  return `Generated ${readableType}.`;
}

/**
 * Retrieves the current chat counter value from local storage.
 */
function getStoredChatCounter() {
  if (typeof window === "undefined") {
    return 0;
  }
  const raw = window.localStorage.getItem(CHAT_TITLE_COUNTER_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Syncs the local storage counter with the highest number found in existing conversations.
 * Prevents duplicate default titles when clearing storage or switching devices.
 */
function syncChatTitleCounter(conversations: StoredConversation[]) {
  if (typeof window === "undefined") {
    return;
  }
  const maxPlaceholder = conversations.reduce((max, conversation) => {
    const match = conversation.title?.match(CHAT_PLACEHOLDER_REGEX);
    if (!match) {
      return max;
    }
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  const stored = getStoredChatCounter();
  if (maxPlaceholder > stored) {
    window.localStorage.setItem(CHAT_TITLE_COUNTER_KEY, String(maxPlaceholder));
  }
}

/**
 * Checks if a title is a default placeholder (e.g., "New Chat", "Chat 1").
 */
function isPlaceholderTitle(title?: string | null) {
  if (!title) {
    return true;
  }
  const trimmed = title.trim();
  if (!trimmed) {
    return true;
  }
  return trimmed.toLowerCase() === "new chat" || CHAT_PLACEHOLDER_REGEX.test(trimmed);
}
