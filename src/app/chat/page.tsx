import { redirect } from "next/navigation";

import { generateId } from "@/lib/chat/storage";

export const dynamic = "force-dynamic";

/**
 * Chat index page - redirects to a new conversation.
 * Creates a new conversation ID and redirects to /chat/[id]
 */
export default function ChatIndexPage() {
  const newId = generateId();
  redirect(`/chat/${newId}`);
}
