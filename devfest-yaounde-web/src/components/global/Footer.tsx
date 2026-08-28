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
];

const LINK_CLASS =
  "link-item text-body-m text-offwhite/85 transition-colors duration-200 hover:text-yellow";

/** Circular filled social button per PHASE5 §9.2 — 24px Phosphor icon. */
const SOCIAL_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-pill border-2 border-offwhite/25 text-offwhite transition-[background-color,color,transform,border-color] duration-200 ease-bouncy hover:-translate-y-1 hover:border-black02 hover:bg-yellow hover:text-black02";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black02 text-offwhite">
      {/*
        Community photo strip placeholder — DESIGN.md §4.1 requires real
        community photos, none exist yet. Flat Yellow 600 block per §2.6
        (gradients banned); swap for an actual photo strip/collage later.
      */}
      <div className="border-b-4 border-black02 bg-yellow">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-5 py-24 sm:px-8 sm:py-28">
          <DevFestLogo className="h-12 w-auto" title="DevFest" />
          <p className="max-w-2xl font-sans text-display-l font-bold text-black02">
            {t("rsvpCta")}
          </p>
          <Button tone="black02" href={BEVY_URL} external size="lg">
            {t("getInvolved.rsvp")}
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 px-6 py-16 sm:grid-cols-3">
        {/* Each column is its own .link-group, so the dimming stays scoped
            to the hovered group rather than affecting the whole footer. */}
        <div className="link-group">
          <h3 className="font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow">
            {t("event.title")}
          </h3>
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
          <h3 className="font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow">
            {t("getInvolved.title")}
          </h3>
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
          <h3 className="font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow">
            {t("legal.title")}
          </h3>
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

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 border-t border-offwhite/10 px-6 py-8 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
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
        <p className="font-mono text-caption text-offwhite/60">
          © {year} {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
