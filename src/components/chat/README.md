# Chat UI Components

The core user interface for the Sports Naukri chat application.
These components orchestrate the entire chat experience, from message composition to history management and tool visualization.

## Component Hierarchy

```
ChatPageClient (Orchestrator)
├── ChatSidebar
│   ├── ConversationList
│   ├── ResumeSection (Profile Management)
│   └── DailyLimit (Usage Visualization)
├── ChatWorkspace
│   ├── MessageList
│   │   ├── MessageBubble
│   │   │   ├── MarkdownContent
│   │   │   ├── DocumentChip (Canvas Integration)
│   │   │   ├── JobCard (Job Search Integration)
│   │   │   └── ResumeContextChip
│   │   └── LottieAnimations (Loading States)
│   ├── ChatComposer
│   │   ├── ResumeToggle (Context Switcher)
│   │   ├── ModelPicker
│   │   └── AttachmentPreview
│   └── CanvasPanel (Split-screen document view)
```

## Key Components

| Component | Description |
|-----------|-------------|
| `ChatPageClient.tsx` | Top-level client component. Manages session bootstrapping, persistence (IndexedDB), and `useChat` hook integration. |
| `ChatComposer.tsx` | Main input area. Handles text, file attachments, model selection, and mode switching (Jay vs Navigator). |
| `MessageList.tsx` | Renders the chat timeline. Handles markdown rendering, tool invocations, and interactive chips for jobs/documents. |
| `ChatSidebar.tsx` | Navigation sidebar. Manages conversation history, new chats, and daily usage limits. |

## Feature Integrations

### 1. Job Search
- **Input**: User asks for jobs.
- **Process**: AI calls `searchJobs` tool.
- **UI**: `MessageList` renders `JobSearchingAnimation`, then replaces it with `JobCard` (list view) when results arrive.

### 2. Document Generation
- **Input**: User asks for a resume/cover letter.
- **Process**: AI calls `generateDocument` tool.
- **UI**: `MessageList` renders `DocumentGeneratingAnimation`, then `DocumentChip`. Clicking the chip opens the `CanvasPanel`.

### 3. Resume Context (Navigator Mode)
- **Input**: User toggles "Resume On" in `ChatComposer` (`ResumeToggle`).
- **Process**: `ChatWorkspace` loads profile from IndexedDB and injects it into the next message payload.
- **UI**: `MessageList` shows `ResumeContextChip` in the message bubble to indicate context was used.

## State Management

*   **Session State**: `ChatPageClient` manages `messages`, `conversation` metadata, and `usage` snapshots.
*   **Persistence**: All state is saved to IndexedDB via `lib/chat/storage.ts` to persist across reloads.
*   **Streaming**: Uses Vercel AI SDK (`useChat`, `ToolAwareMessage`) for real-time streaming updates.
