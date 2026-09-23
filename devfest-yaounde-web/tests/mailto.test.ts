import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mailtoHref, withMailDraft } from "@/lib/mailto";
import en from "../messages/en.json";
import fr from "../messages/fr.json";

const decode = (href: string) => {
  const url = new URL(href);
  return {
    to: decodeURIComponent(url.pathname),
    subject: url.searchParams.get("subject"),
    body: url.searchParams.get("body"),
  };
};

describe("mailto links with a message already written", () => {
  it("encodes per RFC 6068: %20 not +, CRLF line breaks", () => {
    const href = mailtoHref("team@example.com", {
      subject: "Hello there",
      body: "Line one\nLine two",
    });
    assert.equal(
      href,
      "mailto:team@example.com?subject=Hello%20there&body=Line%20one%0D%0ALine%20two",
    );
    assert.ok(
      !href.includes("+"),
      "a + would show up literally in many clients",
    );
  });

  it("round-trips awkward characters through a real URL parser", () => {
    const subject = 'Q&A? #1 — « ça marche » 100% "quoted" 50/50';
    const body = "Bonjour,\n\nJ'ai une question :\n\n\nMerci ! é è ç 👋";
    const got = decode(mailtoHref("gdg@example.com", { subject, body }));
    assert.equal(got.to, "gdg@example.com");
    assert.equal(got.subject, subject);
    // CRLF is what a mail client is asked to render.
    assert.equal(got.body, body.replace(/\n/g, "\r\n"));
  });

  it("leaves out whatever is not given", () => {
    assert.equal(mailtoHref("a@b.co"), "mailto:a@b.co");
    assert.equal(
      mailtoHref("a@b.co", { subject: "S" }),
      "mailto:a@b.co?subject=S",
    );
    assert.equal(mailtoHref("a@b.co", { body: "B" }), "mailto:a@b.co?body=B");
  });

  it("cannot be talked into a header injection through the text", () => {
    // A subject or body is DATA: CR/LF and `&` in it cannot start a new
    // header or a new parameter, because everything is percent-encoded.
    const href = mailtoHref("a@b.co", {
      subject: "hi\r\nBcc: victim@example.com",
      body: "x&cc=victim@example.com",
    });
    const url = new URL(href);
    assert.deepEqual([...url.searchParams.keys()], ["subject", "body"]);
    assert.ok(!/[\r\n]/.test(href), "no raw line break in the URL");
  });
});

describe("withMailDraft — for links written into editable content", () => {
  const draft = { subject: "S", body: "B" };

  it("adds the message to a bare mailto", () => {
    assert.equal(
      withMailDraft("mailto:gdg@example.com", draft),
      "mailto:gdg@example.com?subject=S&body=B",
    );
    assert.equal(
      withMailDraft("  MAILTO:gdg@example.com ", draft),
      "mailto:gdg@example.com?subject=S&body=B",
    );
  });

  it("leaves a link that already has its own message exactly as authored", () => {
    const own = "mailto:gdg@example.com?subject=Sponsorship";
    assert.equal(withMailDraft(own, draft), own);
  });

  it("never rewrites anything that is not a plain mailto", () => {
    for (const href of [
      "https://example.com",
      "/faqs",
      "tel:+237600000000",
      "mailto:",
      "mailto:a b@example.com",
      'mailto:"x"@example.com',
      "mailto:<x@example.com>",
      "javascript:alert(1)",
    ]) {
      assert.equal(withMailDraft(href, draft), href, href);
    }
  });
});

type MailCopy = Record<string, { subject: string; body: string }>;
const mailOf = (messages: unknown) => (messages as { mail: MailCopy }).mail;

describe("the mail copy, both languages", () => {
  const namespaces = [
    "general",
    "claim",
    "takedown",
    "faq",
    "faqMissing",
  ] as const;
  const placeholders = (s: string) =>
    [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it("exists in en and fr for every context, subject and body", () => {
    for (const messages of [en, fr]) {
      for (const ns of namespaces) {
        const entry = mailOf(messages)[ns];
        assert.ok(entry.subject?.trim(), `${ns}.subject`);
        assert.ok(entry.body?.trim(), `${ns}.body`);
        assert.ok(entry.body.includes("\n"), `${ns}.body has room to write`);
      }
    }
  });

  it("uses the same placeholders in both languages", () => {
    for (const ns of namespaces) {
      for (const key of ["subject", "body"] as const) {
        assert.deepEqual(
          placeholders(mailOf(en)[ns][key]),
          placeholders(mailOf(fr)[ns][key]),
          `${ns}.${key}`,
        );
      }
    }
    assert.deepEqual(placeholders(mailOf(en).claim.body), ["ticketId"]);
    assert.deepEqual(placeholders(mailOf(en).faq.subject), ["question"]);
    // The "not in the FAQ" draft is built from the two boxes on the page.
    assert.deepEqual(placeholders(mailOf(en).faqMissing.body), [
      "name",
      "question",
    ]);
  });
});

describe("no bare mailto can creep back in", () => {
  it("every mailto: in src goes through lib/mailto.ts", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (
          /\.(ts|tsx)$/.test(name) &&
          // Normalised before the check: `path.join` uses `\` on Windows, so
          // the literal forward-slash suffix never matched there and this
          // file flagged itself as the one bare `mailto:` it exists to ban.
          !path.replaceAll("\\", "/").endsWith("lib/mailto.ts")
        ) {
          if (readFileSync(path, "utf8").includes("mailto:"))
            offenders.push(path);
        }
      }
    };
    walk(join(process.cwd(), "src"));
    assert.deepEqual(
      offenders,
      [],
      "build mailto links with mailtoHref()/withMailDraft() so they arrive with a message written",
    );
  });
});
