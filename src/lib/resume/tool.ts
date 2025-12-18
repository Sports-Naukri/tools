/**
 * Resume tool for AI agents
 *
 * Agents can call this tool to access the user's latest stored resume profile.
 * The resume is stored client-side in IndexedDB (Dexie) via `lib/resume/storage.ts`,
 * so this tool is intended to be used on the client and injected into the chat
 * request payload as `resumeContext`.
 */

import type { ExtractedProfile } from "@/lib/resume/types";
import { z } from "zod";

export const RESUME_TOOL_NAME = "getResume";

export type ResumeToolResult =
  | {
      hasResume: true;
      profile: ExtractedProfile;
      contextEnabled: boolean;
      message?: string;
    }
  | {
      hasResume: false;
      message: string;
    };

/**
 * Shape is intentionally simple: by default return the whole profile.
 * In the future we can add options to return a trimmed version.
 */
export const resumeToolInputSchema = z
  .object({
    purpose: z
      .string()
      .optional()
      .describe(
        "Why you need the resume (helps the agent explain missing resume).",
      ),
  })
  .optional();

export async function getResumeForAgent(
  purpose?: string,
): Promise<ResumeToolResult> {
  // This function must only run in the browser.
  if (typeof window === "undefined") {
    return {
      hasResume: false,
      message:
        "Resume access is only available in the browser. Please ask the user to upload their resume in the chat UI.",
    };
  }

  const { getProfile, isContextEnabled } = await import("@/lib/resume/storage");
  const [profile, contextEnabled] = await Promise.all([
    getProfile(),
    isContextEnabled(),
  ]);

  if (!profile) {
    return {
      hasResume: false,
      message: `I don't have your resume yet${purpose ? ` (needed for: ${purpose})` : ""}. Please upload your resume (PDF/DOCX) using the Upload Resume button, then tell me once it's uploaded.`,
    };
  }

  return {
    hasResume: true,
    profile,
    contextEnabled,
    message: contextEnabled
      ? "Resume profile loaded."
      : "Resume profile is saved but currently turned off in the UI.",
  };
}
