import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { Button } from "@/components/ui/Button";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { Reveal } from "@/components/ui/Reveal";
import pastEditions from "@/data/past-editions.json";
import { Link } from "@/i18n/navigation";
import {
  BEVY_URL,
  CODE_OF_CONDUCT_URL,
  PRIVACY_POLICY_URL,
  SOCIAL_LINKS,
} from "@/lib/site-config";
import type { PastEditionPhoto } from "@/data/types";

const SOCIALS = [
  { href: SOCIAL_LINKS.x, Icon: XLogo, label: "X" },
  { href: SOCIAL_LINKS.instagram, Icon: InstagramLogo, label: "Instagram" },
  { href: SOCIAL_LINKS.linkedin, Icon: LinkedinLogo, label: "LinkedIn" },
  { href: SOCIAL_LINKS.youtube, Icon: YoutubeLogo, label: "YouTube" },
  { href: SOCIAL_LINKS.facebook, Icon: FacebookLogo, label: "Facebook" },
];

const heroPhoto = (pastEditions as PastEditionPhoto[])[0];

const LINK_CLASS =
  "link-item text-body-l text-offwhite/85 transition-colors duration-200 hover:text-yellow";

const GROUP_TITLE_CLASS =
  "font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow";

/** Circular filled social button (Phase 5 §9.2) — 24px Phosphor icon. */
const SOCIAL_CLASS =
  "flex h-12 w-12 items-center justify-center rounded-pill border-2 border-offwhite/25 text-offwhite transition-[background-color,color,transform,border-color] duration-200 ease-bouncy hover:-translate-y-1 hover:border-black02 hover:bg-yellow hover:text-black02";

/**
 * Full-page footer (PHASE6 §2), to the intent in PAGES.md §1.3 — a
 * substantial dark closing moment rather than a thin link bar.
 *
 * Composition, top to bottom:
 *   1. Community photo with an overlaid RSVP / Get Tickets CTA. The photo
 *      sits behind a FLAT Black02 scrim (never a gradient, §2.6) so the
 *      overlaid text stays legible over a busy real photograph.
 *   2. Grouped links — Event / Get Involved / Legal — each its own
 *      `.link-group` so hover dimming stays scoped to one column.
 *   3. Oversized DevFest wordmark as the closing flourish (a legitimate
 *      §7b bold moment), plus social icons in circular backgrounds.
 *   4. Quiet Mono copyright bar.
 */
export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black02 text-offwhite">
      {/* ---- 1. Community photo moment with overlaid CTA ---- */}
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-8">
        <Reveal>
          {/*
            A framed community photo (MorphedImageFrame's plain rounded
            treatment, per its §4.2 interim directive) with the CTA overlaid
            inside it. The scrim is a FLAT Black02 fill — never a gradient
            (§2.6) — which is what keeps this legible once a real, busy
            community photograph replaces the placeholder.
          */}
          <div className="relative overflow-hidden rounded-lg border-2 border-offwhite/15">
            <MorphedImageFrame
              src={heroPhoto.imageUrl}
              alt={t("photoAlt")}
              aspectRatio="16/9"
              className="min-h-104 w-full"
            />
            <div aria-hidden className="absolute inset-0 bg-black02/70" />

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 text-center sm:px-10">
              <p className="font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow">
                {t("closingLine")}
              </p>
              <h2 className="max-w-3xl font-sans text-display-xl font-bold text-offwhite">
                {t("rsvpCta")}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button tone="yellow" href={BEVY_URL} external size="lg">
                  {t("getInvolved.rsvp")}
                </Button>
                <Button
                  tone="offwhite"
                  variant="secondary"
                  href="/tickets"
                  size="lg"
                >
                  {t("ticketsCta")}
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ---- 2. Grouped links ---- */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 py-20 sm:grid-cols-3 sm:gap-10">
        <div className="link-group">
          <h3 className={GROUP_TITLE_CLASS}>{t("event.title")}</h3>
          <ul className="mt-6 flex flex-col gap-3.5">
            <li>
              <Link href="/schedule" className={LINK_CLASS}>
                {t("event.schedule")}
              </Link>
            </li>
            <li>
              <Link href="/speakers" className={LINK_CLASS}>
                {t("event.speakers")}
              </Link>
            </li>
            <li>
              <Link href="/team" className={LINK_CLASS}>
                {t("event.team")}
              </Link>
            </li>
            <li>
              <Link href="/faqs" className={LINK_CLASS}>
                {t("event.faqs")}
              </Link>
            </li>
          </ul>
        </div>

        <div className="link-group">
          <h3 className={GROUP_TITLE_CLASS}>{t("getInvolved.title")}</h3>
          <ul className="mt-6 flex flex-col gap-3.5">
            <li>
              <Link href="/shop" className={LINK_CLASS}>
                {t("getInvolved.shop")}
              </Link>
            </li>
            <li>
              <Link href="/dp-generator" className={LINK_CLASS}>
                {t("getInvolved.dpGenerator")}
              </Link>
            </li>
            <li>
              <a href={BEVY_URL} className={LINK_CLASS}>
                {t("getInvolved.community")}
              </a>
            </li>
            <li>
              <a href={BEVY_URL} className={LINK_CLASS}>
                {t("getInvolved.rsvp")}
              </a>
            </li>
          </ul>
        </div>

        <div className="link-group">
          <h3 className={GROUP_TITLE_CLASS}>{t("legal.title")}</h3>
          <ul className="mt-6 flex flex-col gap-3.5">
            <li>
              <a href={PRIVACY_POLICY_URL} className={LINK_CLASS}>
                {t("legal.privacy")}
              </a>
            </li>
            <li>
              <a href={CODE_OF_CONDUCT_URL} className={LINK_CLASS}>
                {t("legal.codeOfConduct")}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ---- 3. Closing wordmark + socials ---- */}
      <div className="mx-auto max-w-5xl px-6 pb-12">
        <Reveal>
          <div className="flex flex-col items-center gap-8 border-t border-offwhite/10 pt-14">
            <DevFestLogo className="h-16 w-auto sm:h-20" title="DevFest" />
            <p className="text-center font-sans text-display-l font-bold leading-[0.95] text-offwhite">
              DevFest Yaoundé
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {SOCIALS.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={SOCIAL_CLASS}
                >
                  <Icon size={24} />
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ---- 4. Quiet bottom bar ---- */}
      <div className="border-t border-offwhite/10">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <p className="text-center font-mono text-caption text-offwhite/55">
            © {year} {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
