import { defineRouting } from "next-intl/routing";

// Default locale is French — Yaoundé skews Francophone, English is the
// switch-to option for international speakers/sponsors. Flagged as an
// assumption to confirm in docs/content/PAGES.md §11 / §10.2.
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
});

export type Locale = (typeof routing.locales)[number];
