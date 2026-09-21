import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BURST_FLAG_AT,
  handleRoleChange,
  type RoleChangeDeps,
} from "@/lib/admin/organiser-role-handler";
import {
  ROLE_HTTP,
  ROLE_RESULTS,
  confirmationMatches,
  isSameOrigin,
} from "@/lib/admin/organiser-roles";

const ACTOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

interface Calls {
  setRole: unknown[];
  audit: { action: string; [k: string]: unknown }[];
  organiserLookups: number;
  rateLimits: number;
}

/** Fake collaborators that record what the handler asked for. */
function world(
  over: Partial<RoleChangeDeps> = {},
  verdict: unknown = "promoted",
) {
  const calls: Calls = {
    setRole: [],
    audit: [],
    organiserLookups: 0,
    rateLimits: 0,
  };
  const deps: RoleChangeDeps = {
    async currentOrganiser() {
      calls.organiserLookups++;
      return { userId: ACTOR, email: "boss@example.com" };
    },
    async rateLimit() {
      calls.rateLimits++;
      return { allowed: true, count: 1, retryAfterSeconds: 600 };
    },
    async getTarget(id) {
      return id === OTHER
        ? { id: OTHER, email: "Ada.Nkeng@Example.com" }
        : id === ACTOR
          ? { id: ACTOR, email: "boss@example.com" }
          : null;
    },
    async setRole(args) {
      calls.setRole.push(args);
      return verdict as string | null;
    },
    async recordAudit(entry) {
      calls.audit.push(entry);
    },
    log: { warn() {}, error() {} },
    ...over,
  };
  return { deps, calls };
}

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://site.test/api/admin/organisers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "site.test",
      origin: "https://site.test",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const good = {
  userId: OTHER,
  action: "promote",
  confirmEmail: "ada.nkeng@example.com",
};

describe("role-change vocabulary", () => {
  it("has an HTTP answer for every verdict the database can give", () => {
    for (const result of ROLE_RESULTS) assert.ok(ROLE_HTTP[result], result);
  });

  it("only promoted/demoted count as a change; refusals never do", () => {
    for (const result of ROLE_RESULTS) {
      const changed = ROLE_HTTP[result].changed;
      assert.equal(
        changed,
        result === "promoted" || result === "demoted",
        result,
      );
      if (ROLE_HTTP[result].error) assert.ok(ROLE_HTTP[result].status >= 400);
    }
    assert.equal(ROLE_HTTP.last_admin.status, 409);
  });

  it("confirmationMatches is exact apart from case and surrounding space", () => {
    assert.equal(confirmationMatches(" Ada@X.com ", "ada@x.com"), true);
    assert.equal(confirmationMatches("ada@x.co", "ada@x.com"), false, "prefix");
    assert.equal(confirmationMatches("ada@x.comm", "ada@x.com"), false);
    assert.equal(confirmationMatches("", ""), false);
    assert.equal(
      confirmationMatches("anything", null),
      false,
      "no email, no confirm",
    );
    assert.equal(confirmationMatches("anything", undefined), false);
  });

  it("isSameOrigin refuses another site, a null origin string and junk", () => {
    assert.equal(isSameOrigin("https://site.test", "site.test"), true);
    assert.equal(isSameOrigin(null, "site.test"), true, "non-browser client");
    assert.equal(isSameOrigin("https://evil.example", "site.test"), false);
    assert.equal(isSameOrigin("null", "site.test"), false);
    assert.equal(isSameOrigin("not a url", "site.test"), false);
    assert.equal(isSameOrigin("https://site.test", null), false);
  });
});

