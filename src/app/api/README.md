# API Routes

REST API endpoints for the SportsNaukri chat system.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Main streaming chat endpoint |
| POST | `/api/chat/title` | Generate conversation title |
| POST | `/api/chat/suggestions` | Generate follow-up suggestions |
| GET | `/api/chat/usage` | Get rate limit status |
| POST | `/api/upload` | Upload file attachment |

## Main Chat API (`/api/chat`)

The core streaming endpoint handling AI conversations.

### Request
```json
{
  "conversationId": "abc123",
  "isNewConversation": true,
  "modelId": "standard",
  "mode": "jay | navigator",
  "messages": [...],
  "resumeContext": { ... }  // Optional
}
```

### Features
- **Streaming responses** via AI SDK
- **Tool calling**: Job search, document generation, skill mapping
- **Rate limiting**: 5 daily conversations, 10 messages per chat
- **Resume context**: Personalized responses when resume uploaded

### Modes
- `jay`: Career coach - friendly, conversational
- `navigator`: Career exploration - analytical, data-driven

## Title API (`/api/chat/title`)

Generates 5-6 word titles for new conversations.

```json
// Request
{ "message": "Help me write a resume", "modelId": "standard" }

// Response
{ "title": "Resume Writing Help" }
```

## Suggestions API (`/api/chat/suggestions`)

Generates 2 follow-up questions after AI responses.

```json
// Request
{
  "conversationId": "...",
  "messageId": "...",
  "assistantText": "...",
  "lastUserText": "..."
}

// Response
{
  "suggestions": [
    { "id": "msg-suggestion-0", "text": "What skills should I highlight?" },
    { "id": "msg-suggestion-1", "text": "Can you review my resume?" }
  ]
}
```

## Usage API (`/api/chat/usage`)

Returns rate limit status for the current user.

```
GET /api/chat/usage?conversationId=xxx
```

```json
{
  "daily": {
    "limit": 5,
    "used": 2,
    "remaining": 3,
    "resetAt": "2024-01-01T18:30:00Z",
    "secondsUntilReset": 36000
  },
  "chat": {
    "limit": 10,
    "used": 4,
    "remaining": 6,
    "resetAt": null,
    "secondsUntilReset": null
  }
}
```

## Upload API (`/api/upload`)

Uploads files to local storage.

### Request
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field: `file`

### Limits
- Max size: 5MB
- Allowed types: PNG, JPEG, WebP, DOC, DOCX, TXT

### Response
```json
{
  "id": "uploads/1234-resume.docx",
  "name": "resume.docx",
  "size": 45678,
  "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "url": "https://..."
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_ORGANIZATION` | No | OpenAI org ID |
| `OPENAI_PROJECT` | No | OpenAI project ID |
| `BLOB_READ_WRITE_TOKEN` | For uploads | Storage token |
| `RATE_LIMIT_TIMEZONE` | No | Timezone for daily reset (default: Asia/Kolkata) |
