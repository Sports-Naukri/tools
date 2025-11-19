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
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Fastest multimodal model",
    isEnabled: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Lightweight and efficient",
    isEnabled: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast, lower-cost responses",
    isEnabled: true,
  },
  {
    id: "llama-3-70b",
    name: "Llama 3 70B",
    description: "Open source powerhouse",
    isEnabled: true,
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    description: "High performance open model",
    isEnabled: true,
  },
];

export const DEFAULT_CHAT_MODEL_ID = "gemini-2.5-flash";
