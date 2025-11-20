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
    id: "chatgpt-flash",
    vendor: "openai",
    name: "ChatGPT Flash",
    description: "Fastest ChatGPT tier for general use",
    providerModelId: "gpt-4.1-mini",
    isEnabled: true,
  },
  {
    id: "chatgpt-lite",
    vendor: "openai",
    name: "ChatGPT Lite",
    description: "Lower-cost ChatGPT option for lighter prompts",
    providerModelId: "gpt-4o-mini",
    isEnabled: true,
  },
  {
    id: "gemini-25-flash",
    vendor: "google",
    name: "Gemini 2.5 Flash",
    description: "Google’s multimodal flagship (coming soon)",
    providerModelId: "gemini-2.5-flash",
    isEnabled: false,
  },
  {
    id: "gemini-25-lite",
    vendor: "google",
    name: "Gemini 2.5 Lite",
    description: "Efficiency tuned Gemini (coming soon)",
    providerModelId: "gemini-2.5-flash-lite",
    isEnabled: false,
  },
  {
    id: "llama-3-70b",
    vendor: "meta",
    name: "Llama 3 70B",
    description: "Open model for long reasoning",
    providerModelId: "llama-3-70b",
    isEnabled: false,
  },
  {
    id: "mistral-large",
    vendor: "mistral",
    name: "Mistral Large",
    description: "High-performance open alternative",
    providerModelId: "mistral-large",
    isEnabled: false,
  },
];

export const DEFAULT_CHAT_MODEL_ID = "chatgpt-flash";

export const ENABLED_MODEL_IDS = CHAT_MODELS.filter((model) => model.isEnabled).map((model) => model.id);
