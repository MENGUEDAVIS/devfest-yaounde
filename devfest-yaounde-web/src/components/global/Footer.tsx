import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
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
    <footer className="mt-16 bg-black02 text-offwhite">
      {/*
        Community photo strip placeholder — DESIGN.md §4.1 requires real
        community photos, none exist in this bootstrap yet. Replace this
        gradient block with an actual photo strip/collage.
      */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-r from-blue via-green to-yellow sm:h-48">
        <a
          href={BEVY_URL}
          className="rounded-pill bg-black02 px-6 py-3 text-body-m font-bold text-offwhite transition-transform hover:scale-[1.03]"
        >
          {t("rsvpCta")}
        </a>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <h3 className="text-caption font-mono uppercase tracking-wide text-offwhite/60">
            {t("event.title")}
          </h3>
          <ul className="mt-4 flex flex-col gap-2">
            <li>
              <Link href="/schedule" className="text-body-m hover:underline">
                {t("event.schedule")}
              </Link>
            </li>
            <li>
              <Link href="/speakers" className="text-body-m hover:underline">
                {t("event.speakers")}
              </Link>
            </li>
            <li>
              <Link href="/team" className="text-body-m hover:underline">
                {t("event.team")}
              </Link>
            </li>
            <li>
              <Link href="/faqs" className="text-body-m hover:underline">
                {t("event.faqs")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-caption font-mono uppercase tracking-wide text-offwhite/60">
            {t("getInvolved.title")}
          </h3>
          <ul className="mt-4 flex flex-col gap-2">
            <li>
              <Link href="/shop" className="text-body-m hover:underline">
                {t("getInvolved.shop")}
              </Link>
            </li>
            <li>
              <Link
                href="/dp-generator"
                className="text-body-m hover:underline"
              >
                {t("getInvolved.dpGenerator")}
              </Link>
            </li>
            <li>
              <a href={BEVY_URL} className="text-body-m hover:underline">
                {t("getInvolved.community")}
              </a>
            </li>
            <li>
              <a href={BEVY_URL} className="text-body-m hover:underline">
                {t("getInvolved.rsvp")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-caption font-mono uppercase tracking-wide text-offwhite/60">
            {t("legal.title")}
          </h3>
          <ul className="mt-4 flex flex-col gap-2">
            <li>
              <a
                href={PRIVACY_POLICY_URL}
                className="text-body-m hover:underline"
              >
                {t("legal.privacy")}
              </a>
            </li>
            <li>
              <a
                href={CODE_OF_CONDUCT_URL}
                className="text-body-m hover:underline"
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
