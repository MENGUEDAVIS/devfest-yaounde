import { describe, it } from "node:test";
import assert from "node:assert/strict";
import speakers from "@/data/speakers.json";
import team from "@/data/team.json";
import sessions from "@/data/sessions.json";
import sponsors from "@/data/sponsors.json";
import faqs from "@/data/faqs.json";
import products from "@/data/products.json";
import tiers from "@/data/ticket-tiers.json";
import quotes from "@/data/quotes.json";
import stats from "@/data/stats.json";
import pastEditions from "@/data/past-editions.json";
import {
  collectionSchemas,
  discountPatchSchema,
  discountWriteSchema,
  firstZodIssue,
  settingsSchema,
} from "@/lib/content/schemas";
import { dryRun, parseCsv } from "@/lib/admin/csv";
import { SPEAKER_CSV_SPEC, speakersFromCsv } from "@/lib/content/from-csv";
import {
  endsAt,
  isoToWatLocal,
  slugify,
  watLocalToIso,
} from "@/lib/admin/form-helpers";
import { cfsAcceptsSubmissions, cfsView } from "@/lib/content/cfs";
import {
  SPONSOR_SEATS,
  sponsorCallOpen,
  sponsorSeats,
} from "@/lib/content/sponsors";
import type { Sponsor } from "@/data/types";
import {
  applyPhotoUrl,
  entryNeedsPhoto,
  isPlaceholderPhoto,
} from "@/lib/content/photos";

/**
 * A speaker, built here rather than borrowed from `speakers.json`.
 *
 * These tests used to reach for `speakers[0]` as a convenient fixture. That
 * broke the moment the seed was emptied for the real event — the call for
 * speakers is open, so the file is legitimately `[]`, and TypeScript infers
 * `never[]` from it. A test about schema behaviour should not depend on how
 * much content happens to be seeded.
 */
const A_SPEAKER = {
  id: "ama-nkeng",
  name: "Ama Nkeng",
  role: { fr: "Ingénieure", en: "Engineer" },
  company: "Acme",
  photoUrl: "",
  bio: { fr: "Bio", en: "Bio" },
  track: { fr: "Cloud", en: "Cloud" },
  day: 1,
  sessionIds: [],
  social: {},
  icebreakerQuestion: { fr: "Q", en: "Q" },
  icebreakerAnswer: { fr: "A", en: "A" },
};

