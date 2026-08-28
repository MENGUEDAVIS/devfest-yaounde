import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";

export async function About() {
  const t = await getTranslations("home.about");

  return (
    <SectionContainer background="offwhite" maxWidth="4xl">
      <Reveal>
        <h2 className="max-w-3xl font-sans text-display-xl font-bold text-black02">
          {t("title")}
        </h2>
      </Reveal>
      {/* §7b weight contrast: very bold heading against calm, light body */}
      <Reveal index={1}>
        <p className="mt-10 max-w-2xl text-body-l text-black02/80">
          {t("body")}
        </p>
      </Reveal>
    </SectionContainer>
  );
}
