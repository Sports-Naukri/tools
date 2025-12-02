import type { UIMessage } from "@ai-sdk/react";

export type ToolInvocationState = "call" | "partial-call" | "result";

export type ToolInvocationRecord = {
	toolCallId: string;
	toolName: string;
	args: unknown;
	result?: unknown;
	state: ToolInvocationState;
};

/**
 * Extended message type that supports tool invocations and results.
 * Used throughout the UI to handle rich interactions.
 */
export type ToolAwareMessage = UIMessage & {
	toolInvocations?: ToolInvocationRecord[];
};