describe("editorial schemas", () => {
  it("accept the repo files as they stand", () => {
    const files = {
      speakers,
      team,
      sessions,
      sponsors,
      faqs,
      products,
      "ticket-tiers": tiers,
      quotes,
      stats,
      "past-editions": pastEditions,
    } as const;

    for (const [id, payload] of Object.entries(files)) {
      const parsed =
        collectionSchemas[id as keyof typeof collectionSchemas].safeParse(
          payload,
        );
      assert.equal(
        parsed.success,
        true,
        parsed.success
          ? id
          : `${id}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`,
      );
    }
  });

  it("refuses a duplicate speaker id", () => {
    const copy = [A_SPEAKER, A_SPEAKER];
    assert.equal(collectionSchemas.speakers.safeParse(copy).success, false);
  });

  it("accepts a well-formed percent code, including a string value", () => {
    const parsed = discountWriteSchema.safeParse({
      code: "test10",
      kind: "percent",
      value: "10",
      appliesTo: "both",
      active: true,
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.code, "TEST10");
      assert.equal(parsed.data.value, 10);
    }
  });

  it("refuses an empty or short code with a path in the first issue", () => {
    const empty = discountWriteSchema.safeParse({
      code: "",
      kind: "percent",
      value: 10,
    });
    assert.equal(empty.success, false);
    if (!empty.success) {
      assert.match(firstZodIssue(empty.error), /^code:/);
    }
    const short = discountWriteSchema.safeParse({
      code: "AB",
      kind: "percent",
      value: 10,
    });
    assert.equal(short.success, false);
  });

  it("refuses a percent over 100 and an empty value", () => {
    const tooMuch = discountWriteSchema.safeParse({
      code: "TOO-MUCH",
      kind: "percent",
      value: 150,
    });
    assert.equal(tooMuch.success, false);
    if (!tooMuch.success) {
      assert.match(firstZodIssue(tooMuch.error), /percent must be 1–100/);
    }
    const blank = discountWriteSchema.safeParse({
      code: "BLANK",
      kind: "percent",
      value: "",
    });
    assert.equal(blank.success, false);
  });

  it("treats a blank expiry as omitted and still patches active", () => {
    const created = discountWriteSchema.safeParse({
      code: "KEEP",
      kind: "fixed",
      value: 500,
      expiresAt: "",
    });
    assert.equal(created.success, true);
    if (created.success) assert.equal(created.data.expiresAt, null);

    const patched = discountPatchSchema.safeParse({
      active: false,
      code: "KEEP",
    });
    assert.equal(patched.success, true);
    if (patched.success) {
      assert.equal(patched.data.value, undefined);
      assert.equal(patched.data.expiresAt, undefined);
    }
  });

  it("accepts empty announcement strings and https URLs", () => {
    assert.equal(
      settingsSchema.safeParse({
        announcement: { fr: "", en: "Hello" },
        bevyUrl: "https://gdg.community.dev/x",
        legal: { privacyUrl: "https://example.com/privacy", termsUrl: "" },
      }).success,
      true,
    );
  });

  it("accepts the seeded call-for-speakers and sponsor settings", () => {
    const parsed = settingsSchema.safeParse({
      cfs: {
        url: "https://sessionize.com/devfest-yaounde-2026",
        opensAt: "2026-09-05T01:00:00+01:00",
        closesAt: "2026-10-31T23:59:00+01:00",
        override: "auto",
      },
      sponsorCall: {
        prospectusUrl: "https://drive.google.com/file/d/abc/view",
        enabled: true,
        closesAt: null,
      },
      legal: {
        participationTermsUrl: "https://gdg.community.dev/participation-terms/",
        privacyUrl: "https://policies.google.com/privacy",
        termsUrl: "https://policies.google.com/terms",
      },
    });
    assert.equal(parsed.success, true);
  });

  it("refuses a nonsense deadline and an unknown override", () => {
    assert.equal(
      settingsSchema.safeParse({ cfs: { closesAt: "next tuesday" } }).success,
      false,
    );
    assert.equal(
      settingsSchema.safeParse({ cfs: { override: "maybe" } }).success,
      false,
    );
    // A cleared deadline is a real state — the call is open with no end.
    assert.equal(
      settingsSchema.safeParse({ cfs: { closesAt: null } }).success,
      true,
    );
  });

  it("refuses a javascript: URL in every link it accepts", () => {
    const bad = "javascript:alert(1)";
    assert.equal(settingsSchema.safeParse({ bevyUrl: bad }).success, false);
    assert.equal(
      settingsSchema.safeParse({ legal: { privacyUrl: bad } }).success,
      false,
    );
    assert.equal(
      settingsSchema.safeParse({ legal: { participationTermsUrl: bad } })
        .success,
      false,
    );
    assert.equal(settingsSchema.safeParse({ cfs: { url: bad } }).success, false);
    assert.equal(
      settingsSchema.safeParse({ sponsorCall: { prospectusUrl: bad } }).success,
      false,
    );
  });
});

describe("csv of names, photos later", () => {
  it("builds speakers from a basic sheet and keeps an existing photo", () => {
    const sheet = parseCsv(
      [
        "id,name,role_en,role_fr,company,bio_en,bio_fr,photoUrl",
        "ama-nkeng,Ama Nkeng,Engineer,Ingénieure,Acme,Bio,Bio,",
      ].join("\n"),
    );
    const dry = dryRun(sheet, SPEAKER_CSV_SPEC);
    assert.equal(dry.issues.length, 0);
    const payload = speakersFromCsv(dry, [
      { ...A_SPEAKER, photoUrl: "https://example.com/kept.jpg" },
    ]);
    assert.equal(payload[0].photoUrl, "https://example.com/kept.jpg");
    assert.equal(collectionSchemas.speakers.safeParse(payload).success, true);
  });
});

