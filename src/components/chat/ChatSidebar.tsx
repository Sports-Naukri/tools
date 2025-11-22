"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { MessageSquare, Plus, Search, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import clsx from "clsx";

import type { UsageSnapshot } from "@/lib/chat/types";
import type { StoredConversation } from "@/lib/chat/storage";

type ChatSidebarProps = {
  usage: UsageSnapshot | null;
  conversations: StoredConversation[];
  activeConversationId: string;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
};

export function ChatSidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return conversations;
    }
    return conversations.filter((conversation) => {
      const title = conversation.title?.toLowerCase() ?? "";
      return title.includes(query);
    });
  }, [conversations, searchQuery]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  const visibleConversations = filteredConversations;

  return (
    <aside 
      className={clsx(
        "flex h-full flex-col bg-[#F9F9F9] border-r border-slate-200 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[60px]" : "w-[260px]"
      )}
    >
      <div className="p-4 pb-2">
        <div className={clsx("flex items-center mb-6", isCollapsed ? "justify-center" : "justify-between px-2")}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-slate-700 font-semibold whitespace-nowrap overflow-hidden">
              <span>Sports Naukri</span>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-500 hover:text-slate-700 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <button
          onClick={onNewChat}
          className={clsx(
            "flex items-center justify-center gap-2 rounded-lg bg-[#006dff] text-sm font-medium text-white hover:bg-[#0056cc] transition-colors",
            isCollapsed ? "h-10 w-10 p-0" : "w-full px-4 py-2.5"
          )}
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span>New Chat</span>}
        </button>

        {!isCollapsed && (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search your threads..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full rounded-lg border-none bg-transparent py-2 pl-9 pr-4 text-sm text-slate-600 placeholder:text-slate-400 focus:ring-0"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        {!isCollapsed && (
          <div className="mb-2 px-2 text-xs font-medium text-slate-500">
            {searchQuery ? "Search results" : "Last 7 Days"}
          </div>
        )}
        <div className="space-y-1">
          {visibleConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={clsx(
                "group relative flex items-center rounded-lg transition-colors",
                conversation.id === activeConversationId
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50"
              )}
            >
              <button
                onClick={() => onSelectConversation(conversation.id)}
                className={clsx(
                  "flex-1 text-left text-sm py-2",
                  isCollapsed ? "flex justify-center px-0" : "px-3"
                )}
                title={conversation.title || "Untitled conversation"}
              >
                {isCollapsed ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <span className="line-clamp-1 pr-6">{conversation.title || "Untitled conversation"}</span>
                )}
              </button>
              
              {!isCollapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {visibleConversations.length === 0 && !isCollapsed && (
            <div className="px-3 py-4 text-xs text-slate-500">
              {searchQuery ? "No conversations match your search." : "You have no recent conversations."}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

