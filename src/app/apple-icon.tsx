import { ImageResponse } from "next/og";
import { BRAND_HEX_PATH, BRAND_HEX_VIEWBOX } from "@/lib/brand-hex-path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Black business hex on transparent — matches hero `.hero-brandmark__shape`. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg width="148" height="160" viewBox={BRAND_HEX_VIEWBOX}>
          <path d={BRAND_HEX_PATH} fill="#000" />
        </svg>
      </div>
    ),
    { ...size },
  );
}