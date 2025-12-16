# Skill Mapping System

Career path recommendation system powered by skill-to-role mapping.

## Files Overview

| File | Purpose |
|------|---------|
| `mapper.ts` | Main skill-to-role mapping with 26 skill categories |
| `catalog.ts` | Extended skill definitions for extraction |
| `extract.ts` | Resume skill extraction algorithms |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│           User Provides Skills                       │
│   (via Navigator mode or resume upload)              │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│        mapSkillsToRoles (mapper.ts)                  │
├──────────────────────────────────────────────────────┤
│  1. Fuzzy match skills against SKILL_MAPPINGS        │
│  2. Return matching roles, tools, training            │
│  3. Generate job search keywords                      │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│          SkillMapperOutput                            │
├──────────────────────────────────────────────────────┤
│  - mappings: Array of role matches                   │
│  - unmatchedSkills: Skills not in catalog            │
│  - suggestedSearchKeywords: For job search           │
│  - recommendedTraining: Upskilling suggestions       │
└──────────────────────────────────────────────────────┘
```

## 26 Skill Categories

The mapper supports comprehensive coverage across sports industry roles:

| Category | Skills |
|----------|--------|
| **Analytics** | Data analysis, Statistical modelling, ML, Data viz |
| **Performance** | Performance analysis, S&C, Sports science |
| **Medical** | Physiotherapy, Nutrition |
| **Coaching** | Coaching, Talent scouting |
| **Operations** | Event operations, Venue management |
| **Commercial** | Sponsorship, Marketing, Social media |
| **Media** | Video production, Journalism, PR |
| **Finance** | Finance, accounting |
| **Legal** | Sports law, Contracts |
| **HR** | People ops, Talent acquisition |
| **Tech** | Software dev, Product mgmt, UX/UI |
| **Welfare** | Sports psychology |

## Key Features

### Fuzzy Keyword Matching
Skills are matched using keywords, not exact strings:
```typescript
// User says: "I know Python"
// Matches: "Machine learning" category (keywords: ["python", "ml", "ai"])
```

### Confidence Scoring
Each match includes:
- **Role recommendations** with seniority levels
- **Required tools** for each role
- **Recommended training** paths
- **Job search keywords** for finding relevant jobs

### Resume Skill Extraction
`extract.ts` can automatically extract skills from resume text:
- Catalog matching against SKILL_DEFINITIONS
- Section parsing (finds "Skills" section)
- Confidence scoring (0-1)
- Deduplication

## Usage Examples

### Map Skills to Roles
```typescript
import { mapSkillsToRoles } from '@/lib/skills/mapper';

const result = mapSkillsToRoles({
  skills: ["Python", "data visualization", "SQL"]
});

// Result:
{
  mappings: [
    {
      matchedSkill: "Data analysis",
      function: "Analytics / BI",
      roles: ["Sports Data Analyst", "Fan Insights Analyst"],
      tools: ["Excel", "SQL", "Power BI", "Python (pandas)"],
      training: ["Data Analytics Specialization", "SQL courses"],
      searchKeywords: ["sports data analyst", "fan insights"]
    }
  ],
  unmatchedSkills: [],
  suggestedSearchKeywords: ["sports data analyst"],
  recommendedTraining: ["Data Analytics Specialization"]
}
```

### Extract Skills from Resume
```typescript
import { extractSkillsFromResume } from '@/lib/skills/extract';

const skills = extractSkillsFromResume(resumeText, { limit: 15 });

// Returns:
[
  {
    id: "data-analytics",
    label: "Sports Analytics",
    category: "Data & Insights",
    matches: ["data analyst", "performance dashboard"],
    confidence: 0.87,
    source: "catalog"
  },
  ...
]
```

## AI Integration

The skill mapper is registered as an AI SDK tool in `/api/chat/route.ts`:

```typescript
{
  skill_mapper: tool({
    description: "Map user skills to sports industry roles...",
    inputSchema: skillMapperInputSchema,
    outputSchema: skillMapperOutputSchema,
    execute: (input) => mapSkillsToRoles(input)
  })
}
```

### Navigator Mode Flow
1. User shares skills with AI
2. AI calls `skill_mapper` tool
3. Receives structured role mappings
4. Formats results for user with recommendations

## Skill Database

### SKILL_MAPPINGS (mapper.ts)
26 categories with role mappings:
```typescript
{
  skill: "Data analysis",
  keywords: ["excel", "sql", "data", "analytics"],
  roles: ["Sports Data Analyst", "BI Analyst"],
  tools: ["Excel", "SQL", "Power BI"],
  training:["Data Analytics courses"],
  searchKeywords: ["sports data analyst"]
}
```

### SKILL_DEFINITIONS (catalog.ts)
Extended catalog for extraction:
```typescript
{
  id: "sports-analytics",
  label: "Sports Analytics",
  category: "Data & Insights",
  keywords: ["match analysis", "video analysis"],
  weight: 1.1
}
```

## Confidence Scoring

### Catalog Matching
- **Frequency score** (60%): How often keywords appear
- **Coverage score** (40%): % of keywords matched
- **Weight bonus**: Optional boost for high-value skills
- **Formula**: `min(0.2 + (frequency * 0.6 + coverage * 0.4 + weight) / 4, 0.98)`

### Section Matching
- Skills from "Skills" section: 0.55 confidence
- Lower than catalog matches (assumed less relevant)

## Data Provenance

Skill mappings derived from:
- `comprehensive_sports_skill_mapping_table.md`
- Industry research on sports career paths
- Common job posting requirements
