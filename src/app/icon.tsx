import { ImageResponse } from "next/og";

/**
 * App icon for the manifest + favicon. Next 14 reads this file name as a
 * convention and serves the generated PNG at `/icon`.
 *
 * The design is intentionally minimal : a rounded gradient square with a
 * bold "P". It reads at 16px (browser tab), at 192px (Android home screen)
 * and at 512px (splash). We can swap this for a real asset the day we have
 * a designer — the manifest + install flow wired up now will keep working.
 */
export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
          background:
            "linear-gradient(135deg, #FF914C 0%, #F57A2E 60%, #DB6418 100%)",
          borderRadius: "22%",
          color: "white",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
          fontWeight: 800,
          fontSize: 340,
          letterSpacing: "-0.04em",
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}
