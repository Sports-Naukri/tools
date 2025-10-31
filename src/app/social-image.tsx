import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const runtime = "nodejs";

const backgroundColor = "#ffffff";

const cedoraData = readFileSync(
  join(process.cwd(), "public", "Cedora-BoldItalic.otf")
);

export async function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "1200px",
          height: "630px",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "18px",
            color: "#1f2937",
          }}
        >
          <svg
            viewBox="0 0 1000 1000"
            width={70}
            height={70}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <g>
              <polygon
                fill="#654E9F"
                points="302,245.7 302.6,251.5 302.4,257.4 418.1,257.1 427.8,251.2 417.7,245.4"
              />
              <polygon
                fill="#654E9F"
                points="490.9,308.2 493.3,367.6 513,367.5 510.6,308.1"
              />
              <path
                fill="#6D28D9"
                d="M497.6,6.3L76,249.9l421.5,243.6l421.5-243.6L497.6,6.3z M550,383c-1,1.3-2.3,2.5-4.1,3.6 c-1.8,1.1-3.7,1.9-5.8,2.6s-4.5,0.9-7.2,1l-57.7,0.3c-2.7,0-5.2-0.3-7.3-0.9c-2.2-0.6-4.2-1.4-6-2.5c-1.9-1.1-3.3-2.2-4.4-3.5 c-1.1-1.3-1.6-2.7-1.7-4.4l-3.2-82.5c-0.1-1.6,0.4-3.1,1.4-4.3c1-1.3,2.3-2.5,4.1-3.5c1.8-1.1,3.7-1.9,5.8-2.5s4.5-0.9,7.2-0.9 l57.5-0.2c2.7,0,5.1,0.3,7.3,0.9c2.2,0.6,4.2,1.4,6,2.5c1.8,1.1,3.3,2.2,4.4,3.5c1.1,1.3,1.6,2.7,1.7,4.3l3.4,82.3 C551.4,380.2,551,381.7,550,383z M675.7,302.9c-5.2,3.2-11.2,5.7-18.1,7.5c-6.9,1.8-14.1,2.7-21.7,2.7l-1.5-34.1l-37.6,0.1 l-0.7-16.8l-139.7,0.4l-27.8,17L284,280c-2.7,0-5.3-0.3-7.6-0.8c-2.3-0.5-4.4-1.3-6.2-2.4s-3.3-2.3-4.4-3.7 c-1.1-1.4-1.6-2.9-1.7-4.5l-1.1-33.9c-0.1-1.6,0.4-3.1,1.4-4.5c1-1.4,2.4-2.7,4.2-3.7c1.8-1.1,3.8-1.9,6.1-2.4 c2.3-0.5,4.8-0.8,7.5-0.8l144.1-0.2l29.4,17l23,0l-2.6-66l-19.7-11.4l-1.9-48.2l75.9,0.1l2,48.1l-18.7,11.4l2.7,65.9l78.1-0.2 l-0.8-17.2l37.5-0.1l-38.9-22.5l-0.5-11.2l94.9-0.1l0.5,11.1l-36.7,22.5l37.4-0.1L691,279c0.2,4.5-1,8.8-3.6,12.9 C684.8,296,680.9,299.7,675.7,302.9z"
              />
              <path d="M963.7,324.3L539.2,562.8l3,430.3l424.5-238.5L963.7,324.3z M861.1,731.2l-53.5,25.9l-80.9-133.6l-28.9,186.7L650,833.2 l39.4-262.5l53.2-27.5l81.2,135.6l32.5-194.3l52.1-26.9L861.1,731.2z" />
              <path
                fill="#006DFF"
                d="M32.5,754.7L457,993.1l3-430.3L35.5,324.3L32.5,754.7z M158.6,691.9c22.5,37.5,42.9,60.7,64.5,74 c31.3,19.3,50.6,14.6,50.6-13.9c0-15.8-7.4-32.7-24.7-47.9l-31.4-27.6c-36.1-31.5-52.4-67.9-52.4-100.3c0-58.9,32.1-80.9,91.4-42.4 c30,19.5,56.7,50.3,77.7,86.4l-21.6,26c-15.7-26.6-36.2-51.1-55.8-63.7c-28.5-18.4-44.9-12.6-44.9,12.9c0,15.9,8.6,30.1,25.9,45.5 l31.5,27.9c34.3,30.4,50,69.5,50,101.2c0.1,66.7-38.4,80.2-102,41.4c-32.4-19.7-61.9-53.3-81.7-93.2L158.6,691.9z"
              />
            </g>
          </svg>

          <span
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              fontSize: "72px",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "#111827",
              fontFamily: "'Cedora', 'Inter', sans-serif",
              fontStyle: "italic",
            }}
          >
            SportsNaukri
            <span
              style={{
                color: "#6d28d9",
                fontFamily: "inherit",
              }}
            >
              Tools
            </span>
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Cedora",
          data: cedoraData,
          weight: 700,
          style: "italic",
        },
      ],
    }
  );
}

export default createSocialImage;
