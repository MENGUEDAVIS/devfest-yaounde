import { getTranslations } from "next-intl/server";
import { SectionContainer } from "@/components/ui/SectionContainer";

export async function About() {
  const t = await getTranslations("home.about");

  return (
    <SectionContainer background="pastel-blue" maxWidth="3xl">
      <h2 className="text-display-l font-bold text-black02">{t("title")}</h2>
      <p className="mt-6 text-body-l text-black02">{t("body")}</p>
    </SectionContainer>
  );
}
