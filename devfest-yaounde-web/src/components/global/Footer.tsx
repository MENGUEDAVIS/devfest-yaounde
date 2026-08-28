import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
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
      <div className="relative overflow-hidden border-b-4 border-black02 bg-yellow">
        {/* One oversized flat shape, §7b — big and few, not a scatter */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-104 w-104 rounded-pill bg-yellow-halftone"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-8 px-5 py-24 sm:px-8 sm:py-28">
          <p className="max-w-2xl font-sans text-display-l font-bold text-black02">
            {t("rsvpCta")}
          </p>
          <Button tone="black02" href={BEVY_URL} external size="lg">
            {t("getInvolved.rsvp")}
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <h3 className="font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow">
            {t("event.title")}
          </h3>
          <ul className="mt-4 flex flex-col gap-2">
            <li>
              <Link
                href="/schedule"
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("event.schedule")}
              </Link>
            </li>
            <li>
              <Link
                href="/speakers"
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("event.speakers")}
              </Link>
            </li>
            <li>
              <Link
                href="/team"
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("event.team")}
              </Link>
            </li>
            <li>
              <Link
                href="/faqs"
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("event.faqs")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow">
            {t("getInvolved.title")}
          </h3>
          <ul className="mt-4 flex flex-col gap-2">
            <li>
              <Link
                href="/shop"
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("getInvolved.shop")}
              </Link>
            </li>
            <li>
              <Link
                href="/dp-generator"
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("getInvolved.dpGenerator")}
              </Link>
            </li>
            <li>
              <a
                href={BEVY_URL}
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("getInvolved.community")}
              </a>
            </li>
            <li>
              <a
                href={BEVY_URL}
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("getInvolved.rsvp")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-mono text-mono-tag font-bold uppercase tracking-wide text-yellow">
            {t("legal.title")}
          </h3>
          <ul className="mt-4 flex flex-col gap-2">
            <li>
              <a
                href={PRIVACY_POLICY_URL}
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("legal.privacy")}
              </a>
            </li>
            <li>
              <a
                href={CODE_OF_CONDUCT_URL}
                className="text-body-m text-offwhite/80 transition-colors duration-200 hover:text-yellow"
              >
                {t("legal.codeOfConduct")}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 border-t border-offwhite/10 px-6 py-6 sm:flex-row sm:justify-between">
        <div className="flex gap-4">
          {SOCIALS.map(({ href, Icon, label }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="text-offwhite/70 transition-colors hover:text-offwhite"
            >
              <Icon size={24} />
            </a>
          ))}
        </div>
        <p className="text-caption font-mono text-offwhite/60">
          © {year} {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
