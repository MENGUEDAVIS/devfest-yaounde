"use client";

import { useState } from "react";
import type { AdminSettings } from "@/lib/admin/shape";
import { Panel } from "./shared";

const ANNOUNCE_MAX = 180;

export function AdminConfig({ settings }: { settings: AdminSettings }) {
  const [announcementFr, setAnnouncementFr] = useState(
    settings.announcement?.fr ?? "",
  );
  const [announcementEn, setAnnouncementEn] = useState(
    settings.announcement?.en ?? "",
  );
  const [privacyUrl, setPrivacyUrl] = useState(settings.privacyUrl);
  const [cocUrl, setCocUrl] = useState(settings.cocUrl);
  const [bevyUrl, setBevyUrl] = useState(settings.bevyUrl);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        announcement: {
          fr: announcementFr,
          en: announcementEn,
        },
        privacyUrl,
        cocUrl,
        bevyUrl,
      }),
    });
    if (!res.ok) {
      setStatus("error");
      setError("Could not save. Check the URLs are https or empty.");
      return;
    }
    setStatus("saved");
  }

  const field =
    "mt-1 w-full rounded-lg border-2 border-black02 bg-offwhite px-3 py-2 font-sans text-body-m text-black02";

  return (
    <Panel
      title="Links and configuration"
      subtitle={
        settings.source === "database"
          ? "Saved in the database — this is what the public site shows."
          : "Still the repo defaults. Save to take over."
      }
    >
      <div className="flex max-w-2xl flex-col gap-5">
        <label className="block text-body-m font-bold text-black02">
          Announcement (fr)
          <textarea
            className={field}
            rows={2}
            maxLength={ANNOUNCE_MAX}
            value={announcementFr}
            onChange={(e) => setAnnouncementFr(e.target.value)}
          />
          <span className="mt-1 block text-caption font-normal text-black02/60">
            {announcementFr.length}/{ANNOUNCE_MAX}
          </span>
        </label>
        <label className="block text-body-m font-bold text-black02">
          Announcement (en)
          <textarea
            className={field}
            rows={2}
            maxLength={ANNOUNCE_MAX}
            value={announcementEn}
            onChange={(e) => setAnnouncementEn(e.target.value)}
          />
          <span className="mt-1 block text-caption font-normal text-black02/60">
            {announcementEn.length}/{ANNOUNCE_MAX}
          </span>
        </label>
        <label className="block text-body-m font-bold text-black02">
          Privacy policy URL
          <input
            className={field}
            value={privacyUrl}
            onChange={(e) => setPrivacyUrl(e.target.value)}
          />
        </label>
        <label className="block text-body-m font-bold text-black02">
          Code of conduct URL
          <input
            className={field}
            value={cocUrl}
            onChange={(e) => setCocUrl(e.target.value)}
          />
        </label>
        <label className="block text-body-m font-bold text-black02">
          Bevy event URL
          <input
            className={field}
            value={bevyUrl}
            onChange={(e) => setBevyUrl(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving"}
          className="self-start rounded-pill border-2 border-black02 bg-primary px-5 py-2.5 font-sans text-body-m font-bold text-black02 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save settings"}
        </button>
        {status === "saved" && (
          <p className="text-body-m font-bold text-black02">Saved.</p>
        )}
        {error && (
          <p className="rounded-lg border-2 border-danger bg-danger-pastel px-4 py-3 text-body-m font-bold text-black02">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}
