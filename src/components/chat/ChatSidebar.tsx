"use client";

import type { ReactNode } from "react";
import { Clock, MessageCircle, PlusCircle } from "lucide-react";
import clsx from "clsx";

import type { UsageSnapshot } from "@/lib/chat/types";
import type { StoredConversation } from "@/lib/chat/storage";

const primary = "#007FF6";

type ChatSidebarProps = {
  usage: UsageSnapshot | null;
  conversations: StoredConversation[];
  activeConversationId: string;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
};

export function ChatSidebar({
  usage,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
}: ChatSidebarProps) {
  return (
    <aside className="hidden w-full max-w-[300px] flex-col gap-4 rounded-3xl border border-border/60 bg-white/90 p-5 shadow-sm backdrop-blur-md lg:flex">
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">SPORTSNAUKRI</p>
        <h2 className="text-2xl font-bold text-slate-900">AI Chat</h2>
        <p className="text-sm text-slate-500">
          Ask questions about roles, resumes, and career moves with instant AI help.
        </p>
      </header>

      <button
        type="button"
        onClick={onNewChat}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary-color,#007FF6)] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-200 transition hover:shadow-xl"
      >
        <PlusCircle className="h-5 w-5" /> Start new chat
      </button>

      <UsageCard
        icon={<Clock className="h-5 w-5" strokeWidth={2} />}
        title="Today’s usage"
        label="Chats left"
        value={`${usage?.daily.remaining ?? "-"}/${usage?.daily.limit ?? "-"}`}
        helper={`${usage?.daily.used ?? 0} used · resets at midnight`}
      />

      <UsageCard
        icon={<MessageCircle className="h-5 w-5" strokeWidth={2} />}
        title="Current chat"
        label="Messages left"
        value={`${usage?.chat.remaining ?? "-"}/${usage?.chat.limit ?? "-"}`}
        helper={`${usage?.chat.used ?? 0} used in this conversation`}
        accent="bg-[#B4D6F6] text-slate-900"
      />

      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span>Recent chats</span>
          <span>{conversations.length}</span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {conversations.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              You haven’t saved a conversation yet. Start a new chat to log your questions locally.
            </p>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className={clsx(
                "w-full rounded-2xl border border-transparent px-4 py-3 text-left text-sm transition",
                conversation.id === activeConversationId
                  ? "bg-[#E6F1FF] text-slate-900 shadow-sm"
                  : "bg-slate-50/60 text-slate-600 hover:bg-slate-100"
              )}
            >
              <p className="line-clamp-2 font-semibold text-slate-900">
                {conversation.title || "Untitled conversation"}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(conversation.updatedAt).toLocaleString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </button>
          ))}
        </div>
      </div>

      <footer className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
        Chats, messages, and attachments stay on this device. Usage limits are enforced via IP-only counters.
      </footer>
    </aside>
  );
}

function UsageCard({
  icon,
  title,
  label,
  value,
  helper,
  accent,
}: {
  icon: ReactNode;
  title: string;
  label: string;
  value: string;
  helper: string;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: primary }}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", accent ?? "bg-white text-slate-500")}>{helper}</span>
      </div>
    </div>
  );
}
