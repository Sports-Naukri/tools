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
  variant?: "desktop" | "mobile";
  onClose?: () => void;
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
  variant = "desktop",
  onClose,
}: ChatSidebarProps) {
  const isMobile = variant === "mobile";
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

  const computedWidth = isCollapsed ? COLLAPSED_WIDTH : sidebarWidth;
  const widthStyle = isMobile ? "min(92vw, 360px)" : `${computedWidth}px`;

  return (
    <aside
      style={{ width: widthStyle }}
      className={clsx(
        "relative flex h-full flex-col bg-[#F9F9F9] border-r border-slate-200 transition-all duration-300 ease-in-out",
        isMobile && "shadow-2xl",
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
              <svg
                viewBox="0 0 1000 1000"
                width={24}
                height={24}
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
                className="shrink-0"
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
              <span className="text-sm font-bold tracking-tight">
                SportsNaukri
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {isMobile && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
                title="Close sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
            {!isMobile && (
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
            )}
          </div>
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
            <span className="whitespace-nowrap overflow-hidden">
              {isDailyLimitReached ? "Limit Reached" : "New Chat"}
            </span>
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
          {!isCollapsed &&
            visibleConversations.map((conversation) => (
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
                  className="flex-1 text-left text-sm py-2 px-3 overflow-hidden"
                  title={conversation.title || "Untitled conversation"}
                >
                  <div className="truncate whitespace-nowrap pr-6">
                    {conversation.title || (
                      <span className="italic text-slate-400">
                        Untitled conversation
                      </span>
                    )}
                  </div>
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
                <span>Messages Remaining</span>
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
                      : usage.daily.remaining < 5
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
