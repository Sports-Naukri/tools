import { HomePageClient } from "@/components/HomePageClient";
import { getSiteContent } from "@/lib/siteContent";

export const revalidate = 3600;

export default function Home() {
  const { navLinks, tools } = getSiteContent();

  return <HomePageClient navLinks={navLinks} tools={tools} />;
}
