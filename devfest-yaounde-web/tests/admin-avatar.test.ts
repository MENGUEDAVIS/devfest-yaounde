import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { googleAvatarUrl, googleDisplayName } from "@/lib/admin/avatar";

const GOOD = "https://lh3.googleusercontent.com/a/ACg8ocK=s96-c";

describe("the organiser's Google avatar", () => {
  it("accepts the picture Google supplies, from either key", () => {
    assert.equal(googleAvatarUrl({ avatar_url: GOOD }), GOOD);
    assert.equal(googleAvatarUrl({ picture: GOOD }), GOOD);
  });

  it("prefers avatar_url, and falls through to picture when it is unusable", () => {
    assert.equal(googleAvatarUrl({ avatar_url: GOOD, picture: "x" }), GOOD);
    assert.equal(
      googleAvatarUrl({
        avatar_url: "https://evil.example/a.png",
        picture: GOOD,
      }),
      GOOD,
    );
  });

  it("refuses anything that is not an https URL on Google's image host", () => {
    // user_metadata is writable by the signed-in user themselves, so none of
    // these may reach an <img src>.
    const bad = [
      "http://lh3.googleusercontent.com/a/x", // not https
      "https://evil.example/avatar.png", // another site
      "https://lh3.googleusercontent.com.evil.example/a.png", // lookalike suffix
      "https://evilgoogleusercontent.com/a.png", // not a subdomain
      "https://lh3.googleusercontent.com@evil.example/a.png", // credentials trick
      "https://user:pw@lh3.googleusercontent.com/a.png", // userinfo
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "//lh3.googleusercontent.com/a.png", // scheme-relative
      "/relative/path.png",
      "not a url",
      "",
    ];
    for (const value of bad) {
      assert.equal(googleAvatarUrl({ avatar_url: value }), null, value);
    }
  });

  it("refuses non-strings, an absent value, and an absurdly long one", () => {
    assert.equal(googleAvatarUrl(undefined), null);
    assert.equal(googleAvatarUrl(null), null);
    assert.equal(googleAvatarUrl("https://lh3.googleusercontent.com/x"), null);
    assert.equal(googleAvatarUrl({}), null);
    assert.equal(googleAvatarUrl({ avatar_url: 42 }), null);
    assert.equal(
      googleAvatarUrl({ avatar_url: { toString: () => GOOD } }),
      null,
    );
    assert.equal(
      googleAvatarUrl({
        avatar_url: `https://lh3.googleusercontent.com/${"a".repeat(600)}`,
      }),
      null,
    );
  });

  it("reads a display name, preferring full_name, and ignores blanks", () => {
    assert.equal(
      googleDisplayName({ full_name: " Ada Nkeng ", name: "x" }),
      "Ada Nkeng",
    );
    assert.equal(googleDisplayName({ full_name: "  ", name: "Ben" }), "Ben");
    assert.equal(googleDisplayName({}), null);
    assert.equal(googleDisplayName(undefined), null);
  });
});
