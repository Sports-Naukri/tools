/**
 * Chat Constants & Configuration
 *
 * This file defines the core configuration for the chat system including:
 * - Rate limiting thresholds (daily conversations, messages per chat)
 * - Available AI models and their configurations
 * - Default settings used across client and server
 *
 * @module lib/chat/constants
 * @see {@link ../rateLimiter.ts} for rate limit enforcement
 * @see {@link ../../app/api/chat/route.ts} for API usage
 */

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Maximum number of messages a user can send globally across all conversations.
 * This limit applies per 12-hour window (controlled by COOLDOWN_DURATION_MS).
 *
 * @constant {number}
 */
export const GLOBAL_MESSAGE_LIMIT = 40;

/**
 * Cooldown duration when limits are exceeded.
 * User must wait this long before they can continue.
 *
 * @constant {number} 12 hours in milliseconds
 */
export const COOLDOWN_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Configuration for an AI chat model.
 * Used to display model options in the UI and route requests to the correct provider.
 */
export type ChatModel = {
  /** Internal identifier used across client + server (e.g., "standard", "advanced") */
  id: string;
  /** AI provider for display purposes */
  vendor: "openai" | "google" | "anthropic" | "meta" | "mistral" | "other";
  /** User-friendly display name in the model selector */
  name: string;
  /** Brief description shown in the UI */
  description: string;
  /** Provider-specific model identifier (e.g., "gpt-4o-mini") */
  providerModelId: string;
  /** Whether the model is currently available for selection */
  isEnabled: boolean;
};

/**
 * Available chat models configuration.
 *
 * Models marked as disabled will appear in the UI but cannot be selected.
 * This allows for "coming soon" placeholders.
 *
 * @constant {ChatModel[]}
 */
export const CHAT_MODELS: ChatModel[] = [
  {
    id: "standard",
    vendor: "openai",
    name: "Standard",
    description: "Balanced SportsNaukri coach",
    providerModelId: "gpt-4o-mini",
    isEnabled: true,
  },
  {
    id: "advanced",
    vendor: "openai",
    name: "Advanced",
    description: "Coming soon: deeper reasoning",
    providerModelId: "gpt-4o",
    isEnabled: false,
  },
];

// ============================================================================
// Derived Constants
// ============================================================================

/** Default model ID used when no model is explicitly selected */
export const DEFAULT_CHAT_MODEL_ID = "standard";

/** List of model IDs that are currently enabled and selectable */
export const ENABLED_MODEL_IDS = CHAT_MODELS.filter(
  (model) => model.isEnabled,
).map((model) => model.id);

/** Tool name used for generating follow-up question suggestions */
export const FOLLOWUP_TOOL_NAME = "followup_suggestions";
