import { ImageResponse } from "next/og";
import { appIconJsx } from "@/lib/brand/app-icon";

/**
 * The home-screen icon iOS uses when someone saves the site.
 *
 * Generated rather than checked in as a PNG, for the same reason the social
 * card is: it is the mark on the brand's yellow, and if either changes there
 * is one place to change it. Apple ignores SVG touch icons, so `icon.svg`
 * cannot cover this case. Same drawing `appIconJsx` also uses for the PWA
 * manifest's own 192/512 icons (PHASE22 §F) — one mark-on-yellow square,
 * three sizes.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(appIconJsx(180), size);
}
