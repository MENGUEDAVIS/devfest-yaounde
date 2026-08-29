import {
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import team from "@/data/team.json";
import type { TeamMember } from "@/data/types";

const members = team as TeamMember[];

function socialsOf(m: TeamMember) {
  const out: {
    key: string;
    href: string;
    Icon: typeof XLogo;
    label: string;
  }[] = [];
  if (m.social?.x)
    out.push({ key: "x", href: m.social.x, Icon: XLogo, label: "X" });
  if (m.social?.linkedin)
    out.push({
      key: "in",
      href: m.social.linkedin,
      Icon: LinkedinLogo,
      label: "LinkedIn",
    });
  if (m.social?.website)
    out.push({
      key: "web",
      href: m.social.website,
      Icon: GlobeSimple,
      label: "Website",
    });
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.team" });
  return {
    title: `${t("title")} · DevFest Yaoundé`,
    description: t("metaDesc"),
    openGraph: {
      title: `${t("title")} · DevFest Yaoundé`,
      description: t("metaDesc"),
    },
  };
}

/**
 * Team page — PAGES.md §6.
 *
 * Organizers render as ONE grid, not grouped by sub-team: the real org
 * structure (Design / Logistics / DevRel / Community) has never been
 * confirmed, and §6 only calls for grouping "if the org chart supports it".
 * Inventing a fake structure would be worse than showing one honest grid, so
 * the page says so in a visible note rather than guessing.
 */
export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;
  setRequestLocale(routeLocale);
  const t = await getTranslations("pages.team");
  const locale = (await getLocale()) as "fr" | "en";

  const current = members.filter((m) => !m.alumni);
  const alumni = members.filter((m) => m.alumni);

  const card = (m: TeamMember, alum = false) => {
    const socials = socialsOf(m);
    return (
      <div>
        <MorphedImageFrame
          src={m.photoUrl}
          alt={m.name}
          aspectRatio="1/1"
          className="border-2 border-black02 shadow-[0_5px_0_0_var(--color-black02)]"
        />
        <p className="mt-5 font-sans text-heading-m font-bold leading-tight text-black02">
          {m.name}
        </p>
        <p className="mt-1 font-mono text-caption text-black02/70">
          {m.role[locale]}
          {alum && m.years ? ` · ${m.years}` : ""}
        </p>
        <p className="mt-3 text-body-m text-black02/80">{m.oneLiner[locale]}</p>
        {socials.length > 0 && (
          <div className="mt-4 flex gap-2">
            {socials.map(({ key, href, Icon, label }) => (
              <a
                key={key}
                href={href}
                aria-label={`${m.name} — ${label}`}
                className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-black02 text-black02 transition-[background-color,transform] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-yellow motion-reduce:transform-none"
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="6xl">
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] tracking-tight text-black02">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-2xl text-body-l text-black02/80">
          {t("lead")}
        </p>
        <p className="mt-4 max-w-2xl font-mono text-caption text-black02/55">
          {t("structureNote")}
        </p>

        <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((m, i) => (
            <Reveal key={m.id} index={i % 3}>
              {card(m)}
            </Reveal>
          ))}
        </div>
      </SectionContainer>

      {alumni.length > 0 && (
        <SectionContainer background="offwhite" maxWidth="6xl">
          <Reveal>
            <h2 className="font-sans text-display-l font-bold text-black02">
              {t("alumniTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-body-l text-black02/75">
              {t("alumniLead")}
            </p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {alumni.map((m, i) => (
              <Reveal key={m.id} index={i % 3}>
                {card(m, true)}
              </Reveal>
            ))}
          </div>
        </SectionContainer>
      )}
    </main>
  );
}
