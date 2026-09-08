"use client";

import { useState } from "react";
import type { AdminSettings, CfsOverride } from "@/lib/admin/shape";
import { isoToWatLocal, watLocalToIso } from "@/lib/admin/form-helpers";
import { cfsView } from "@/lib/content/cfs";
import { Segmented } from "../forms/fields";
import { Panel } from "./shared";

const ANNOUNCE_MAX = 180;

export function AdminConfig({
  settings,
  speakerCount,
}: {
  settings: AdminSettings;
  /** How many speakers the store holds — what the automatic rule reads. */
  speakerCount: number;
}) {
  const [announcementFr, setAnnouncementFr] = useState(
    settings.announcement?.fr ?? "",
  );
  const [announcementEn, setAnnouncementEn] = useState(
    settings.announcement?.en ?? "",
  );
  const [privacyUrl, setPrivacyUrl] = useState(settings.privacyUrl);
  const [cocUrl, setCocUrl] = useState(settings.cocUrl);
  const [bevyUrl, setBevyUrl] = useState(settings.bevyUrl);
  const [cfsUrl, setCfsUrl] = useState(settings.cfs.url);
  const [cfsOpens, setCfsOpens] = useState(isoToWatLocal(settings.cfs.opensAt));
  const [cfsCloses, setCfsCloses] = useState(
    isoToWatLocal(settings.cfs.closesAt),
  );
  const [cfsOverride, setCfsOverride] = useState<CfsOverride>(
    settings.cfs.override,
  );
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
        cfs: {
          url: cfsUrl,
          opensAt: watLocalToIso(cfsOpens),
          closesAt: watLocalToIso(cfsCloses),
          override: cfsOverride,
        },
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

  /*
    What the public site would do right now, from the SAME function the public
    site calls. A settings screen that describes rules in prose is a settings
    screen that goes out of date; this one asks.

    `speakerCount` is the saved figure, not the unsaved form — the sentence
    describes the site as it stands, and the fields above it are what you are
    about to change.
  */
  const preview = cfsView(
    {
      url: cfsUrl,
      opensAt: watLocalToIso(cfsOpens),
      closesAt: watLocalToIso(cfsCloses),
      override: cfsOverride,
    },
    speakerCount,
  );
  const explain =
    preview.state === "lineup"
      ? `Hidden — the site is showing the speaker lineup (${speakerCount} on the list).`
      : preview.state === "waiting"
        ? "Showing as “opens soon”. Nobody can submit yet."
        : preview.state === "closed"
          ? "Showing as closed. Submissions are over and there is no lineup yet."
          : cfsUrl.trim()
            ? "Live — the call is running, on the speakers page, the home page and the banner."
            : "Open, but with no submission URL there is nothing to show. Add one above.";

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
        {/*
          The call for speakers, which is currently what the whole speaker
          half of the site hangs off. It lives beside the announcement rather
          than in its own view because it is four fields, and because the
          banner it drives is edited two boxes above it.
        */}
        <div className="flex flex-col gap-5 rounded-lg border border-black02/15 bg-pastel/40 p-4">
          <div>
            <h3 className="font-sans text-body-l font-bold text-black02">
              Call for speakers
            </h3>
            <p className="mt-1 text-caption text-black02/70">{explain}</p>
          </div>

          <label className="block text-body-m font-bold text-black02">
            Submission URL
            <input
              className={field}
              value={cfsUrl}
              placeholder="https://sessionize.com/…"
              onChange={(e) => setCfsUrl(e.target.value)}
            />
            <span className="mt-1 block text-caption font-normal text-black02/60">
              Where the submit button sends people. With this empty the call
              never shows — there would be nowhere to click.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-body-m font-bold text-black02">
              Opens
              <input
                type="datetime-local"
                className={field}
                value={cfsOpens}
                onChange={(e) => setCfsOpens(e.target.value)}
              />
            </label>
            <label className="block text-body-m font-bold text-black02">
              Closes
              <input
                type="datetime-local"
                className={field}
                value={cfsCloses}
                onChange={(e) => setCfsCloses(e.target.value)}
              />
            </label>
          </div>
          <p className="-mt-2 text-caption text-black02/60">
            Both in Yaoundé time, whatever clock you are reading this on. Leave
            one empty for no bound — an empty close means the countdown
            disappears and the call stays open until you change it.
          </p>

          <div className="text-body-m font-bold text-black02">
            Show the call
            <span className="mt-1.5 block">
              <Segmented
                name="cfs-override"
                value={cfsOverride}
                options={[
                  { value: "auto", label: "Automatic" },
                  { value: "force-on", label: "Always" },
                  { value: "force-off", label: "Never" },
                ]}
                onChange={setCfsOverride}
              />
            </span>
            <span className="mt-1.5 block text-caption font-normal text-black02/60">
              Automatic shows the call while the speaker list is empty and
              switches to the lineup as soon as you add one. Override it when
              the two disagree — a lineup announced before it is entered here,
              or a call reopened after the first speaker landed.
            </span>
          </div>
        </div>

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
