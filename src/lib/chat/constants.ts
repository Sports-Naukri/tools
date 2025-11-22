export const DAILY_CHAT_LIMIT = 5;
export const MESSAGES_PER_CHAT_LIMIT = 10;
export const CHAT_TTL_SECONDS = 86_400; // 24 hours

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

export const CHAT_MODELS: ChatModel[] = [
  {
    id: "standard",
    vendor: "openai",
    name: "Standard",
    description: "Balanced SportsNaukri coach (GPT-5 Nano)",
    providerModelId: "gpt-5-nano",
    isEnabled: true,
  },
  {
    id: "advanced",
    vendor: "openai",
    name: "Advanced",
    description: "Coming soon: deeper reasoning mode",
    providerModelId: "gpt-5.1",
    isEnabled: false,
  },
];

export const DEFAULT_CHAT_MODEL_ID = "standard";

export const ENABLED_MODEL_IDS = CHAT_MODELS.filter((model) => model.isEnabled).map((model) => model.id);
