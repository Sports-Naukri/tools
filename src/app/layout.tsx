import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  name: siteName,
  url: siteUrl,
  logo: `${siteUrl}/favicon.ico`,
  description: siteDescription,
  sameAs: ["https://sportsnaukri.com"],
};

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
    "AI assistant",
    "resume builder",
    "job discovery",
    "SportsNaukri",
    "career navigator",
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
        url: `${siteUrl}/opengraph-image.png`,
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
    images: [`${siteUrl}/twitter-image.png`],
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
  themeColor: "#6D28D9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = JSON.stringify(organizationSchema);

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
      </body>
    </html>
  );
}
