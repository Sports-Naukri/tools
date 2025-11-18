export const DAILY_CHAT_LIMIT = 5;
export const MESSAGES_PER_CHAT_LIMIT = 10;
export const CHAT_TTL_SECONDS = 86_400; // 24 hours

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
};

export const CHAT_MODELS: ChatModel[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast, lower-cost responses",
    isEnabled: true,
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    description: "Balanced speed and quality",
    isEnabled: true,
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    description: "Locked placeholder for future tier",
    isEnabled: false,
  },
  {
    id: "gpt-4.1-pro",
    name: "GPT-4.1 Pro",
    description: "Locked placeholder for future tier",
    isEnabled: false,
  },
];

export const DEFAULT_CHAT_MODEL_ID = CHAT_MODELS.find((model) => model.isEnabled)?.id ??
  "gpt-4o-mini";
