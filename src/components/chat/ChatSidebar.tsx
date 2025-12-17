/**
 * Chat Sidebar Component
 *
 * The main navigation sidebar for the chat interface.
 * Features:
 * - Conversation history list with search
 * - New chat button
 * - Daily usage quota visualization
 * - Resume profile management section
 * - Collapsible state with drag-to-resize functionality
 *
 * @module components/chat/ChatSidebar
 */

"use client";

import clsx from "clsx";
import {
  Lock,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { StoredConversation } from "@/lib/chat/storage";
import type { UsageSnapshot } from "@/lib/chat/types";
import { formatDurationShort } from "@/lib/time";
import { ResumeSection } from "./ResumeSection";

const SIDEBAR_WIDTH_STORAGE_KEY = "sn-chat-sidebar-width";
const DEFAULT_EXPANDED_WIDTH = 320;
const MIN_EXPANDED_WIDTH = 260;
const MAX_EXPANDED_WIDTH = 520;
const COLLAPSED_WIDTH = 60;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type ChatSidebarProps = {
  usage: UsageSnapshot | null;
  conversations: StoredConversation[];
  activeConversationId: string;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
};

/**
 * Sidebar component for the chat interface.
 * Displays the list of conversations, search functionality, and usage quota.
 */
export function ChatSidebar({
  usage,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_EXPANDED_WIDTH;
    }
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_EXPANDED_WIDTH;
    }
    const value = Number.parseInt(stored, 10);
    return Number.isFinite(value)
      ? clamp(value, MIN_EXPANDED_WIDTH, MAX_EXPANDED_WIDTH)
      : DEFAULT_EXPANDED_WIDTH;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

  // Filter conversations based on search query
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

  const isDailyLimitReached = usage ? usage.daily.remaining <= 0 : false;
  const dailyResetLabel = useMemo(() => {
    if (!usage) {
      return "Resets at midnight";
    }
    if (usage.daily.remaining === 0) {
      const countdown = formatDurationShort(usage.daily.secondsUntilReset);
      return countdown ? `Next reset in ${countdown}` : "Waiting for reset";
    }
    return "Resets at midnight";
  }, [usage]);

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      if (isCollapsed) {
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = clamp(
          startWidth + delta,
          MIN_EXPANDED_WIDTH,
          MAX_EXPANDED_WIDTH,
        );
        setSidebarWidth(nextWidth);
      };

      const handleMouseUp = () => {
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [isCollapsed, sidebarWidth],
  );

  return (
    <aside
      style={{ width: `${isCollapsed ? COLLAPSED_WIDTH : sidebarWidth}px` }}
      className={clsx(
        "relative flex h-full flex-col bg-[#F9F9F9] border-r border-slate-200 transition-all duration-300 ease-in-out",
      )}
    >
      <div className="p-4 pb-2">
        <div
          className={clsx(
            "flex items-center mb-6",
            isCollapsed ? "justify-center" : "justify-between px-2",
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-slate-700 font-semibold whitespace-nowrap overflow-hidden">
              <span>Sports Naukri</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-500 hover:text-slate-700 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          disabled={isDailyLimitReached}
          className={clsx(
            "flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
            isCollapsed ? "h-8 w-8 p-0" : "w-full px-4 py-2.5",
            isDailyLimitReached
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-[#006dff] text-white hover:bg-[#0056cc]",
          )}
          title={isDailyLimitReached ? "Daily limit reached" : "New Chat"}
        >
          {isDailyLimitReached ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {!isCollapsed && (
            <span>{isDailyLimitReached ? "Limit Reached" : "New Chat"}</span>
          )}
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
                  : "text-slate-600 hover:bg-slate-200/50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectConversation(conversation.id)}
                className={clsx(
                  "flex-1 text-left text-sm py-2",
                  isCollapsed
                    ? "flex justify-center items-center h-10 w-10"
                    : "px-3",
                )}
                title={conversation.title || "Untitled conversation"}
              >
                {isCollapsed ? (
                  <MessageSquare className="h-4 w-4" />
                ) : conversation.title ? (
                  <span className="line-clamp-1 pr-6">
                    {conversation.title}
                  </span>
                ) : (
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                )}
              </button>

              {!isCollapsed && (
                <button
                  type="button"
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
              {searchQuery
                ? "No conversations match your search."
                : "You have no recent conversations."}
            </div>
          )}
        </div>
      </div>

      {/* Resume Profile Section - above limits */}
      <ResumeSection isCollapsed={isCollapsed} />

      {usage && (
        <div
          className={clsx(
            "border-t border-slate-200 bg-white",
            isCollapsed ? "p-2" : "p-4",
          )}
        >
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Daily Conversations</span>
                <span>
                  {usage.daily.remaining} / {usage.daily.limit}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={clsx(
                    "h-full transition-all duration-500 ease-out",
                    usage.daily.remaining === 0
                      ? "bg-red-500"
                      : usage.daily.remaining < 2
                        ? "bg-amber-500"
                        : "bg-[#006dff]",
                  )}
                  style={{
                    width: `${(usage.daily.remaining / usage.daily.limit) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400">{dailyResetLabel}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="relative h-8 w-8">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className={clsx(
                      "transition-all duration-500 ease-out",
                      usage.daily.remaining === 0
                        ? "text-red-500"
                        : usage.daily.remaining < 5
                          ? "text-amber-500"
                          : "text-[#006dff]",
                    )}
                    strokeDasharray={`${(usage.daily.remaining / usage.daily.limit) * 100}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-600">
                  {usage.daily.remaining}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none"
          onMouseDown={handleResizeStart}
        />
      )}
    </aside>
  );
}
