"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat, type Message } from "ai/react";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";

import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/chat/constants";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_FILE_SIZE,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/lib/chat/attachments";
import type { AttachmentPreview, UsageSnapshot } from "@/lib/chat/types";
import {
  createConversation,
  getConversation,
  getLatestConversation,
  getMessages,
  listConversations,
  saveMessage,
  updateConversationMeta,
  type StoredConversation,
  type StoredMessage,
} from "@/lib/chat/storage";

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

  const refreshHistory = useCallback(async () => {
    const conversations = await listConversations(20);
    setHistory(conversations);
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

  const handleNewChat = useCallback(async () => {
    const conversation = await createEmptyConversation({ modelId: DEFAULT_CHAT_MODEL_ID });
    const usage = await loadUsage(conversation.id);
    setSession({ conversation, messages: [], usage });
    await refreshHistory();
  }, [loadUsage, refreshHistory]);

  const handleConversationUpdate = useCallback(
    async (updated: StoredConversation) => {
      setSession((prev) => (prev ? { ...prev, conversation: updated } : prev));
      await refreshHistory();
    },
    [refreshHistory]
  );

  if (isBootstrapping || !session) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 shadow">
            <Loader2 className="h-4 w-4 animate-spin text-[#007FF6]" /> Preparing chat…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:px-8">
      <ChatSidebar
        usage={session.usage}
        conversations={history}
        activeConversationId={session.conversation.id}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />
      <ChatWorkspace
        key={session.conversation.id}
        session={session}
        onUsageChange={(usage) => setSession((prev) => (prev ? { ...prev, usage } : prev))}
        onConversationUpdate={handleConversationUpdate}
        loadUsage={loadUsage}
      />
    </div>
  );
}

type ChatWorkspaceProps = {
  session: SessionState;
  onUsageChange: (usage: UsageSnapshot) => void;
  onConversationUpdate: (conversation: StoredConversation) => void;
  loadUsage: (conversationId: string) => Promise<UsageSnapshot>;
};

function ChatWorkspace({ session, onUsageChange, onConversationUpdate, loadUsage }: ChatWorkspaceProps) {
  const [modelId, setModelId] = useState(session.conversation.modelId || DEFAULT_CHAT_MODEL_ID);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const hasStartedRef = useRef(session.conversation.messageCount > 0);
  const persistedIds = useRef(new Set(session.messages.map((message) => message.id)));

  const readyAttachments = attachments.filter(
    (attachment) => attachment.status === "ready" && typeof attachment.url === "string"
  );

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    id: session.conversation.id,
    api: "/api/chat",
    initialMessages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
    })),
    body: {
      conversationId: session.conversation.id,
      modelId,
      attachments: readyAttachments.map(({ id, name, size, type, url }) => ({ id, name, size, type, url })),
      isNewConversation: !hasStartedRef.current,
    },
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

  useEffect(() => {
    const persistNewMessages = async () => {
      const unsaved = messages.filter((message) => !persistedIds.current.has(message.id));
      if (!unsaved.length) return;
      for (const message of unsaved) {
        if (!isSupportedRole(message.role)) continue;
        await saveMessage({
          id: message.id,
          conversationId: session.conversation.id,
          role: message.role,
          content: message.content,
          createdAt: new Date().toISOString(),
        });
        persistedIds.current.add(message.id);
      }
      const firstUserMessage = unsaved.find((message) => message.role === "user");
      if (firstUserMessage && !session.conversation.title) {
        const updatedConversation: StoredConversation = {
          ...session.conversation,
          title: deriveTitle(firstUserMessage.content),
        };
        await updateConversationMeta(session.conversation.id, { title: updatedConversation.title });
        onConversationUpdate(updatedConversation);
      }
    };
    persistNewMessages().catch((err) => console.error(err));
  }, [messages, onConversationUpdate, session.conversation]);

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

  return (
    <section className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Conversation</p>
          <h1 className="text-3xl font-bold text-slate-900">{session.conversation.title || "New chat"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Model preferences, usage counters, and attachments live only in your browser storage.
          </p>
        </div>
        <ModelPicker modelId={modelId} onChange={setModelId} />
      </div>

      <MessageList messages={messages} isStreaming={isLoading} />

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
      />
    </section>
  );
}

async function createEmptyConversation({ modelId }: { modelId: string }) {
  const now = new Date().toISOString();
  const conversation: StoredConversation = {
    id: nanoid(10),
    title: "New chat",
    modelId,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  await createConversation(conversation);
  return conversation;
}

function deriveTitle(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= 50) return trimmed;
  return `${trimmed.slice(0, 47)}…`;
}

const SUPPORTED_ROLES = new Set<Message["role"]>(["user", "assistant", "system"]);

function isSupportedRole(role: Message["role"]): role is "user" | "assistant" | "system" {
  return SUPPORTED_ROLES.has(role);
}
