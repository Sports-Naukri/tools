# Shared Utilities (`src/lib`)

Core utility modules for the Sports Naukri application.

## Directory Structure

| Module | Description |
|--------|-------------|
| `analytics/` | Telemetry and logging utilities (e.g., attachment failures). |
| `blob.ts` | Vercel Blob storage client wrapper. |
| `canvas/` | Document generation logic. See [canvas/README.md](./canvas/README.md). |
| `chat/` | Chat utility functions (streaming, storage). See [chat/README.md](./chat/README.md). |
| `errors/` | Standardized error definitions (codes, messages). See [errors/README.md](./errors/README.md). |
| `jobs/` | Job search API client and types. |
| `resume/` | Resume parsing and extraction utilities. |
| `skills/` | Skill mapping and gap analysis logic. |
| `siteContent.ts` | Static content definitions for the landing page. |
| `rateLimiter.ts` | Upstash Redis-based rate limiting. |
| `time.ts` | Time formatting helpers. |

## Key Concepts

### Error Handling
We use a centralized error code system (`lib/errors/codes.ts`) to ensure consistent debugging and user-facing messages. Always use `ChatErrorCode` when throwing or returning errors from API routes.

### Storage
- **Blob**: Uses Vercel Blob for file storage (`lib/blob.ts`).
- **KV/Redis**: Uses Upstash for rate limiting (`lib/rateLimiter.ts`).
- **IndexedDB**: Uses client-side storage for chat history (`lib/chat/storage.ts`).
