import { ImageResponse } from "next/og";
import { appIconJsx } from "@/lib/brand/app-icon";

/**
 * A 512×512 PNG icon for the web app manifest (PHASE22 §F) — used for the
 * install dialog and splash screen on Android, where a small icon would be
 * upscaled and blurry.
 */
// Same bytes on every request — no reason to regenerate per-visitor.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(appIconJsx(512), { width: 512, height: 512 });
}
