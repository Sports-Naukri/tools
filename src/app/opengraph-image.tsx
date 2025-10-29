import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const siteTitle = "SportsNaukri Tools";
const siteTagline = "AI-powered career acceleration for sports talent";

export default function opengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 40%, #111827 100%)",
          color: "#f9fafb",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: "80%",
            maxWidth: 900,
          }}
        >
          <span
            style={{
              fontSize: 26,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            SPORTSNAUKRI
          </span>
          <span
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              fontWeight: 700,
            }}
          >
            {siteTitle}
          </span>
          <span
            style={{
              fontSize: 32,
              lineHeight: 1.4,
              opacity: 0.9,
              maxWidth: 780,
            }}
          >
            {siteTagline}
          </span>
        </div>
      </div>
    ),
    size
  );
}
