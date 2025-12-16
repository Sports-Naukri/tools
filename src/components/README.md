# UI Components

This directory contains all the React components for the Sports Naukri application.

## Directory Structure

| Directory/File | Description |
|----------------|-------------|
| `chat/` | Components specific to the Chat application (JAY/Navigator). See [chat/README.md](./chat/README.md). |
| `canvas/` | Components for the document generation UI. See [lib/canvas/README.md](../../lib/canvas/README.md). |
| `image/` | optimized image wrappers and assets. |
| `Header.tsx` | Site-wide navigation header. |
| `HeroSection.tsx` | Landing page hero banner. |
| `ToolsSection.tsx` | Interactive tools grid (Landing page). |
| `SiteFooter.tsx` | Site-wide footer. |
| `HomePageClient.tsx` | Client-side logic for the landing page (menu, scroll). |

## Landing Page Architecture

The landing page (`app/page.tsx`) uses a client-side orchestrator pattern:

1.  **Server**: `page.tsx` fetches content definition (`lib/siteContent`).
2.  **Client**: `HomePageClient.tsx` receives content and manages interactivity:
    *   **Mobile Menu**: Slides out from left, blurs background content.
    *   **Scroll Locking**: Disables body scroll when menu is open.
    *   **Smooth Scroll**: Custom behavior for "Scroll" button.
    *   **Mouse Tracking**: `ToolsSection` uses mouse coordinates for spotlight hover effects (disabled for reduced motion).

## component Standards

*   **Client vs Server**: Most interactive components use `"use client"`.
*   **Styling**: Tailwind CSS with custom config (in `tailwind.config.ts`).
*   **Images**: `next/image` is used for all raster assets to ensure optimization.
*   **Icons**: standard SVGs or `lucide-react` icons.
