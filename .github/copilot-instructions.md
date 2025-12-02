# AI Agent Onboarding

## Architecture & Pages
- Next.js 16 App Router project (`src/app`) with two surfaces: the marketing home (`page.tsx` + `components/*`) and the chat workspace (`app/chat/page.tsx`).
- Shared UI state lives in client components such as `HomePageClient`, `ChatPageClient`, and Tailwind 4 utility classes inlined per component; global tokens live in `app/globals.css`.
- Marketing content is data-driven via `lib/siteContent.ts`; keep CTAs/images in sync with `public/` assets instead of hardcoding per component.

## Chat Workflow
- Client chat state is managed by `useChat` from `@ai-sdk/react` inside `ChatPageClient`; renderable messages are persisted in IndexedDB via Dexie helpers in `lib/chat/storage.ts`.
- Server-side streaming happens in `app/api/chat/route.ts`, which converts UI messages to AI SDK messages, applies the `systemPrompt`, and exposes the `generateDocument` tool (`lib/canvas/documents.ts`).
- Conversation bootstrapping relies on locally generated IDs (`nanoid(10)`); never assume the API creates conversations—persist via `createConversation/saveMessage` before invoking remote calls.

## Attachments & Canvas Documents
- Attachment limits, types, and size caps must match `lib/chat/attachments.ts` (5 files, 5 MB, png/jpeg/webp/pdf); reuse `ensureValidAttachments` on both client and server code paths.
- `/api/upload` streams files to Vercel Blob via `lib/blob.ts`; this route sanitizes filenames, enforces type/size, and returns the public URL referenced in chat parts.
- Document tool outputs arrive as `tool-generateDocument` parts; always run them through `isGeneratedDocument` and `ensureDocumentSummaryInMessage` so `CanvasPanel` can display synced artifacts.

## Rate Limiting & Usage Feedback
- Usage quotas live in `lib/rateLimiter.ts`: 5 chats/day (`DAILY_CHAT_LIMIT`) and 10 messages/chat; limits default to in-memory counters locally but require Vercel KV (`KV_REST_API_URL` + `KV_REST_API_TOKEN`) in production.
- `/api/chat/usage` exposes live quota snapshots per IP + conversation and powers the composer banners—call it whenever a conversation changes to keep UX consistent.

## Environment & Scripts
- Minimum env vars: `OPENAI_API_KEY`, `OPENAI_PROJECT`, optional `OPENAI_ORGANIZATION`, `BLOB_READ_WRITE_TOKEN`, and Vercel KV creds. Use `.env.local` for the Next.js app and `.env` inside `external-assets/SportsNaukri-GPT/` for the middleware.
- Primary npm scripts: `npm run dev` (Next dev server), `npm run build`, `npm run start`, `npm run lint`. Tailwind 4 is configured globally; no separate config file.

## External API Middleware
- The `external-assets/SportsNaukri-GPT` folder is a standalone Express service deployed to Vercel for ChatGPT Actions. It fetches WordPress job listings, rate-limits via `express-rate-limit`, and exposes `/api/jobs` plus `/api/openapi.json` as defined in `chatgpt-action-config.json`.
- When adjusting job data, work inside `server.js` helpers (`cleanJobData`, `extractLocationNames`, etc.) and keep responses under 800 chars per job to satisfy the GPT Action payload constraints.

## Conventions & Tips
- Prefer `cache(getSiteContent)` for static data providers and avoid mutating returned objects; this keeps Next.js revalidation (`export const revalidate = 3600`) effective.
- Client-side effects must guard against SSR by checking `typeof window !== "undefined"` (see chat canvas state). Copy that pattern when touching localStorage/Resize APIs.
- When adding models, update `lib/chat/constants.ts` and ensure the IDs stay in sync with `ChatComposer`'s picker.
- Keep logging terse but structured (see `/api/chat` token usage + rate-limiter logs) so Vercel observability remains readable.
