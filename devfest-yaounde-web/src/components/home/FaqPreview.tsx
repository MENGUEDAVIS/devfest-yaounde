import { getLocale, getTranslations } from "next-intl/server";
import { SectionContainer } from "@/components/ui/SectionContainer";
import faqs from "@/data/faqs.json";
import { Link } from "@/i18n/navigation";
import type { FaqItem } from "@/data/types";

const faqList = faqs as FaqItem[];

export async function FaqPreview() {
  const t = await getTranslations("home.faq");
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <SectionContainer background="pastel-green" maxWidth="3xl">
      <h2 className="text-display-l font-bold text-black02">{t("title")}</h2>

      <div className="mt-8 flex flex-col gap-6">
        {faqList.map((faq) => (
          <div key={faq.id}>
            <p className="text-body-l font-bold text-black02">
              {faq.question[locale]}
            </p>
            <p className="mt-1 text-body-m text-black02/80">
              {faq.answer[locale]}
            </p>
          </div>
        ))}
      </div>

      <Link
        href="/faqs"
        className="mt-8 inline-block text-body-m font-bold text-green underline underline-offset-4 hover:text-green/80"
      >
        {t("cta")}
      </Link>
    </SectionContainer>
  );
}
