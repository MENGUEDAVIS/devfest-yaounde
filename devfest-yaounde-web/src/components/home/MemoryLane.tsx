import { getLocale, getTranslations } from "next-intl/server";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import pastEditions from "@/data/past-editions.json";
import type { PastEditionPhoto } from "@/data/types";

const photos = pastEditions as PastEditionPhoto[];

export async function MemoryLane() {
  const t = await getTranslations("home.memoryLane");
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <SectionContainer background="offwhite" maxWidth="6xl">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="font-sans text-display-xl font-bold text-black02">
              {t("title")}
            </h2>
            <p className="mt-6 max-w-xl text-body-l text-black02/80">
              {t("body")}
            </p>
          </div>
          <a
            href="#"
            className="whitespace-nowrap font-sans text-body-m font-bold text-black02 underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-black02/60"
          >
            {t("recapCta")}
          </a>
        </div>
      </Reveal>

      <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {photos.map((photo, i) => (
          <Reveal key={photo.id} index={i}>
            <MorphedImageFrame
              src={photo.imageUrl}
              alt={photo.alt[locale]}
              aspectRatio="4/3"
              className="border-2 border-black02 transition-transform duration-300 ease-bouncy hover:-translate-y-2 hover:rotate-2"
            />
          </Reveal>
        ))}
      </div>
    </SectionContainer>
  );
}
