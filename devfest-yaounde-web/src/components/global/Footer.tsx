import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  WhatsappLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { DevFestLogo } from "@/components/brand/DevFestLogo";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Link } from "@/i18n/navigation";
import {
  BEVY_URL,
  CODE_OF_CONDUCT_URL,
  PRIVACY_POLICY_URL,
  SOCIAL_LINKS,
} from "@/lib/site-config";

const SOCIALS = [
  { href: SOCIAL_LINKS.x, Icon: XLogo, label: "X" },
  { href: SOCIAL_LINKS.instagram, Icon: InstagramLogo, label: "Instagram" },
  { href: SOCIAL_LINKS.linkedin, Icon: LinkedinLogo, label: "LinkedIn" },
  { href: SOCIAL_LINKS.youtube, Icon: YoutubeLogo, label: "YouTube" },
  { href: SOCIAL_LINKS.facebook, Icon: FacebookLogo, label: "Facebook" },
  { href: SOCIAL_LINKS.whatsapp, Icon: WhatsappLogo, label: "WhatsApp" },
];

const LINK_CLASS =
  "link-item inline-block text-body-l text-offwhite/85 transition-colors duration-200 hover:text-primary";

const GROUP_TITLE_CLASS =
  "font-mono text-mono-tag font-bold uppercase tracking-[0.01em] text-primary";

/** Circular filled social button (Phase 5 §9.2) — 24px Phosphor icon. */
const SOCIAL_CLASS =
  "flex h-12 w-12 items-center justify-center rounded-pill border-2 border-offwhite/25 text-offwhite transition-[background-color,color,transform,border-color] duration-200 ease-bouncy hover:-translate-y-1 hover:border-black02 hover:bg-primary hover:text-black02";

/**
 * Full-page footer — PHASE7 §7 rework.
 *
 * BEFORE: a big community-photo + RSVP CTA block on top of a plain link
 * stack. AFTER: the photo/CTA block is gone entirely and the footer is one
 * composed full-height closing moment with MIXED layout rather than a
 * single column of rows:
 *
 *   - An asymmetric two-column band: an oversized wordmark + logo flourish
 *     on the left (§7b bold typography), the three link groups on the right.
 *   - A wide "come build with us" line spanning underneath, with the ticket
 *     CTA — the event path is now tickets, not a Bevy RSVP (§4).
 *   - Social row and quiet Mono copyright bar closing it out.
 *
 * `min-h-svh` makes it a genuine full-viewport closing moment; `justify-
 * between` distributes the bands rather than letting them bunch at the top.
 *
 * "Join the Community" (Bevy) is retained here deliberately — §4 removes the
 * RSVP action but keeps community-join as a distinct purpose.
 */
export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="flex min-h-svh flex-col justify-between bg-black02 text-offwhite">
      {/* ---- Band 1: wordmark flourish | link groups ---- */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-24 sm:px-8 sm:pt-28">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <Reveal>
            <div>
              <DevFestLogo className="h-12 w-auto sm:h-14" title="DevFest" />
              {/* PHASE13 §6: the footer wordmark carries the same
                  click-only scramble as the page titles. Both halves get
                  their own, so "Yaoundé" decodes independently of "DevFest"
                  and each keeps its own colour. */}
              <p className="mt-7 font-sans text-display-hero font-bold leading-[0.86] text-offwhite">
                <ScrambleText text="DevFest" />
                <span className="block text-primary">
                  <ScrambleText text="Yaoundé" />
                </span>
              </p>
            </div>
          </Reveal>

          {/* Link groups — mixed into the same band, not stacked below it */}
          <Reveal index={1}>
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:pt-6">
              <div className="link-group">
                <h3 className={GROUP_TITLE_CLASS}>{t("event.title")}</h3>
                <ul className="mt-5 flex flex-col gap-3">
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
                <ul className="mt-5 flex flex-col gap-3">
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
                    {/* Community join — distinct from the retired RSVP action */}
                    <a href={BEVY_URL} className={LINK_CLASS}>
                      {t("getInvolved.community")}
                    </a>
                  </li>
                </ul>
              </div>

              <div className="link-group">
                <h3 className={GROUP_TITLE_CLASS}>{t("legal.title")}</h3>
                <ul className="mt-5 flex flex-col gap-3">
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
          </Reveal>
        </div>
      </div>

      {/* ---- Band 2: closing invitation + ticket CTA ---- */}
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-start gap-7 border-y-2 border-offwhite/15 py-12 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-mono-tag font-bold uppercase tracking-[0.01em] text-primary">
                {t("closingLine")}
              </p>
              <p className="mt-3 max-w-xl font-sans text-display-l font-bold leading-tight text-offwhite">
                {t("rsvpCta")}
              </p>
            </div>
            <Button tone="primary" href="/tickets" size="lg">
              {t("ticketsCta")}
            </Button>
          </div>
        </Reveal>
      </div>

      {/* ---- Band 3: socials + quiet copyright ---- */}
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 sm:px-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <ThemeSwitcher />
          </div>
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
          <p className="font-mono text-caption text-offwhite/55">
            © {year} {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
