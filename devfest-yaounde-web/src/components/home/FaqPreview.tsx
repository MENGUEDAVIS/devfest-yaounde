import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import faqs from "@/data/faqs.json";
import type { FaqItem } from "@/data/types";

const faqList = faqs as FaqItem[];

export async function FaqPreview() {
  const t = await getTranslations("home.faq");
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <SectionContainer background="yellow-wash" maxWidth="4xl">
      <Reveal>
        <h2 className="font-sans text-display-xl font-bold text-black02">
          {t("title")}
        </h2>
      </Reveal>

      <dl className="mt-16 flex flex-col gap-10">
        {faqList.map((faq, i) => (
          <Reveal key={faq.id} index={i}>
            <dt className="font-sans text-heading-m font-bold text-black02">
              {faq.question[locale]}
            </dt>
            <dd className="mt-3 text-body-l text-black02/75">
              {faq.answer[locale]}
            </dd>
          </Reveal>
        ))}
      </dl>

      <Reveal>
        <div className="mt-14">
          <Button tone="black02" variant="secondary" href="/faqs" size="md">
            {t("cta")}
          </Button>
        </div>
      </Reveal>
    </SectionContainer>
  );
}
