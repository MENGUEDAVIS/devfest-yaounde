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
        privacyUrl: "https://example.com/privacy",
        cocUrl: "#",
        bevyUrl: "https://gdg.community.dev/x",
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

  it("refuses a javascript: URL", () => {
    assert.equal(
      settingsSchema.safeParse({ privacyUrl: "javascript:alert(1)" }).success,
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
