import { getTranslations } from "next-intl/server";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { BEVY_URL } from "@/lib/site-config";

export async function CommunityCta() {
  const t = await getTranslations("home.community");

  return (
    <SectionContainer background="black02" maxWidth="3xl">
      <div className="text-center">
        <h2 className="text-display-l font-bold text-offwhite">{t("title")}</h2>
        <p className="mx-auto mt-4 max-w-xl text-body-l text-offwhite/80">
          {t("body")}
        </p>
        <a
          href={BEVY_URL}
          className="mt-8 inline-flex items-center justify-center whitespace-nowrap rounded-pill bg-offwhite px-6 py-3 text-body-m font-bold text-black02 transition-transform duration-150 ease-[var(--ease-bouncy)] hover:scale-[1.03] active:scale-95"
        >
          {t("cta")}
        </a>
      </div>
    </SectionContainer>
  );
}
