# Chat Infrastructure

Core utilities and types for the SportsNaukri chat system.

## Files Overview

| File | Purpose |
|------|---------|
| `constants.ts` | Rate limits, model configuration |
| `types.ts` | Core TypeScript types |
| `schemas.ts` | Zod validation schemas |
| `storage.ts` | IndexedDB persistence (Dexie) |
| `attachments.ts` | File validation utilities |
| `tooling.ts` | AI SDK tool extensions |

## Related Files

| File | Purpose |
|------|---------|
| `../rateLimiter.ts` | Server-side rate limiting |
| `../ip.ts` | Client IP extraction |
| `../time.ts` | Time formatting utilities |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat Page (Client)                       │
├─────────────────────────────────────────────────────────────┤
│  ChatPageClient.tsx → ChatComposer.tsx → MessageList.tsx    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   lib/chat (This Module)                    │
├─────────────────────────────────────────────────────────────┤
│  types.ts ─────► schemas.ts ─────► storage.ts (IndexedDB)   │
│  constants.ts    attachments.ts    tooling.ts               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Routes (Server)                      │
├─────────────────────────────────────────────────────────────┤
│  /api/chat ──► rateLimiter.ts ──► ip.ts                     │
│       ↓                                                      │
│  AI SDK (OpenAI)                                            │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Rate Limiting
- **Daily Limit**: 5 new conversations per IP per day (resets at midnight IST)
- **Per-Chat Limit**: 10 messages per conversation (never resets)
- Limits set in `constants.ts`, enforced in `../rateLimiter.ts`

### Storage
- Uses IndexedDB via Dexie.js for client-side persistence
- Stores conversations, messages, and usage snapshots
- Schema defined in `storage.ts`

### Validation
- All API inputs validated with Zod schemas
- Attachment validation includes type, size, and URL checks
- Schemas in `schemas.ts` and `attachments.ts`

## Usage Examples

### Creating a Conversation
```ts
import { createConversation, saveMessage } from '@/lib/chat/storage';

const conversation = await createConversation({
  id: nanoid(10),
  title: "New Chat",
  modelId: "standard",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messageCount: 0,
});
```

### Validating Attachments
```ts
import { ensureValidAttachments } from '@/lib/chat/attachments';

const validAttachments = ensureValidAttachments(userAttachments);
// Throws AttachmentValidationError if invalid
```
