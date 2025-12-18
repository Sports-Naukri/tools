import { redirect } from "next/navigation";

import { generateId } from "@/lib/chat/storage";

export const dynamic = "force-dynamic";

type ChatIndexPageProps = {
  searchParams?: Promise<{ initialMessage?: string }>;
};

/**
 * Chat index page - redirects to a new conversation.
 * Preserves ?initialMessage so the first turn can be auto-seeded.
 */
export default async function ChatIndexPage({
  searchParams,
}: ChatIndexPageProps) {
  const { initialMessage } = (await searchParams) ?? {};
  const newId = generateId();
  const query = initialMessage
    ? `?initialMessage=${encodeURIComponent(initialMessage)}`
    : "";
  redirect(`/chat/${newId}${query}`);
}
