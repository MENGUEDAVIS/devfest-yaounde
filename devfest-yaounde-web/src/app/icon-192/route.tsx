import { ImageResponse } from "next/og";
import { appIconJsx } from "@/lib/brand/app-icon";

/**
 * A 192×192 PNG icon for the web app manifest (PHASE22 §F) — Chrome's
 * installability check wants at least one icon at this size or larger.
 * `icon.svg` alone covers the tab favicon; a manifest icon is a separate
 * contract most browsers check for a raster fallback.
 */
// Same bytes on every request — no reason to regenerate per-visitor.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(appIconJsx(192), { width: 192, height: 192 });
}
