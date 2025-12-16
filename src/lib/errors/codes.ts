/**
 * Chat Error Codes
 * 
 * Simple error code system for the chat API.
 * Codes are strings like "E1001" for easy logging and debugging.
 * 
 * Code Ranges:
 * - E1xxx: Rate limiting errors
 * - E2xxx: AI/Model errors  
 * - E3xxx: Validation errors
 * - E5xxx: Server errors
 */

// Error codes as simple string constants (easy to debug)
export const ChatErrorCode = {
    // Rate limiting (1xxx)
    RATE_LIMIT_EXCEEDED: "E1001",      // OpenAI rate limit hit
    DAILY_LIMIT_REACHED: "E1002",      // Daily chat quota exceeded
    CHAT_LIMIT_REACHED: "E1003",       // Per-conversation limit reached

    // AI/Model errors (2xxx)
    EMPTY_RESPONSE: "E2001",           // AI returned empty content (usually rate limit)
    MODEL_UNAVAILABLE: "E2002",        // Model not available
    STREAM_INTERRUPTED: "E2003",       // Streaming was interrupted

    // Validation errors (3xxx)
    INVALID_PAYLOAD: "E3001",          // Request payload failed validation
    ATTACHMENT_ERROR: "E3002",         // Problem with file attachment
    MESSAGE_TOO_LONG: "E3003",         // Input text exceeds limit

    // Server errors (5xxx)
    INTERNAL_ERROR: "E5001",           // Unexpected server error
    API_KEY_MISSING: "E5002",          // OpenAI API key not configured
} as const;

export type ChatErrorCodeValue = typeof ChatErrorCode[keyof typeof ChatErrorCode];

// User-friendly messages for each error code
export const ErrorMessages: Record<ChatErrorCodeValue, string> = {
    [ChatErrorCode.RATE_LIMIT_EXCEEDED]: "The AI is currently busy. Please wait a moment and try again.",
    [ChatErrorCode.DAILY_LIMIT_REACHED]: "You've reached your daily chat limit. Come back tomorrow!",
    [ChatErrorCode.CHAT_LIMIT_REACHED]: "Message limit reached for this conversation. Start a new chat.",
    [ChatErrorCode.EMPTY_RESPONSE]: "The AI couldn't generate a response. Please try again.",
    [ChatErrorCode.MODEL_UNAVAILABLE]: "This model is currently unavailable. Please try a different one.",
    [ChatErrorCode.STREAM_INTERRUPTED]: "The connection was interrupted. Please try again.",
    [ChatErrorCode.INVALID_PAYLOAD]: "Invalid request. Please refresh and try again.",
    [ChatErrorCode.ATTACHMENT_ERROR]: "There was a problem with your attachment.",
    [ChatErrorCode.MESSAGE_TOO_LONG]: "Your message is too long. Please shorten it.",
    [ChatErrorCode.INTERNAL_ERROR]: "Something went wrong. Please try again.",
    [ChatErrorCode.API_KEY_MISSING]: "AI service is not configured. Contact support.",
};

// Helper to get user message from error code
export function getErrorMessage(code: ChatErrorCodeValue): string {
    return ErrorMessages[code] ?? ErrorMessages[ChatErrorCode.INTERNAL_ERROR];
}

// Structured error response type
export interface ChatErrorResponse {
    error: string;           // User-friendly message
    code: ChatErrorCodeValue; // Error code for debugging
    details?: string;        // Technical details (for terminal logs)
}
