/**
 * Copyright © 2024-present SportsNaukri. All Rights Reserved.
 *
 * This file is part of the SportsNaukri Tools application.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 *
 * @see LICENSE file in the root directory for full license information.
 */

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "SportsNaukri Tools";
const siteDescription =
  "AI-powered assistants that help sports professionals discover opportunities, craft winning resumes, and accelerate their careers.";
const siteUrl = "https://tools.sportsnaukri.com";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SportsNaukri",
  url: "https://sportsnaukri.com",
  logo: `${siteUrl}/favicon.ico`,
  description: "India's leading sports job portal",
  sameAs: [
    "https://sportsnaukri.com",
    "https://twitter.com/sportsnaukri",
    "https://www.linkedin.com/company/sportsnaukri",
  ],
};

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  featureList: [
    "AI-powered resume builder",
    "Sports job search",
    "Career guidance",
    "Cover letter generator",
    "Interview preparation",
  ],
  author: {
    "@type": "Organization",
    name: "SportsNaukri",
  },
};

const structuredDataArray = [organizationSchema, webAppSchema];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName}`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "sports careers",
    "sports jobs India",
    "AI resume builder",
    "sports job portal",
    "SportsNaukri",
    "career navigator",
    "sports industry jobs",
    "athlete careers",
    "sports marketing jobs",
    "coaching jobs India",
    "fitness industry careers",
    "sports management jobs",
  ],
  authors: [{ name: "SportsNaukri" }],
  creator: "SportsNaukri",
  publisher: "SportsNaukri",
  category: "technology",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${siteName} | AI-Powered Career Assistants`,
    description: siteDescription,
    siteName,
    locale: "en_US",
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${siteName} hero banner`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | AI-Powered Career Assistants`,
    description: siteDescription,
    site: "@sportsnaukri",
    creator: "@sportsnaukri",
    images: [`${siteUrl}/twitter-image`],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
  themeColor: "#6D28D9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = JSON.stringify(structuredDataArray);

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} hero-bg bg-background text-foreground antialiased overflow-x-hidden font-sans text-gray-800`}
      >
        {children}
        <Toaster
          position="top-center"
          expand={false}
          richColors={false}
          closeButton={false}
          duration={3500}
          gap={12}
          toastOptions={{
            style: {
              background: "white",
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 10px 25px -5px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.03)",
              padding: "14px 18px",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "Inter, sans-serif",
              gap: "10px",
            },
            classNames: {
              toast: "!items-start",
              title: "!text-slate-800 !font-semibold !text-[14px]",
              description: "!text-slate-500 !text-[13px] !font-normal",
              success:
                "!border-emerald-100 !bg-gradient-to-br !from-white !to-emerald-50/50",
              error:
                "!border-red-100 !bg-gradient-to-br !from-white !to-red-50/50",
              loading:
                "!border-blue-100 !bg-gradient-to-br !from-white !to-blue-50/30",
              icon: "!text-[18px]",
            },
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
