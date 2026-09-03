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
  discountWriteSchema,
  settingsSchema,
} from "@/lib/content/schemas";
import { dryRun, parseCsv } from "@/lib/admin/csv";
import {
  SPEAKER_CSV_SPEC,
  speakersFromCsv,
} from "@/lib/content/from-csv";
import {
  applyPhotoUrl,
  entryNeedsPhoto,
  isPlaceholderPhoto,
} from "@/lib/content/photos";

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
      const parsed = collectionSchemas[id as keyof typeof collectionSchemas].safeParse(
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
    const copy = [...speakers, speakers[0]];
    assert.equal(collectionSchemas.speakers.safeParse(copy).success, false);
  });

  it("refuses a percent over 100 at the route's extra check, not the schema", () => {
    const parsed = discountWriteSchema.safeParse({
      code: "TOO-MUCH",
      kind: "percent",
      value: 150,
    });
    assert.equal(parsed.success, true);
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
      {
        ...speakers[0],
        id: "ama-nkeng",
        photoUrl: "https://example.com/kept.jpg",
      },
    ]);
    assert.equal(payload[0].photoUrl, "https://example.com/kept.jpg");
    assert.equal(
      collectionSchemas.speakers.safeParse(payload).success,
      true,
    );
  });
});

describe("editorial photos", () => {
  it("treats empty, hash and placeholder paths as missing", () => {
    assert.equal(isPlaceholderPhoto(""), true);
    assert.equal(isPlaceholderPhoto("#"), true);
    assert.equal(isPlaceholderPhoto("/placeholders/speaker-1.svg"), true);
    assert.equal(
      isPlaceholderPhoto("https://x.supabase.co/storage/v1/object/public/editorial/speakers/a.jpg"),
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
      entryNeedsPhoto({ photoUrl: "/placeholders/x.svg" }, {
        kind: "url",
        field: "photoUrl",
      }),
      true,
    );
  });
});
