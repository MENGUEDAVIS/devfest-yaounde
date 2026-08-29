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
  /** Primary track — drives the /speakers filter. */
  track: LocalizedString;
  /** Event day they appear on — drives the /speakers filter. */
  day: number;
  sessionIds: string[];
  social?: { x?: string; linkedin?: string; website?: string };
  /** Casual interview-style question shown in the detail reveal. */
  icebreakerQuestion: LocalizedString;
  /** Their short answer to it — brand-voice personality, not a data row. */
  icebreakerAnswer: LocalizedString;
  /** Optional short, shareable funny note. Omit rather than leaving blank. */
  funnyMoment?: LocalizedString;
  /** true = shown in the Home preview slider. */
  featured?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString;
  /** Personality-forward one-liner, not a formal bio (PAGES.md §6). */
  oneLiner: LocalizedString;
  /**
   * What they actually do for the event (Organising, Sponsoring, Ushering,
   * Design, Logistics, Programme…). This doubles as the grouping/filter axis
   * on /team — we group by contribution rather than an invented sub-team org
   * chart, which was never confirmed. See docs/decisions/0010-team-grouping.md.
   */
  contribution: LocalizedString;
  photoUrl: string;
  social?: { x?: string; linkedin?: string; website?: string };
  /** Casual interview-style question shown in the detail reveal. */
  icebreakerQuestion: LocalizedString;
  /** Their short answer to it. */
  icebreakerAnswer: LocalizedString;
  /** Optional short, shareable funny note. */
  funnyMoment?: LocalizedString;
  /** true = rendered in the Alumni / Past Organizers section. */
  alumni?: boolean;
  /** Year(s) they organised — alumni only. */
  years?: string;
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

/**
 * A schedule session. Shaped so the Home preview and the full /schedule
 * route share one component and one record type (devfest-content-model).
 */
export type SessionKind = "talk" | "workshop" | "panel" | "break";

export interface Session {
  id: string;
  /** "HH:mm" — local event time. */
  time: string;
  /** Minutes; drives the displayed duration. */
  durationMin: number;
  day: number;
  kind: SessionKind;
  title: LocalizedString;
  description: LocalizedString;
  track: LocalizedString;
  room: LocalizedString;
  /** Free-form tags rendered as Badges. */
  tags: LocalizedString[];
  /** e.g. "bring a laptop" — only rendered when present. */
  bring?: LocalizedString;
  /** e.g. "we provide the boards" — only rendered when present. */
  provided?: LocalizedString;
  /** Ids into speakers.json; empty for breaks. */
  speakerIds: string[];
}

export interface FaqItem {
  id: string;
  category: "general" | "tickets" | "venue" | "shop" | "code-of-conduct";
  question: LocalizedString;
  answer: LocalizedString;
}
