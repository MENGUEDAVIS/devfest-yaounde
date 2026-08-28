import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { BEVY_URL } from "@/lib/site-config";

export async function CommunityCta() {
  const t = await getTranslations("home.community");

  return (
    <div className="relative overflow-hidden bg-black02">
      {/* One oversized flat shape, §7b — flat fill, no gradient (§2.6) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-144 w-144 rounded-pill bg-yellow opacity-20"
      />
      <SectionContainer
        background="black02"
        maxWidth="4xl"
        className="relative"
      >
        <Reveal>
          <h2 className="max-w-3xl font-sans text-display-xl font-bold text-offwhite">
            {t("title")}
          </h2>
        </Reveal>
        <Reveal index={1}>
          <p className="mt-8 max-w-2xl text-body-l text-offwhite/75">
            {t("body")}
          </p>
        </Reveal>
        <Reveal index={2}>
          <div className="mt-12">
            <Button tone="yellow" href={BEVY_URL} external size="lg">
              {t("cta")}
            </Button>
          </div>
        </Reveal>
      </SectionContainer>
    </div>
  );
}
