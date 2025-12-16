# Resume Context System

Resume upload and profile extraction for personalized AI responses.

## Files Overview

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces for profiles and extraction |
| `storage.ts` | IndexedDB storage for resume profiles |
| `parser.ts` | Client-side file parsing (PDF, DOCX, DOC, TXT) |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│           User Uploads Resume File                       │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│     ResumeUploadDialog (Client Component)                │
├──────────────────────────────────────────────────────────┤
│  1. Parse file locally (parser.ts)                       │
│  2. Extract raw text                                      │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│     POST /api/resume/extract                              │
├──────────────────────────────────────────────────────────┤
│  1. Use AI to extract structured data                    │
│  2. Return ExtractedProfile                               │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│     IndexedDB (storage.ts)                                │
├──────────────────────────────────────────────────────────┤
│  - Single profile storage ("global" ID)                  │
│  - Context toggle state                                   │
│  - Upload tracking for rate limiting                      │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│     Chat API (/api/chat)                                  │
├──────────────────────────────────────────────────────────┤
│  If contextEnabled:                                       │
│    - Inject profile into system prompt                    │
│    - Personalize job search results                       │
│    - Use skills for relevance matching                    │
└──────────────────────────────────────────────────────────┘
```

## Key Features

### Single Profile Storage
- Only one resume stored at a time (ID: "global")
- New upload replaces previous profile
- Stored in IndexedDB for persistence

### Rate Limiting
- **3 uploads per day** (client-side tracking)
- Upload records stored with timestamps
- Old records cleaned up after 24 hours

### Context Toggle
- User can enable/disable resume context
- When enabled: AI uses profile data for responses
- When disabled: Profile stays in storage but isn't used
- Toggle state persists across sessions

### File Parsing
Supports multiple resume formats:
- **PDF**: Mozilla PDF.js (client-side)
- **DOCX**: Mammoth.js (HTML conversion)
- **DOC**: Basic text extraction
- **TXT**: Plain text

### AI Extraction
Raw text → Structured profile:
```typescript
{
  name: "John Doe",
  email: "john@example.com",
  skills: ["JavaScript", "React", "Node.js"],
  experience: [
    {
      title: "Software Engineer",
      company: "Tech Corp",
      duration: "2020-2023"
    }
  ],
  education: [...],
  certifications: [...]
}
```

## Usage Example

### Upload Resume
```typescript
import { parseResumeFile } from '@/lib/resume/parser';
import { saveProfile } from '@/lib/resume/storage';

// Parse file
const file = event.target.files[0];
const parsed = await parseResumeFile(file);

// Extract with AI
const response = await fetch('/api/resume/extract', {
  method: 'POST',
  body: JSON.stringify({ rawText: parsed.text })
});
const { profile } = await response.json();

// Save to IndexedDB
await saveProfile(profile);
```

### Check Context State
```typescript
import { isContextEnabled, getProfile } from '@/lib/resume/storage';

const enabled = await isContextEnabled();
if (enabled) {
  const profile = await getProfile();
  // Use profile...
}
```

### Toggle Context
```typescript
import { setContextEnabled } from '@/lib/resume/storage';

await setContextEnabled(false); // Disable context
await setContextEnabled(true);  // Enable context
```

## Data Flow

1. **Upload**: User selects resume file → `parseResumeFile()`
2. **Extract**: Raw text → `/api/resume/extract` → `ExtractedProfile`
3. **Store**: Profile → IndexedDB (single "global" record)
4. **Context**: If enabled → injected into chat prompts
5. **Personalization**:
   - Job search: Match against skills
   - Document generation: Pre-fill user info
   - Suggestions: Career-relevant prompts

## Rate Limiting Details

### Client-Side (3/day)
- Tracked in `resumeDb.uploads` table
- Checked before showing upload dialog
- Resets at midnight (local time)
- Used to prevent abuse

### Server-Side
- No server-side rate limiting for extraction
- API key rate limits apply (OpenAI)

## Storage Schema

### `profiles` Table
```typescript
{
  id: "global",           // Always "global" (single profile)
  profile: ExtractedProfile,
  contextEnabled: boolean,
  createdAt: string,
  updatedAt: string
}
```

### `uploads` Table
```typescript
{
  id: string,             // UUID
  fileName: string,
  uploadedAt: string      // ISO 8601 timestamp
}
```
