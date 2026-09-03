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
