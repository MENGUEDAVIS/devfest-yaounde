import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import pastEditions from "@/data/past-editions.json";
import sponsors from "@/data/sponsors.json";
import { marqueeLoop } from "@/lib/motion";
import type { PastEditionPhoto, Sponsor } from "@/data/types";

const heroPhotos = (pastEditions as PastEditionPhoto[]).slice(0, 3);
const sponsorList = sponsors as Sponsor[];

export async function Hero() {
  const t = await getTranslations("home.hero");
  const locale = (await getLocale()) as "fr" | "en";
  const year = new Date().getFullYear();

  return (
    <div className="bg-offwhite">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="font-mono text-mono-tag uppercase tracking-wide text-blue">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 text-display-l font-bold text-black02 sm:text-display-xl">
            {t("headline", { year })}
          </h1>
          <p className="mt-4 text-body-l text-black02">
            {t("dates")} · {t("venue")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button tone="yellow" href="/tickets">
              {t("ctaPrimary")}
            </Button>
            <Button tone="green" variant="secondary" href="/shop">
              {t("ctaSecondary")}
            </Button>
            <a
              href="#"
              className="text-body-m font-bold text-blue underline underline-offset-4 hover:text-blue/80"
            >
              {t("ctaTertiary")}
            </a>
          </div>
        </div>

        <div className="relative grid h-72 grid-cols-2 gap-4 sm:h-96">
          {heroPhotos[0] && (
            <MorphedImageFrame
              src={heroPhotos[0].imageUrl}
              alt={heroPhotos[0].alt[locale]}
              aspectRatio="1/1"
              className="col-span-2 sm:col-span-1"
            />
          )}
          <div className="hidden flex-col gap-4 sm:flex">
            {heroPhotos[1] && (
              <MorphedImageFrame
                src={heroPhotos[1].imageUrl}
                alt={heroPhotos[1].alt[locale]}
                aspectRatio="4/3"
              />
            )}
            {heroPhotos[2] && (
              <MorphedImageFrame
                src={heroPhotos[2].imageUrl}
                alt={heroPhotos[2].alt[locale]}
                aspectRatio="4/3"
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-black02/10 py-8">
        <p className="mx-auto max-w-5xl px-4 text-center text-caption font-mono uppercase tracking-wide text-black02/60 sm:px-6">
          {t("sponsorsLabel")}
        </p>
        <div className="mx-auto mt-4 max-w-5xl overflow-hidden px-4 sm:px-6">
          <div className={`${marqueeLoop} flex w-max items-center gap-12`}>
            {[...sponsorList, ...sponsorList].map((sponsor, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- static local placeholder SVGs, no next/image optimization needed
              <img
                key={`${sponsor.id}-${i}`}
                src={sponsor.logoUrl}
                alt={sponsor.name}
                className="h-16 w-auto shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
