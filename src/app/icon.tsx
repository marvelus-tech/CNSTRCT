import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Site canvas `--background` from globals.css */
const CANVAS = "#e8e9ec";
const INK = "#222326";
const ACCENT = "#e85d04";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: CANVAS,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          {/* Segmented HUD arc — reads as a digital “C” at 16px */}
          <path
            d="M16.25 5.25C10.75 3.5 6 7.25 6 12c0 4.75 4.75 8.5 10.25 6.75"
            stroke={INK}
            strokeWidth="2.65"
            strokeLinecap="square"
          />
          <path
            d="M16.5 5.5v2.25M16.5 16.25v2.25"
            stroke={ACCENT}
            strokeWidth="1.65"
            strokeLinecap="square"
          />
          {/* Micro scan ticks */}
          <path
            d="M8.5 9.25h2M8.5 14.75h2"
            stroke={INK}
            strokeWidth="1"
            strokeLinecap="square"
            opacity={0.55}
          />
        </svg>
      </div>
    ),
    size,
  );
}