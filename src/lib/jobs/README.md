# Job Search System

Job search functionality for the SportsNaukri chat system.

## Files Overview

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces for jobs, filters, responses |
| `tools.ts` | AI tool schema for searchJobs |
| `service.ts` | Core job fetching and filtering logic |
| `telemetry.ts` | Client-side search quality tracking |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              AI Chat Request                         │
│   "Find football coach jobs in Mumbai"               │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│          /api/chat (searchJobs tool)                 │
│   Calls fetchJobs() with filters                     │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│           lib/jobs/service.ts                        │
├──────────────────────────────────────────────────────┤
│  1. Extract location keywords from search            │
│  2. Fetch from WordPress API                         │
│  3. Apply client-side filters                        │
│  4. Fallback if low results                          │
│  5. Annotate with resume relevance                   │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│        WordPress API (sportsnaukri.com)              │
│   Returns job listings as custom post types          │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│              JobResponse                             │
│   Clean job data with relevance scores                │
└──────────────────────────────────────────────────────┘
```

## Key Features

### Smart Location Extraction
The service automatically extracts location keywords from search queries:
- **Recognized locations**: Mumbai, Delhi, Bangalore, Remote, etc.
- **Broad terms**: "India", "nationwide" → no location filter
- **Example**: "Find jobs in Mumbai" → location filter applied

### Fallback Search
When initial search returns < desired results:
1. Remove search keywords
2. Keep location and job type filters
3. Fetch broader set of jobs
4. Mark response with `broadenedSearch: true`

### Resume Relevance Scoring
When user has uploaded resume:
- Match job against skill keywords
- Match against general keywords
- Return matching keywords in `relevance` field
- UI highlights matched skills

### Telemetry Tracking
Records "interesting" searches to localStorage:
- Searches with < 3 results
- Searches that triggered fallback
- Used for debugging and quality improvement

## Usage Example

```typescript
import { fetchJobs } from '@/lib/jobs/service';

// Basic search
const results = await fetchJobs({
  search: "football coach",
  location: "Mumbai",
  limit: 10
});

// With resume context
const results = await fetchJobs({
  search: "marketing",
  skillKeywords: ["social media", "SEO", "analytics"],
  generalKeywords: ["sports", "marketing"],
  resumeSummary: "5 years experience in sports marketing",
  telemetry: {
    conversationId: "abc123",
    requestId: crypto.randomUUID(),
  }
});
```

## WordPress API

Jobs are fetched from: `https://sportsnaukri.com/wp-json/wp/v2/job_listing`

### Custom Meta Fields
- `_job_employer_name`: Company name
- `_job_location`: Location object
- `_job_type`: Job type object
- `_job_category`: Category object
- `_job_qualification`: Required qualification
- `_job_experience`: Experience level
- `_job_salary` / `_job_max_salary`: Salary range

## Data Flow

1. **AI Tool Call**: AI decides to search for jobs based on user query
2. **Service Layer**: `fetchJobs()` processes filters and calls WordPress API
3. **Transform**: Raw WordPress data → clean `Job` objects
4. **Filter**: Client-side filtering (location, type, keywords)
5. **Relevance**: Match against resume if available
6. **Response**: Return paginated results with metadata
7. **UI**: Jobs displayed as interactive cards in chat
