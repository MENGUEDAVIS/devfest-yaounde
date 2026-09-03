import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * The web app manifest.
 *
 * Modest on purpose: a name, the brand colours and the icons. It exists so a
 * saved-to-home-screen shortcut carries the right name and colour rather than
 * a screenshot and a URL — not because this is trying to be an app.
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
    ],
  };
}
