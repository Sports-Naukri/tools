# Resume-Aware Job Search Roadmap

## Phase 1 – Context Isolation & UI
- [x] 1.1 Remove raw resume text from chat prompt; send only summaries/skills. *(Short summary now feeds the assistant while the full text never leaves the client.)*
- [x] 1.2 Persist sanitized resume text off-thread and expose it via a collapsible "Resume context" pill in the chat UI. *(Resume context parts render as toggleable chips with hidden detail.)*
- [x] 1.3 Update ResumeSkillDialog and confirmation copy to explain the new inline summary behavior. *(Dialog now clarifies that only a summary is shared and links to the context reveal.)*

## Phase 2 – Broader Job Search Strategy
- [x] 2.1 Generate concise resume summaries + top skills metadata for assistant instructions. *(Resume upload flow now emits a short summary + top skills as a hidden resume-meta part so the assistant always has structured context.)*
- [x] 2.2 Implement general keyword fallback selection and limit tool queries to one concise payload. *(General keyword helpers pick broad seeds, and the prompt enforces a single concise job-search payload with fallback guidance.)*
- [x] 2.3 Guide the assistant to favor breadth (at least 3 results) and log fallback triggers when the endpoint is sparse. *(System + resume prompts now demand >=3 listings, and the WordPress fetcher logs whenever sparse results trigger the broader fallback or still return <3 jobs.)*

## Phase 3 – Result Enrichment & Validation
- [x] 3.1 Tag each returned job with relevance badges (matched skills vs general keyword hits). *(Job cards now display "Skill match" and "Keyword hit" chips based on resume strengths/general keywords detected server-side.)*
- [x] 3.2 Surface notices when results were broadened, plus store telemetry for low-result cases. *(Job lists show broadened-search + sparse-result notices, and low-result events persist to local telemetry for follow-up.)*
- [x] 3.3 Run lint/tests and document the final behavior in the log. *(ESLint passes after these updates; this log captures the completed behavior.)*
