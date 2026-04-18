import { ImageResponse } from "next/og";

/**
 * iOS home-screen icon. Served at `/apple-icon` via Next 14's file-based
 * convention. iOS does NOT apply a mask anymore since iOS 7+, but it does
 * clip corners — we keep a full-bleed gradient and let iOS round it itself.
 */
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background:
            "linear-gradient(135deg, #FF914C 0%, #F57A2E 60%, #DB6418 100%)",
          color: "white",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
          fontWeight: 800,
          fontSize: 130,
          letterSpacing: "-0.04em",
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}
