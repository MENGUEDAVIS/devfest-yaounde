"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { Modal } from "@/components/ui/Modal";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import speakers from "@/data/speakers.json";
import type { Speaker } from "@/data/types";

const featuredSpeakers = (speakers as Speaker[]).filter((s) => s.featured);

export function SpeakerShowcase() {
  const t = useTranslations("home.speakers");
  const commonT = useTranslations("common");
  const locale = useLocale() as "fr" | "en";
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker | null>(null);

  return (
    <SectionContainer background="yellow-wash" maxWidth="7xl">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="font-sans text-display-xl font-bold text-black02">
            {t("title")}
          </h2>
          <Button
            tone="black02"
            variant="secondary"
            href="/speakers"
            size="md"
            className="hidden sm:inline-flex"
          >
            {t("cta")}
          </Button>
        </div>
      </Reveal>

      <div className="mt-16 flex gap-8 overflow-x-auto pb-6">
        {featuredSpeakers.map((speaker, i) => (
          <Reveal key={speaker.id} index={i} className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveSpeaker(speaker)}
              className="group w-56 text-left sm:w-64"
            >
              <MorphedImageFrame
                src={speaker.photoUrl}
                alt={speaker.name}
                className="border-2 border-black02 transition-transform duration-300 ease-bouncy group-hover:-translate-y-2 group-hover:rotate-2"
              />
              <p className="mt-5 font-sans text-heading-l font-bold text-black02">
                {speaker.name}
              </p>
              <p className="mt-1 text-body-m text-black02/70">
                {speaker.role[locale]} · {speaker.company}
              </p>
            </button>
          </Reveal>
        ))}
      </div>

      <Button
        tone="black02"
        variant="secondary"
        href="/speakers"
        size="md"
        className="mt-8 sm:hidden"
      >
        {t("cta")}
      </Button>

      <Modal
        open={activeSpeaker !== null}
        onClose={() => setActiveSpeaker(null)}
        closeLabel={commonT("close")}
        labelledBy={
          activeSpeaker ? `speaker-modal-${activeSpeaker.id}` : undefined
        }
      >
        {activeSpeaker && (
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <MorphedImageFrame
              src={activeSpeaker.photoUrl}
              alt={activeSpeaker.name}
              className="w-32 shrink-0 border-2 border-black02"
            />
            <div>
              <h3
                id={`speaker-modal-${activeSpeaker.id}`}
                className="font-sans text-heading-l font-bold text-black02"
              >
                {activeSpeaker.name}
              </h3>
              <p className="mt-1 text-body-m text-black02/70">
                {activeSpeaker.role[locale]} · {activeSpeaker.company}
              </p>
              <p className="mt-5 text-body-m text-black02">
                {activeSpeaker.bio[locale]}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </SectionContainer>
  );
}
