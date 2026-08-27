import { getLocale, getTranslations } from "next-intl/server";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { SectionContainer } from "@/components/ui/SectionContainer";
import pastEditions from "@/data/past-editions.json";
import type { PastEditionPhoto } from "@/data/types";

const photos = pastEditions as PastEditionPhoto[];

export async function MemoryLane() {
  const t = await getTranslations("home.memoryLane");
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <SectionContainer background="offwhite" maxWidth="5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-display-l font-bold text-black02">
            {t("title")}
          </h2>
          <p className="mt-2 max-w-xl text-body-m text-black02">{t("body")}</p>
        </div>
        <a
          href="#"
          className="whitespace-nowrap text-body-m font-bold text-blue underline underline-offset-4 hover:text-blue/80"
        >
          {t("recapCta")}
        </a>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {photos.map((photo) => (
          <MorphedImageFrame
            key={photo.id}
            src={photo.imageUrl}
            alt={photo.alt[locale]}
            aspectRatio="4/3"
          />
        ))}
      </div>
    </SectionContainer>
  );
}
