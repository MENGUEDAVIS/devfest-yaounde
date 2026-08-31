/**
 * Where the PawaPay token comes from.
 *
 * The SSM read itself is stubbed — what matters here is the precedence, the
 * caching, and that a missing configuration fails loudly instead of sending
 * an empty bearer token to PawaPay.
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  __setParameterReaderForTests,
  __setVaultReaderForTests,
  resetTokenCache,
  resolvePawapayToken,
} from "@/lib/secrets/pawapay-token";

afterEach(() => {
  __setParameterReaderForTests(null);
  __setVaultReaderForTests(null);
  delete process.env.PAWAPAY_API_TOKEN;
  delete process.env.PAWAPAY_TOKEN_PARAM;
  delete process.env.PAWAPAY_TOKEN_VAULT_KEY;
  resetTokenCache();
});

describe("pawapay token resolution", () => {
  it("prefers a literal token and never touches SSM", async () => {
    let ssmCalls = 0;
    __setParameterReaderForTests(async () => {
      ssmCalls++;
      return "from-ssm";
    });
    process.env.PAWAPAY_API_TOKEN = "literal-token";
    process.env.PAWAPAY_TOKEN_PARAM = "/scd/prod/pawapay-token";

    assert.equal(await resolvePawapayToken(), "literal-token");
    assert.equal(ssmCalls, 0, "SSM must not be consulted when a token is set");
  });

  it("strips whitespace a copy-paste dragged along", async () => {
    process.env.PAWAPAY_API_TOKEN = "  token-with-newline\n";
    assert.equal(await resolvePawapayToken(), "token-with-newline");
  });

  it("reads the SSM parameter when only its name is configured", async () => {
    const seen: string[] = [];
    __setParameterReaderForTests(async (name) => {
      seen.push(name);
      return "secure-string-value";
    });
    process.env.PAWAPAY_TOKEN_PARAM = "/scd/prod/pawapay-token";

    assert.equal(await resolvePawapayToken(), "secure-string-value");
    assert.deepEqual(seen, ["/scd/prod/pawapay-token"]);
  });

  it("caches, so a checkout is not one SSM call per request", async () => {
    let calls = 0;
    __setParameterReaderForTests(async () => {
      calls++;
      return "cached-value";
    });
    process.env.PAWAPAY_TOKEN_PARAM = "/scd/prod/pawapay-token";

    await resolvePawapayToken();
    await resolvePawapayToken();
    await resolvePawapayToken();
    assert.equal(calls, 1);
  });

  it("re-reads after the cache is cleared, so rotation lands", async () => {
    let value = "old-token";
    __setParameterReaderForTests(async () => value);
    process.env.PAWAPAY_TOKEN_PARAM = "/scd/prod/pawapay-token";

    assert.equal(await resolvePawapayToken(), "old-token");
    value = "rotated-token";
    // Still cached...
    assert.equal(await resolvePawapayToken(), "old-token");
    // ...until the TTL lapses, which resetTokenCache stands in for here.
    resetTokenCache();
    assert.equal(await resolvePawapayToken(), "rotated-token");
  });

  it("fails loudly when nothing is configured", async () => {
    await assert.rejects(resolvePawapayToken(), /No PawaPay token configured/);
  });

  it("refuses an empty SSM value rather than sending a blank bearer", async () => {
    __setParameterReaderForTests(async () => "   ");
    process.env.PAWAPAY_TOKEN_PARAM = "/scd/prod/pawapay-token";
    await assert.rejects(resolvePawapayToken(), /empty token/);
  });

  it("surfaces an SSM failure instead of silently returning nothing", async () => {
    // The Lambda version swallows this and returns "", which turns a broken
    // IAM policy into "PawaPay not configured" on the customer's screen.
    __setParameterReaderForTests(async () => {
      throw new Error("AccessDeniedException");
    });
    process.env.PAWAPAY_TOKEN_PARAM = "/scd/prod/pawapay-token";
    await assert.rejects(resolvePawapayToken(), /AccessDenied/);
  });

  it("reads Supabase Vault when a key is configured", async () => {
    const seen: string[] = [];
    __setVaultReaderForTests(async (name) => {
      seen.push(name);
      return "vault-token";
    });
    process.env.PAWAPAY_TOKEN_VAULT_KEY = "pawapay-token";

    assert.equal(await resolvePawapayToken(), "vault-token");
    assert.deepEqual(seen, ["pawapay-token"]);
  });

  it("prefers Vault over SSM when both are configured", async () => {
    let ssmCalls = 0;
    __setVaultReaderForTests(async () => "from-vault");
    __setParameterReaderForTests(async () => {
      ssmCalls++;
      return "from-ssm";
    });
    process.env.PAWAPAY_TOKEN_VAULT_KEY = "pawapay-token";
    process.env.PAWAPAY_TOKEN_PARAM = "/scd/prod/pawapay-token";

    // Supabase is already on the payment path; AWS would be a second cloud.
    assert.equal(await resolvePawapayToken(), "from-vault");
    assert.equal(ssmCalls, 0);
  });

  it("still lets a literal token win over Vault", async () => {
    __setVaultReaderForTests(async () => "from-vault");
    process.env.PAWAPAY_API_TOKEN = "literal";
    process.env.PAWAPAY_TOKEN_VAULT_KEY = "pawapay-token";
    assert.equal(await resolvePawapayToken(), "literal");
  });

  it("reports a missing Vault secret instead of sending an empty bearer", async () => {
    __setVaultReaderForTests(async () => {
      throw new Error("Vault has no secret named pawapay-token");
    });
    process.env.PAWAPAY_TOKEN_VAULT_KEY = "pawapay-token";
    await assert.rejects(resolvePawapayToken(), /no secret named/);
  });
});
