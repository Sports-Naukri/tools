# Changelog

## 2.1.1-beta - 2025-06-24

### Highlights
- **Bundle Size Optimization:** Dynamic imports for heavy framer-motion and lottie-react components reduce initial JavaScript payload.
- **Agent Mode UX:** Added manual mode tracking with inline confirmation banner when auto-switch is triggered.
- **Mobile Viewport Fix:** Prevents address bar collapse on mobile with `interactiveWidget: "resizes-content"`.
- **Improved System Prompts:** Enhanced differentiation between Jay (documents/coaching) and Navigator (analysis/mapping) agents.

### Performance
- **Dynamic imports** for homepage components (HeroSection, FeatureGrid, CTASection, FloatingSearch) using `next/dynamic`.
- **Lazy-loaded Lottie animations** in MessageList - only loads lottie-react when streaming starts.
- **Optimized Lenis settings** with adjusted `wheelMultiplier` and `touchMultiplier` for smoother scroll.
- **Added `overscroll-behavior: none`** to prevent pull-to-refresh interference.

### UX Improvements
- **Manual mode tracking:** System remembers when user explicitly selects Jay or Navigator mode.
- **Confirmation banner:** Shows inline prompt when auto-classifier suggests different agent for manual selections.
- **Fixed tooltip positioning:** Mode toggle tooltip now appears above button instead of screen center.
- **Improved agent system prompts:** Clear domain boundaries with "NOT your domain" sections for accurate routing.

### Mobile
- **Viewport meta enhancement:** Added `interactiveWidget: "resizes-content"` to prevent layout shifts from mobile browser chrome.
- **Disabled zoom:** Set `maximumScale: 1` and `userScalable: false` for app-like behavior.

### CI/CD
- **Consolidated CI workflow:** Merged lint/typecheck/build/security into single parallel job.
- **Removed gitleaks:** Eliminated secret scanning step causing config parsing issues.
- **Fixed NODE_ENV:** Moved production environment to build step only to allow devDependency installation.

---

## 2.1.0-beta - 2025-06-24

### Highlights
- **Premium Toast Notifications:** Integrated Sonner v2.0.7 with custom light-themed styling for resume uploads and chat actions.
- **Mobile-First Redesign:** Complete responsive overhaul with smooth sidebar animations, fullscreen canvas, and compact mobile header.
- **IndexedDB Performance:** Added in-memory caching layer with 30-second TTL to eliminate UI sluggishness.
- **Horizontal Scroll Fix:** Resolved overflow issues across all screen sizes with CSS containment.
- **Enhanced SEO:** Added WebApplication structured data schema and expanded keyword coverage.

### Performance
- **In-memory caching layer** for IndexedDB operations with TTL-based invalidation (`storage.ts`).
- **Fixed COOLDOWN_DURATION_MS** from 60 seconds to 12 hours (43,200,000ms) for proper rate limiting.
- Optimized cache reads to reduce redundant database queries.

### Mobile UX
- **Mobile header** with hamburger menu toggle, new chat button, and delete conversation button.
- **Smooth sidebar animation** using CSS transforms (`translate-x`) instead of conditional rendering.
- **Fullscreen canvas** on mobile with back button navigation.
- **Icon-only ResumeToggle** on mobile screens with `useIsMobile` hook.
- **Compact ChatSidebar** with reduced padding and smaller search bar on mobile.
- **Safe area inset padding** for iOS notch/home indicator compatibility.

### UI/UX
- **Sonner toast integration** throughout the app with custom styling matching brand colors.
- **ModeButton component** with centered tooltip showing Jay/Navigator mode descriptions.
- **Removed message counter** ("X messages left") from composer footer.
- **Centered disclaimer text** in chat composer.
- **SportsNaukri logo** replacing generic Bot icon in message list.
- **Removed hamburger menu** from homepage header (CTA always visible).

### SEO & Meta
- **WebApplication schema** with aggregateRating, offers, and feature list.
- **Expanded keywords** covering career tools, resume builder, job matching, AI chatbot.
- **Added /chat to sitemap** with daily change frequency and high priority.

### Bug Fixes
- **Horizontal scrollbar** eliminated with `overflow-x: hidden !important` on html/body.
- **Tooltip overflow** fixed with centered fixed positioning.
- **Mobile viewport** using `h-dvh` for dynamic viewport height.
- **Universal max-width** selector preventing element overflow.

### Code Quality
- Biome lint fixes across all modified files.
- Removed unused mobile overlay and hamburger state from Header component.
- Cleaned up conditional mobile rendering in favor of CSS transforms.

---

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
