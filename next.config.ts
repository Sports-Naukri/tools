/**
 * Copyright © 2024-present SportsNaukri. All Rights Reserved.
 *
 * This file is part of the SportsNaukri Tools application.
 * Unauthorized copying, distribution, or use is strictly prohibited.
 *
 * @see LICENSE file in the root directory for full license information.
 */

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = ["'self'", "'unsafe-inline'"];
if (isDev) {
  scriptSrc.push("'unsafe-eval'");
}

const styleSrc = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];

const fontSrc = ["'self'", "data:", "https://fonts.gstatic.com"];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc.join(" ")}`,
      `style-src ${styleSrc.join(" ")}`,
      "img-src 'self' data: blob:",
      `font-src ${fontSrc.join(" ")}`,
      "connect-src 'self' https://vitals.vercel-insights.com",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    mcpServer: true,
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
