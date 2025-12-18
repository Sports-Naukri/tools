/**
 * AI SDK Tool Types
 *
 * Extended types for handling AI tool invocations in the chat UI.
 * Bridges the gap between AI SDK's native types and our storage/display needs.
 *
 * Tool invocations are used for:
 * - Job search results (searchJobs tool)
 * - Document generation (generateDocument tool)
 * - Skill mapping (skill_mapper tool)
 *
 * @module lib/chat/tooling
 * @see {@link ../jobs/tools.ts} for job search tool definition
 * @see {@link ../canvas/documents.ts} for document generation tool
 */

import type { UIMessage } from "@ai-sdk/react";

// ============================================================================
// Tool Invocation Types
// ============================================================================

/**
 * Possible states of a tool invocation.
 * - "call": Tool has been called, awaiting execution
 * - "partial-call": Streaming partial results (for real-time display)
 * - "result": Tool execution complete, result available
 */
export type ToolInvocationState = "call" | "partial-call" | "result";

/**
 * Record of a single tool invocation.
 *
 * Captures the full lifecycle of an AI tool call:
 * from initial invocation through to final result.
 * Used for both storage and real-time display during streaming.
 *
 * @property toolCallId - Unique identifier for this specific tool call
 * @property toolName - Name of the tool (e.g., "searchJobs", "generateDocument")
 * @property args - Arguments passed to the tool (varies by tool type)
 * @property result - Result returned by tool execution (undefined until complete)
 * @property state - Current lifecycle state of the invocation
 */
export type ToolInvocationRecord = {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result?: unknown;
  state: ToolInvocationState;
};

// ============================================================================
// Extended Message Types
// ============================================================================

/**
 * Extended message type that supports tool invocations.
 *
 * Extends AI SDK's UIMessage with tool invocation data for rich interactions.
 * Used throughout the UI to render tool results like job cards and documents.
 *
 * @example
 * ```tsx
 * function MessageRenderer({ message }: { message: ToolAwareMessage }) {
 *   if (message.toolInvocations?.some(t => t.toolName === 'searchJobs')) {
 *     return <JobSearchResults invocations={message.toolInvocations} />;
 *   }
 *   return <TextMessage content={message.content} />;
 * }
 * ```
 */
export type ToolAwareMessage = UIMessage & {
  /** Array of tool invocations attached to this message */
  toolInvocations?: ToolInvocationRecord[];
  /** Arbitrary metadata (e.g. agent identity) from storage */
  data?: Record<string, unknown>;
};
