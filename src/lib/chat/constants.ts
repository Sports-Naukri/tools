export const DAILY_CHAT_LIMIT = 5;
export const MESSAGES_PER_CHAT_LIMIT = 10;

export type ChatModel = {
  /** Internal identifier used across client + server */
  id: string;
  /** Provider shown to the user */
  vendor: "openai" | "google" | "anthropic" | "meta" | "mistral" | "other";
  /** Display name in the UI */
  name: string;
  description: string;
  /** Provider specific model identifier */
  providerModelId: string;
  /** Whether the model can actually be selected today */
  isEnabled: boolean;
};

/**
 * Available chat models configuration.
 * Controls which models are visible and selectable in the UI.
 */
export const CHAT_MODELS: ChatModel[] = [
  {
    id: "standard",
    vendor: "openai",
    name: "Standard",
    description: "Balanced SportsNaukri coach (GPT-4o Mini)",
    providerModelId: "gpt-4o-mini",
    isEnabled: true,
  },
  {
    id: "advanced",
    vendor: "openai",
    name: "Advanced",
    description: "Coming soon: deeper reasoning mode",
    providerModelId: "gpt-4o",
    isEnabled: false,
  },
];

export const DEFAULT_CHAT_MODEL_ID = "standard";

export const ENABLED_MODEL_IDS = CHAT_MODELS.filter((model) => model.isEnabled).map((model) => model.id);
