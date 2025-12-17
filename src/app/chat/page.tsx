import { Suspense } from "react";

import { ChatPageClient } from "@/components/chat/ChatPageClient";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-white via-[#F2F7FD] to-white text-slate-900">
      <Suspense
        fallback={<div className="p-10 text-center text-lg">Loading chat…</div>}
      >
        <ChatPageClient />
      </Suspense>
    </div>
  );
}
