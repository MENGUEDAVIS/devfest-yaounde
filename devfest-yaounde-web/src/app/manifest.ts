import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * The web app manifest.
 *
 * Used to be modest on purpose — a name, the brand colours and just enough
 * icons for a home-screen shortcut, not because this was trying to be an
 * app. PHASE22 §F changes that deliberately: a real service worker
 * (`public/sw.js`) now makes Schedule, Speakers, Team and FAQs work
 * offline, and the manifest is what turns that into something a browser
 * will actually offer to INSTALL — `icon-192`/`icon-512` exist because
 * Chrome's installability check wants a raster icon at 192px or larger,
 * which `icon.svg` alone does not satisfy on every platform.
 *
 * `start_url` carries the default locale, since "/" only redirects there.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevFest Yaoundé",
    short_name: "DevFest",
    description: "DevFest Yaoundé — GDG Yaoundé",
    start_url: `/${routing.defaultLocale}`,
    display: "standalone",
    background_color: "#FFE7A5",
    theme_color: "#F9AB00",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
