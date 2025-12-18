# Chat Error Codes

This document lists all error codes used in the chat API for debugging and support purposes.

## Code Ranges

| Range | Category | Description |
|-------|----------|-------------|
| E1xxx | Rate Limiting | Quota and rate limit errors |
| E2xxx | AI/Model | AI response and model errors |
| E3xxx | Validation | Request validation errors |
| E5xxx | Server | Server-side errors |

---

## Error Code Reference

### Rate Limiting (E1xxx)

| Code | Name | Description | User Message |
|------|------|-------------|--------------|
| E1001 | RATE_LIMIT_EXCEEDED | OpenAI API rate limit hit (RPM/TPM) | "The AI is currently busy. Please wait a moment and try again." |
| E1002 | DAILY_LIMIT_REACHED | User exceeded daily chat quota | "You've reached your daily chat limit. Come back tomorrow!" |
| E1003 | CHAT_LIMIT_REACHED | Message limit reached for conversation | "Message limit reached for this conversation. Start a new chat." |

### AI/Model Errors (E2xxx)

| Code | Name | Description | User Message |
|------|------|-------------|--------------|
| E2001 | EMPTY_RESPONSE | AI returned empty or no content | "The AI couldn't generate a response. Please try again." |
| E2002 | MODEL_UNAVAILABLE | Selected model is not available | "This model is currently unavailable. Please try a different one." |
| E2003 | STREAM_INTERRUPTED | Streaming response was cut off | "The connection was interrupted. Please try again." |

### Validation Errors (E3xxx)

| Code | Name | Description | User Message |
|------|------|-------------|--------------|
| E3001 | INVALID_PAYLOAD | Request body failed Zod validation | "Invalid request. Please refresh and try again." |
| E3002 | ATTACHMENT_ERROR | File attachment URL or format issue | "There was a problem with your attachment." |
| E3003 | MESSAGE_TOO_LONG | Input exceeds MAX_INPUT_LENGTH | "Your message is too long. Please shorten it." |

### Server Errors (E5xxx)

| Code | Name | Description | User Message |
|------|------|-------------|--------------|
| E5001 | INTERNAL_ERROR | Unexpected server error | "Something went wrong. Please try again." |
| E5002 | API_KEY_MISSING | OPENAI_API_KEY not configured | "AI service is not configured. Contact support." |

---

## Usage

### In API Routes

```typescript
import { ChatErrorCode, getErrorMessage, ChatErrorResponse } from "@/lib/errors/codes";

// Return structured error
return NextResponse.json<ChatErrorResponse>({
  error: getErrorMessage(ChatErrorCode.RATE_LIMIT_EXCEEDED),
  code: ChatErrorCode.RATE_LIMIT_EXCEEDED,
  details: "OpenAI 429: Rate limit exceeded",
}, { status: 429 });
```

### In Frontend

```typescript
import { ChatErrorCode, getErrorMessage } from "@/lib/errors/codes";

if (response.code === ChatErrorCode.RATE_LIMIT_EXCEEDED) {
  showRetryButton();
}
```

---

## Debugging

When an error occurs:
1. Check the **browser network tab** for the error response with `code` field
2. Check the **terminal** for detailed logs prefixed with emoji (🔴, ⚠️)
3. Look up the code in this document for context
