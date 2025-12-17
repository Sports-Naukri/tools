import { Suspense } from "react";

import { ChatPageClient } from "@/components/chat/ChatPageClient";

export const dynamic = "force-dynamic";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Dynamic chat page for a specific conversation.
 * - If conversation exists in IndexedDB, loads it
 * - If new ID, creates a new conversation
 */
export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-[#F2F7FD] to-white text-slate-900">
      <Suspense
        fallback={<div className="p-10 text-center text-lg">Loading chat…</div>}
      >
        <ChatPageClient conversationId={id} />
      </Suspense>
    </div>
  );
}
