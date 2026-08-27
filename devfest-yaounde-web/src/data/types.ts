/**
 * Data shapes for src/data/*.json — mirrors the devfest-content-model skill.
 * See .claude/skills/devfest-content-model/SKILL.md for the source of truth.
 */

export type LocalizedString = { fr: string; en: string };

export interface Speaker {
  id: string;
  name: string;
  role: LocalizedString;
  company: string;
  photoUrl: string;
  bio: LocalizedString;
  sessionIds: string[];
  social?: { x?: string; linkedin?: string; website?: string };
  featured?: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  tier?: "platinum" | "gold" | "silver" | "community";
  websiteUrl?: string;
}

export interface Stat {
  id: string;
  value: number;
  suffix?: string;
  label: LocalizedString;
}

export interface Quote {
  id: string;
  text: LocalizedString;
  author: string;
  role?: LocalizedString;
}

export interface PastEditionPhoto {
  id: string;
  imageUrl: string;
  alt: LocalizedString;
  year?: number;
}

export interface FaqItem {
  id: string;
  category: "general" | "tickets" | "venue" | "shop" | "code-of-conduct";
  question: LocalizedString;
  answer: LocalizedString;
}
