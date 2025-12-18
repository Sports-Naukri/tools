# Changelog

## 2.0.0 - 2025-12-18

### Highlights
- **Homepage → Chat seeding:** Hero and floating chat inputs now open a fresh chat and auto-send the typed question via `initialMessage` routing.
- **Chat UX resilience:** Fixed mobile sidebar rendering, ensured initial message auto-send only once for new conversations, and stabilized canvas/document display and resume toggle wiring.
- **Agent smart switching:** Added heuristic agent classifier to auto-pick Jay vs Navigator and exposed a new chat classifier module.
- **Resume & storage:** Improved resume tooling hooks and chat storage defaults while migrating attachment/job context handling.
- **CI/CD hardening:** Introduced a parallelized CI workflow with lint, typecheck, build, dependency review, npm audit gating, and Gitleaks secret scanning; added pnpm caching for speed.
- **Deployment pipelines:** Staging/production flows now preserve `initialMessage`, validate builds, and include security checks.
- **Assets refresh:** Updated brand images to optimized JPG variants.

### CI/CD
- New `.github/workflows/ci.yaml` runs lint, typecheck, build, security, and dependency review in parallel with pnpm caching and a consolidated summary.
- Security stage enforces high/critical vulnerability fail gates and secret scanning via Gitleaks.

### Frontend / Chat
- `/chat` redirect preserves `initialMessage`; `/chat/[id]` passes it through to `ChatPageClient`.
- `ChatPageClient` auto-seeds the first user message for empty conversations and restores mobile sidebar markup.
- Added agent mode classifier and auto-switch notice; refined attachments and job context handling.

### Misc
- Swapped PNG logos for JPG equivalents to reduce payload size.

---
Previous versions (<2.0.0) focused on initial chat experience, resume parsing, and foundational app setup.
