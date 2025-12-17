/**
 * Home Page (Root Route)
 *
 * Server Component representing the landing page.
 * Fetches site content and hydrates the client-side `HomePageClient` orchestrator.
 *
 * @module app/page
 */

import { HomePageClient } from "@/components/HomePageClient";
import { getSiteContent } from "@/lib/siteContent";

export const revalidate = 3600;

export default function Home() {
  const { navLinks } = getSiteContent();

  return <HomePageClient navLinks={navLinks} />;
}