describe("POST /api/admin/organisers — refusals never reach the database function", () => {
  it("refuses a cross-site request before it even looks at a session", async () => {
    const { deps, calls } = world();
    const res = await handleRoleChange(
      req(good, { origin: "https://evil.example" }),
      deps,
    );
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, "cross_origin");
    assert.equal(calls.organiserLookups, 0);
    assert.equal(calls.setRole.length, 0);
  });

  it("refuses a body that is not JSON", async () => {
    const { deps, calls } = world();
    const res = await handleRoleChange(
      req("userId=1", { "content-type": "text/plain" }),
      deps,
    );
    assert.equal(res.status, 400);
    assert.equal(calls.setRole.length, 0);
  });

  it("refuses somebody who is not an admin", async () => {
    const { deps, calls } = world({ currentOrganiser: async () => null });
    const res = await handleRoleChange(req(good), deps);
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, "forbidden");
    assert.equal(calls.setRole.length, 0);
    assert.equal(
      calls.rateLimits,
      0,
      "not even counted — nothing to attribute",
    );
  });

  it("refuses once the caller is over the rate limit", async () => {
    const { deps, calls } = world({
      rateLimit: async () => ({
        allowed: false,
        count: 11,
        retryAfterSeconds: 600,
      }),
    });
    const res = await handleRoleChange(req(good), deps);
    assert.equal(res.status, 429);
    assert.equal(calls.setRole.length, 0);
  });

  it("flags the Nth change in a window once, in the audit trail", async () => {
    const flagged = world({
      rateLimit: async () => ({
        allowed: true,
        count: BURST_FLAG_AT,
        retryAfterSeconds: 600,
      }),
    });
    await handleRoleChange(req(good), flagged.deps);
    assert.deepEqual(
      flagged.calls.audit.map((a) => a.action),
      ["organiser.rapid_changes"],
    );
    const quiet = world({
      rateLimit: async () => ({
        allowed: true,
        count: BURST_FLAG_AT + 1,
        retryAfterSeconds: 600,
      }),
    });
    await handleRoleChange(req(good), quiet.deps);
    assert.equal(
      quiet.calls.audit.length,
      0,
      "flagged once, not on every call after",
    );
  });

  it("refuses a malformed body: bad id, unknown action, extra keys, wrong types", async () => {
    const bads: unknown[] = [
      { ...good, userId: "not-a-uuid" },
      { ...good, action: "make-owner" },
      { ...good, isSuperuser: true }, // .strict(): unknown keys are refused
      { ...good, confirmSelf: "true" }, // a string is not `true`
      { userId: OTHER, action: "promote" }, // no confirmation at all
      { ...good, confirmEmail: "" },
      "[]",
      "null",
    ];
    for (const bad of bads) {
      const { deps, calls } = world();
      const res = await handleRoleChange(req(bad), deps);
      assert.equal(res.status, 400, JSON.stringify(bad));
      assert.equal(calls.setRole.length, 0, JSON.stringify(bad));
    }
  });

  it("refuses a target that is not a real account", async () => {
    const { deps, calls } = world();
    const res = await handleRoleChange(
      req({ ...good, userId: "33333333-3333-4333-8333-333333333333" }),
      deps,
    );
    assert.equal(res.status, 404);
    assert.equal(calls.setRole.length, 0);
  });

  it("enforces the typed confirmation on the SERVER, and records the attempt", async () => {
    // A direct API call skips the screen, so the check cannot live there.
    for (const wrong of [
      "nobody@example.com",
      "ada.nkeng@example",
      "ADA",
      "x@y",
    ]) {
      const { deps, calls } = world();
      const res = await handleRoleChange(
        req({ ...good, confirmEmail: wrong }),
        deps,
      );
      assert.equal(res.status, 400, wrong);
      assert.equal((await res.json()).error, "confirmation_mismatch");
      assert.equal(calls.setRole.length, 0, wrong);
      assert.equal(calls.audit[0]?.action, "organiser.change_refused", wrong);
    }
  });
});

describe("POST /api/admin/organisers — what a permitted request does", () => {
  it("passes exactly the actor, target, action and self flag to the database", async () => {
    const { deps, calls } = world();
    // Email is compared case-insensitively.
    const res = await handleRoleChange(
      req({ ...good, confirmEmail: "ADA.NKENG@EXAMPLE.COM" }),
      deps,
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { result: "promoted", changed: true });
    assert.deepEqual(calls.setRole, [
      { actor: ACTOR, target: OTHER, action: "promote", confirmSelf: false },
    ]);
  });

  it("only forwards confirmSelf when it is literally true", async () => {
    const yes = world({}, "demoted");
    await handleRoleChange(
      req({
        userId: ACTOR,
        action: "demote",
        confirmEmail: "boss@example.com",
        confirmSelf: true,
      }),
      yes.deps,
    );
    assert.equal(
      (yes.calls.setRole[0] as { confirmSelf: boolean }).confirmSelf,
      true,
    );

    const no = world({}, "self_confirmation_required");
    const res = await handleRoleChange(
      req({
        userId: ACTOR,
        action: "demote",
        confirmEmail: "boss@example.com",
      }),
      no.deps,
    );
    assert.equal(
      (no.calls.setRole[0] as { confirmSelf: boolean }).confirmSelf,
      false,
    );
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, "self_confirmation_required");
  });

  it("relays the database's verdicts: last admin is a 409 and changes nothing", async () => {
    const { deps } = world({}, "last_admin");
    const res = await handleRoleChange(
      req({
        userId: OTHER,
        action: "demote",
        confirmEmail: "ada.nkeng@example.com",
      }),
      deps,
    );
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error, "last_admin");
    assert.equal(body.changed, undefined);
  });

  it("treats an already-true state as a harmless no-op, not an error", async () => {
    const { deps } = world({}, "already_admin");
    const res = await handleRoleChange(req(good), deps);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      result: "already_admin",
      changed: false,
    });
  });

  it("fails CLOSED when the function is missing, the database is down or it says something unexpected", async () => {
    for (const verdict of [null, "", "granted", 42]) {
      const { deps } = world({}, verdict);
      const res = await handleRoleChange(req(good), deps);
      assert.equal(res.status, 500, String(verdict));
      const body = await res.json();
      assert.equal(body.error, "server_error");
      assert.equal(body.changed, undefined);
    }
  });
});
