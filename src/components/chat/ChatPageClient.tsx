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

export function ChatPageClient() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [history, setHistory] = useState<StoredConversation[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async (): Promise<StoredConversation[]> => {
    const conversations = await listConversations(20);
    syncChatTitleCounter(conversations);
    setHistory(conversations);
    return conversations;
  }, []);


  const loadUsage = useCallback(async (conversationId?: string) => {
    const params = new URLSearchParams();
    if (conversationId) params.set("conversationId", conversationId);
    const res = await fetch(`/api/chat/usage?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load usage");
    }
    return (await res.json()) as UsageSnapshot;
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
};

type UIPart = NonNullable<UIMessage["parts"]>[number];

function ChatWorkspace({ session, onUsageChange, onConversationUpdate, loadUsage, refreshHistory }: ChatWorkspaceProps) {
  const [modelId, setModelId] = useState(session.conversation.modelId || DEFAULT_CHAT_MODEL_ID);
  const isSearchEnabled = false;
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const hasStartedRef = useRef(session.conversation.messageCount > 0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const { messages, sendMessage, status } = useChat<ToolAwareMessage>({
    id: session.conversation.id,
    messages: initialMessages,
    onError: (error) => {
      setComposerError(error.message);
    },
    onFinish: async () => {
      hasStartedRef.current = true;
      setAttachments([]);
      const usage = await loadUsage(session.conversation.id);
      onUsageChange(usage);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const toolAwareMessages = messages as ToolAwareMessage[];
  const displayMessages = useMemo(() => toolAwareMessages.map(ensureDocumentSummaryInMessage), [toolAwareMessages]);
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

  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isCanvasMinimized, setIsCanvasMinimized] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
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
      setIsCanvasMinimized(false);
      setActiveDocumentId(null);
      return;
    }

    setActiveDocumentId((prev) => {
      if (!prev) {
        return latest!.id;
      }
      const stillExists = canvasDocuments.some((doc) => doc.id === prev);
      return stillExists ? prev : latest!.id;
    });

    if (docCount > previousCount) {
      setIsCanvasOpen(true);
      setIsCanvasMinimized(false);
    }
  }, [canvasDocuments]);

  const activeDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return canvasDocuments.find((doc) => doc.id === activeDocumentId) ?? null;
  }, [canvasDocuments, activeDocumentId]);

  const handleSelectDocument = useCallback((documentId: string) => {
    setActiveDocumentId(documentId);
    setIsCanvasOpen(true);
    setIsCanvasMinimized(false);
  }, []);

  const workspaceStyle = useMemo<CSSProperties | undefined>(() => {
    if (isCanvasOpen && !isCanvasMinimized) {
      return { paddingRight: "min(640px, 50vw)" };
    }
    return undefined;
  }, [isCanvasOpen, isCanvasMinimized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

    await sendMessage(
      {
        role: "user",
        parts,
      },
      {
        body: {
          conversationId: session.conversation.id,
          modelId,
          isSearchEnabled,
          attachments: currentAttachments,
          isNewConversation: !hasStartedRef.current,
        },
      }
    );
    setInput("");
  };

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

  useEffect(() => {
    // Save only when the streamed message has meaningful text so assistant replies persist after reloads.
    const persistLatestMessages = async () => {
      const candidates = messages.filter((message) => isSupportedRole(message.role));

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
    };

    persistLatestMessages().catch((err) => console.error(err));
  }, [messages, onConversationUpdate, session?.conversation, ensureConversationPersisted]);

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

  const chatDisabled =
    session.usage.daily.remaining <= 0 || session.usage.chat.remaining <= 0 || isLoading;

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
        />
      </div>

      <CanvasPanel
        document={activeDocument}
        isOpen={isCanvasOpen}
        isMinimized={isCanvasMinimized}
        onClose={() => setIsCanvasOpen(false)}
        onMinimize={() => setIsCanvasMinimized(true)}
        onExpand={() => setIsCanvasMinimized(false)}
      />
    </section>
  );
}

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

function deriveTitle(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 50) return trimmed;
  return `${trimmed.slice(0, 47)}…`;
}

const DOCUMENT_PART_TYPE = `tool-${DOCUMENT_TOOL_NAME}`;

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

function isSupportedRole(role: UIMessage["role"]): role is "user" | "assistant" | "system" {
  return SUPPORTED_ROLES.has(role);
}

const TEXT_PART_TYPES = new Set(["text", "output_text"]);

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

function extractDocumentsFromMessage(message: UIMessage): CanvasDocument[] {
  if (!message.parts?.length) {
    return [];
  }
  return message.parts
    .map((part) => extractDocumentFromPart(part))
    .filter((document): document is CanvasDocument => Boolean(document))
    .map((document) => cloneDocument(document));
}

function cloneDocument(document: CanvasDocument): CanvasDocument {
  return {
    ...document,
    content: document.content.map((section) => ({ ...section })),
  };
}

function buildPersistenceSnapshot(content: string, documents: CanvasDocument[]): string {
  return JSON.stringify({
    content,
    documents,
  });
}

const CHAT_TITLE_COUNTER_KEY = "sn-chat-title-counter";
const CHAT_PLACEHOLDER_REGEX = /^chat\s+(\d+)$/i;

function getNextChatTitle() {
  const nextValue = incrementChatCounter();
  return `Chat ${nextValue}`;
}

function incrementChatCounter() {
  const current = getStoredChatCounter();
  const next = current + 1;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CHAT_TITLE_COUNTER_KEY, String(next));
  }
  return next;
}

function ensureDocumentSummaryInMessage<T extends UIMessage>(message: T): T {
  const parts = message.parts ?? [];
  const hasDocumentPart = parts.some((part) => Boolean(extractDocumentFromPart(part)));
  if (!hasDocumentPart) {
    return message;
  }
  const hasTextSummary = parts.some((part) => TEXT_PART_TYPES.has(part.type));
  if (hasTextSummary) {
    return message;
  }
  const document = parts.reduce<CanvasDocument | null>((acc, part) => acc ?? extractDocumentFromPart(part), null);
  if (!document) {
    return message;
  }
  const summary = buildDocumentSummary(document);
  const nextParts = [...parts, { type: "text", text: summary } as UIPart];
  return { ...message, parts: nextParts } as T;
}

function buildDocumentSummary(document: CanvasDocument): string {
  const readableType = document.type.replace(/_/g, " ");
  if (document.title?.trim()) {
    return `Generated ${readableType} titled "${document.title.trim()}".`;
  }
  return `Generated ${readableType}.`;
}

function getStoredChatCounter() {
  if (typeof window === "undefined") {
    return 0;
  }
  const raw = window.localStorage.getItem(CHAT_TITLE_COUNTER_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

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
