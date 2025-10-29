import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const siteTitle = "SportsNaukri Tools";
const siteTagline = "AI Assistants for Sports Careers";

export default function twitterImage() {
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
            "radial-gradient(circle at 20% 20%, rgba(14, 165, 233, 0.9), rgba(29, 78, 216, 0.9), #0b1120)",
          color: "#f1f5f9",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: "100%",
            maxWidth: 1000,
          }}
        >
          <span
            style={{
              fontSize: 30,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              opacity: 0.75,
            }}
          >
            SPORTSNAUKRI
          </span>
          <span
            style={{
              fontSize: 80,
              lineHeight: 1.1,
              fontWeight: 700,
            }}
          >
            {siteTitle}
          </span>
          <span
            style={{
              fontSize: 34,
              lineHeight: 1.4,
              opacity: 0.9,
              maxWidth: 840,
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
