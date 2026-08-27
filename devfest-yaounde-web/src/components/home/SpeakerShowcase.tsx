"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { Modal } from "@/components/ui/Modal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import speakers from "@/data/speakers.json";
import type { Speaker } from "@/data/types";

const featuredSpeakers = (speakers as Speaker[]).filter((s) => s.featured);

export function SpeakerShowcase() {
  const t = useTranslations("home.speakers");
  const navT = useTranslations("nav");
  const locale = useLocale() as "fr" | "en";
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker | null>(null);

  return (
    <SectionContainer background="pastel-blue" maxWidth="6xl">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-display-l font-bold text-black02">{t("title")}</h2>
        <Button
          tone="blue"
          variant="secondary"
          href="/speakers"
          className="hidden sm:inline-flex"
        >
          {t("cta")}
        </Button>
      </div>

      <div className="mt-8 flex gap-6 overflow-x-auto pb-4">
        {featuredSpeakers.map((speaker) => (
          <button
            key={speaker.id}
            type="button"
            onClick={() => setActiveSpeaker(speaker)}
            className="w-40 shrink-0 text-left transition-transform hover:scale-[1.02] sm:w-48"
          >
            <MorphedImageFrame src={speaker.photoUrl} alt={speaker.name} />
            <p className="mt-3 text-heading-m font-bold text-black02">
              {speaker.name}
            </p>
            <p className="text-body-m text-black02/70">
              {speaker.role[locale]} · {speaker.company}
            </p>
          </button>
        ))}
      </div>

      <Button
        tone="blue"
        variant="secondary"
        href="/speakers"
        className="mt-6 sm:hidden"
      >
        {t("cta")}
      </Button>

      <Modal
        open={activeSpeaker !== null}
        onClose={() => setActiveSpeaker(null)}
        closeLabel={navT("closeMenu")}
        labelledBy={
          activeSpeaker ? `speaker-modal-${activeSpeaker.id}` : undefined
        }
      >
        {activeSpeaker && (
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <MorphedImageFrame
              src={activeSpeaker.photoUrl}
              alt={activeSpeaker.name}
              className="w-32 shrink-0"
            />
            <div>
              <h3
                id={`speaker-modal-${activeSpeaker.id}`}
                className="text-heading-l font-bold text-black02"
              >
                {activeSpeaker.name}
              </h3>
              <p className="mt-1 text-body-m text-black02/70">
                {activeSpeaker.role[locale]} · {activeSpeaker.company}
              </p>
              <p className="mt-4 text-body-m text-black02">
                {activeSpeaker.bio[locale]}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </SectionContainer>
  );
}