describe("editorial photos", () => {
  it("treats empty, hash and placeholder paths as missing", () => {
    assert.equal(isPlaceholderPhoto(""), true);
    assert.equal(isPlaceholderPhoto("#"), true);
    assert.equal(isPlaceholderPhoto("/placeholders/speaker-1.svg"), true);
    assert.equal(
      isPlaceholderPhoto(
        "https://x.supabase.co/storage/v1/object/public/editorial/speakers/a.jpg",
      ),
      false,
    );
  });

  it("writes a speaker photo onto photoUrl and a product onto images[0]", () => {
    const speaker = applyPhotoUrl(
      { id: "a", photoUrl: "" },
      { kind: "url", field: "photoUrl" },
      "https://cdn/a.jpg",
    );
    assert.equal(speaker.photoUrl, "https://cdn/a.jpg");
    const product = applyPhotoUrl(
      { id: "tee", images: [] },
      { kind: "images", field: "images" },
      "https://cdn/tee.jpg",
    );
    assert.deepEqual(product.images, ["https://cdn/tee.jpg"]);
    assert.equal(
      entryNeedsPhoto(
        { photoUrl: "/placeholders/x.svg" },
        {
          kind: "url",
          field: "photoUrl",
        },
      ),
      true,
    );
  });
});

describe("crm form helpers", () => {
  it("folds accents into a slug rather than dropping the letter", () => {
    // "Joël" must become joel, not jol — the id ends up in a URL and is what
    // the photo upload looks the record up by.
    assert.equal(slugify("Joël Fah"), "joel-fah");
    assert.equal(slugify("Abdel Aziz MFOSSA"), "abdel-aziz-mfossa");
    assert.equal(
      slugify("Grace Divine Tchuenteu Ebe'ete"),
      "grace-divine-tchuenteu-ebe-ete",
    );
  });

  it("never leaves a slug with stray separators", () => {
    assert.equal(slugify("  --Hello,   World!! "), "hello-world");
    assert.equal(slugify(""), "");
  });

  it("adds a duration to a start time", () => {
    assert.equal(endsAt("09:00", 30), "09:30");
    assert.equal(endsAt("14:45", 90), "16:15");
  });

  it("wraps past midnight instead of showing an hour no clock has", () => {
    assert.equal(endsAt("23:30", 60), "00:30");
  });

  it("says so rather than guessing when the time is unparseable", () => {
    assert.equal(endsAt("", 30), "—");
    assert.equal(endsAt("nonsense", 30), "—");
  });

  it("shows and reads back datetimes as Yaoundé wall-clock, not the editor's", () => {
    // The instant below IS 23:59 in Yaoundé. Whatever timezone this test runs
    // in, the admin field must read 23:59 — that is the whole point.
    assert.equal(isoToWatLocal("2026-10-31T22:59:00.000Z"), "2026-10-31T23:59");
    assert.equal(watLocalToIso("2026-10-31T23:59"), "2026-10-31T22:59:00.000Z");
  });

  it("round-trips a datetime through the field unchanged", () => {
    const iso = "2026-09-05T00:00:00.000Z";
    assert.equal(watLocalToIso(isoToWatLocal(iso)), iso);
  });

  it("treats an empty or broken datetime as no bound, not as epoch", () => {
    assert.equal(isoToWatLocal(null), "");
    assert.equal(isoToWatLocal("nonsense"), "");
    assert.equal(watLocalToIso(""), null);
    assert.equal(watLocalToIso("nonsense"), null);
  });
});

