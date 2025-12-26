import type { MetadataRoute } from "next";

export const revalidate = 3600;

const siteUrl = "https://tools.sportsnaukri.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/chat`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
