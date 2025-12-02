# Job Search Improvement Plan

This document outlines the stages for refining the job search functionality in the `sn-chat` application.

## Phase 1: UI Cleanup & Client-Side Pagination (Completed)
**Goal:** Improve the visual presentation and handle larger result sets gracefully without overwhelming the chat.

- [x] **Remove Company Logo**:
    - [x] Edit `src/components/chat/JobCard.tsx` to remove the image rendering logic.
- [x] **Implement "Show More" Functionality**:
    - [x] Update `src/lib/jobs/tools.ts` (or `service.ts`) to increase the default fetch limit (e.g., fetch 20 jobs per request).
    - [x] Update `src/components/chat/JobCard.tsx` (specifically the `JobList` component):
        - [x] Add local state `visibleCount` (default 3 or 5).
        - [x] Implement a "Show More" button that increases `visibleCount`.
        - [x] Update the "Found X jobs" text to reflect "Showing Y of X".

## Phase 2: Job Context Integration ("Ask about this job") (Completed)
**Goal:** Allow users to select a specific job and ask follow-up questions about it.

- [x] **State Management**:
    - [x] Add `selectedJob` state to `ChatWorkspace` (in `ChatPageClient.tsx`).
    - [x] Define the `JobContext` type (subset of `Job` needed for context).
- [x] **UI Updates**:
    - [x] Update `JobCard` to include an "Ask about this job" button.
    - [x] Pass an `onSelectJob` callback down from `ChatWorkspace` -> `MessageList` -> `JobList` -> `JobCard`.
    - [x] Update `ChatComposer` to display a "Selected Job" chip/attachment when `selectedJob` is present.
    - [x] Add a "Remove" button to the job chip in the composer.
- [x] **Context Injection**:
    - [x] Update `handleSubmit` in `ChatWorkspace`:
        - [x] If `selectedJob` is active, append a hidden or explicit context block to the user's message.
        - [x] Format: "Context: User is asking about job [Title] at [Company]. Description: [Description]..."

## Phase 3: Testing & Refinement
- [ ] Verify "Show More" works correctly with the fetched data.
- [ ] Verify "Ask about this job" correctly attaches context and the AI responds relevantly.
- [ ] Ensure only one job can be selected at a time.