describe("sponsor seats and the sponsor call", () => {
  const CALL = {
    prospectusUrl: "https://drive.google.com/file/d/abc/view",
    enabled: true,
    closesAt: null as string | null,
  };
  const sponsor = (id: string): Sponsor => ({
    id,
    name: id,
    logoUrl: `/logos/${id}.svg`,
    tier: "gold",
  });

  it("leaves the rest of the row visibly open when nobody has signed", () => {
    const seats = sponsorSeats([]);
    assert.equal(seats.length, SPONSOR_SEATS);
    assert.ok(seats.every((s) => s.kind === "empty"));
  });

  it("fills from the left and keeps the remaining seats", () => {
    const seats = sponsorSeats([sponsor("a"), sponsor("b")]);
    assert.equal(seats.length, SPONSOR_SEATS);
    assert.deepEqual(
      seats.map((s) => s.kind),
      ["filled", "filled", "empty", "empty", "empty", "empty"],
    );
  });

  it("shows every sponsor when there are more of them than seats", () => {
    const many = Array.from({ length: 9 }, (_, i) => sponsor(`s${i}`));
    const seats = sponsorSeats(many);
    assert.equal(seats.length, 9);
    assert.ok(seats.every((s) => s.kind === "filled"));
  });

  it("asks while the call is on and the deadline has not arrived", () => {
    assert.equal(sponsorCallOpen(CALL), true);
    assert.equal(
      sponsorCallOpen(
        { ...CALL, closesAt: "2026-10-01T00:00:00Z" },
        new Date("2026-09-20T00:00:00Z"),
      ),
      true,
    );
  });

  it("stops asking after the close date", () => {
    assert.equal(
      sponsorCallOpen(
        { ...CALL, closesAt: "2026-10-01T00:00:00Z" },
        new Date("2026-10-02T00:00:00Z"),
      ),
      false,
    );
  });

  it("lets the switch beat a deadline that has not arrived", () => {
    assert.equal(
      sponsorCallOpen(
        { ...CALL, enabled: false, closesAt: "2026-12-01T00:00:00Z" },
        new Date("2026-09-20T00:00:00Z"),
      ),
      false,
    );
  });

  it("does not ask when there is no prospectus behind the button", () => {
    assert.equal(sponsorCallOpen({ ...CALL, prospectusUrl: "   " }), false);
  });

  it("treats an unparseable close date as a typo, not as closed", () => {
    assert.equal(sponsorCallOpen({ ...CALL, closesAt: "soon" }), true);
  });
});

describe("call for speakers", () => {
  const WINDOW = {
    url: "https://sessionize.com/devfest-yaounde-2026",
    opensAt: "2026-09-05T01:00:00+01:00",
    closesAt: "2026-10-31T23:59:00+01:00",
    override: "auto" as const,
  };
  const at = (iso: string) => new Date(iso);

  it("invites submissions while the window is open and nobody is announced", () => {
    const view = cfsView(WINDOW, 0, at("2026-09-08T12:00:00+01:00"));
    assert.equal(view.state, "open");
    assert.equal(cfsAcceptsSubmissions(view), true);
  });

  it("waits before the window opens rather than inviting early", () => {
    assert.equal(
      cfsView(WINDOW, 0, at("2026-09-01T12:00:00+01:00")).state,
      "waiting",
    );
  });

  it("stops inviting the moment the window shuts", () => {
    // One minute past close. The button must not still be live.
    const view = cfsView(WINDOW, 0, at("2026-11-01T00:00:00+01:00"));
    assert.equal(view.state, "closed");
    assert.equal(cfsAcceptsSubmissions(view), false);
  });

  it("shows the lineup as soon as one speaker exists", () => {
    assert.equal(
      cfsView(WINDOW, 1, at("2026-09-08T12:00:00+01:00")).state,
      "lineup",
    );
  });

  it("lets the override win in both directions", () => {
    // A lineup announced before it has been entered.
    assert.equal(
      cfsView(
        { ...WINDOW, override: "force-off" },
        0,
        at("2026-09-08T12:00:00+01:00"),
      ).state,
      "lineup",
    );
    // A call reopened after somebody was already added.
    assert.equal(
      cfsView(
        { ...WINDOW, override: "force-on" },
        5,
        at("2026-09-08T12:00:00+01:00"),
      ).state,
      "open",
    );
  });

  it("treats a cleared deadline as open, not as shut", () => {
    // Somebody blanking the close date in the dashboard must not silently
    // hide the invitation.
    const view = cfsView(
      { ...WINDOW, opensAt: null, closesAt: null },
      0,
      at("2030-01-01T00:00:00Z"),
    );
    assert.equal(view.state, "open");
  });

  it("will not offer a submit button with nowhere to go", () => {
    const view = cfsView(
      { ...WINDOW, url: "" },
      0,
      at("2026-09-08T12:00:00+01:00"),
    );
    assert.equal(view.state, "open");
    assert.equal(cfsAcceptsSubmissions(view), false);
  });

  it("ignores an unparseable date instead of throwing", () => {
    const view = cfsView(
      { ...WINDOW, closesAt: "not a date" },
      0,
      at("2026-09-08T12:00:00+01:00"),
    );
    assert.equal(view.state, "open");
  });
});
