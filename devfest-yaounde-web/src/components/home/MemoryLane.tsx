import { getLocale, getTranslations } from "next-intl/server";
import { isPlaceholderUrl, RECAP_URL } from "@/lib/site-config";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { ScrollStage } from "@/components/ui/ScrollStage";
import { SectionContainer } from "@/components/ui/SectionContainer";
import pastEditions from "@/data/past-editions.json";
import {
  parallaxStyle,
  stageParallax,
  stagePhoto,
  stagePhotoStyle,
} from "@/lib/motion";
import type { PastEditionPhoto } from "@/data/types";

const photos = pastEditions as PastEditionPhoto[];

/**
 * Per-photo resting tilt and parallax depth. Varying the depth is what
 * makes the grid feel like layered prints rather than a flat row — the
 * photos separate as you scroll and re-settle as you pass.
 */
const PHOTO_ROTATION = [-5, 3, -2, 4];
const PARALLAX_DEPTH = [90, 40, 110, 55];
const PHOTO_NUDGE = ["sm:mt-0", "sm:mt-14", "sm:mt-4", "sm:mt-20"];

/**
 * Memory Lane (PHASE5 §5) — the most expressive motion moment on the page.
 * <ScrollStage> links choreography to scroll position so photos assemble on
 * the way in and disperse on the way out, with per-photo parallax depth.
 *
 * Abstract decorative circles removed per PHASE5 §8 — the photo
 * choreography and type scale carry the section now.
 */
export async function MemoryLane() {
  const t = await getTranslations("home.memoryLane");
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <SectionContainer background="offwhite" maxWidth="6xl">
      <ScrollStage>
        <div className={stageParallax} style={parallaxStyle(26)}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-sans text-display-xl font-bold text-black02">
                {t("title")}
              </h2>
              <p className="mt-6 max-w-xl text-body-l text-black02/80">
                {t("body")}
              </p>
            </div>
            {/* The recap has no URL yet, and a link to "#" is a link to
                nowhere — for a visitor and for a crawler alike. It appears
                the moment RECAP_URL is real. */}
            {!isPlaceholderUrl(RECAP_URL) && (
              <a
                href={RECAP_URL}
                className="whitespace-nowrap font-sans text-body-m font-bold text-black02 underline decoration-2 underline-offset-4 transition-colors duration-200 hover:text-black02/60"
              >
                {t("recapCta")}
              </a>
            )}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className={`${stageParallax} ${PHOTO_NUDGE[i % PHOTO_NUDGE.length]}`}
              style={parallaxStyle(PARALLAX_DEPTH[i % PARALLAX_DEPTH.length])}
            >
              {/* Parallax lives on the wrapper, stage choreography on the
                  inner element — two elements so the two transforms don't
                  overwrite each other. */}
              <div
                className={stagePhoto}
                style={stagePhotoStyle(
                  i,
                  PHOTO_ROTATION[i % PHOTO_ROTATION.length],
                )}
              >
                <MorphedImageFrame
                  src={photo.imageUrl}
                  alt={photo.alt[locale]}
                  aspectRatio="4/5"
                  className="border-2 border-black02 shadow-[0_5px_0_0_var(--color-black02)]"
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollStage>
    </SectionContainer>
  );
}
