import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { TeamCardStatic } from "@/components/team/TeamCardStatic";
import { TeamBrowser } from "@/components/team/TeamBrowser";
import { Reveal } from "@/components/ui/Reveal";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SectionContainer } from "@/components/ui/SectionContainer";
import team from "@/data/team.json";
import type { TeamMember } from "@/data/types";

const members = team as TeamMember[];

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
 * Team page — PAGES.md §6, reworked in PHASE9.
 *
 * Organizers are grouped and filtered by **contribution** (Organising,
 * Design, Logistics, Sponsoring, Ushering, Programme) rather than a sub-team
 * org chart, which was never confirmed. That's a deliberate call recorded in
 * docs/decisions/0010-team-grouping.md; the old "structure unknown" note is
 * retired because the page no longer implies a structure it doesn't have.
 *
 * Alumni sit outside the filtered set in their own section, so narrowing the
 * filters never hides the past-organiser story.
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

  return (
    <main id="main-content" className="flex-1 pt-32 sm:pt-28">
      <SectionContainer background="yellow-wash" maxWidth="7xl">
        {/* Scramble egg (PHASE11 §1) — deliberately NOT on every page
            headline; /schedule and /faqs stay plain so this reads as a find
            rather than a site-wide tic. */}
        <h1 className="font-sans text-display-hero font-bold leading-[0.9] text-black02">
          <ScrambleText text={t("title")} triggerOnClick />
        </h1>
        <p className="mt-6 max-w-2xl text-body-l text-black02/80">
          {t("lead")}
        </p>

        <div className="mt-16">
          <TeamBrowser members={current} />
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
                <TeamCardStatic member={m} locale={locale} />
              </Reveal>
            ))}
          </div>
        </SectionContainer>
      )}
    </main>
  );
}
