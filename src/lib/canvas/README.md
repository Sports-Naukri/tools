# Canvas & Document Generation

System for generating and exporting structured documents (resumes, cover letters, reports) within the chat interface.

## Files Overview

| File | Purpose |
|------|---------|
| `documents.ts` | Zod schemas and types for document structure |
| `docx.ts` | Client-side export to Microsoft Word (.docx) |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  AI Tool Call                        │
│   "Generate a resume for a marketing role..."        │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│           generateDocument Tool                      │
│   (Returns JSON matching documentInputSchema)        │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│               Canvas UI Component                    │
│   Renders structured document preview                │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│             Export Action (docx.ts)                  │
│   Converts JSON → .docx file → Download              │
└──────────────────────────────────────────────────────┘
```

## Document Structure

Defined in `documents.ts`, a document consists of:

1.  **Title**: Main document title
2.  **Type**: resume, cover_letter, report, or essay
3.  **Sections**: Array of content blocks, each with:
    *   `heading`: Optional section title (e.g., "Experience")
    *   `body`: Main content (supports markdown)
    *   `meta`: Optional context (dates, locations)

## Export Functionality

The `docx.ts` utility handles client-side DOCX generation:

*   **Lazy Loading**: Uses `import("docx")` dynamically to keep the main bundle small.
*   **Styling**: Maps abstract document structure to Word styles:
    *   Document Title → `HeadingLevel.TITLE`
    *   Section Heading → `HeadingLevel.HEADING_1`
    *   Metadata → Italicized, gray text
    *   Body → Standard paragraphs

## Usage Example

### Generating a Document in Chat API

```typescript
// In /app/api/chat/route.ts
generateDocument: tool({
  description: "Create a structured document...",
  inputSchema: documentInputSchema,
  execute: async (input) => {
    return {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
  }
})
```

### Exporting from UI

```typescript
import { exportDocumentToDocx } from '@/lib/canvas/docx';

// On button click
await exportDocumentToDocx(currentDocument);
```
