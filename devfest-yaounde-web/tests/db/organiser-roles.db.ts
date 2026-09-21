/**
 * Lockout protection, proved against a REAL Postgres engine (PHASE23 §E).
 *
 *   npm i --no-save @electric-sql/pglite
 *   npx tsx --conditions=react-server tests/db/organiser-roles.db.ts
 *
 * Not part of `npm test`, for the same reason tests/browser/* is not: it needs
 * a tool that is deliberately not a project dependency (PGlite — Postgres
 * compiled to WASM). It never touches a real database: it builds a scratch one
 * in memory, applies the REAL DDL for `organisers` (0002) and `admin_audit`
 * (0011) and the REAL migration 0026 verbatim, and then:
 *
 *   A. calls the SQL function directly — every rule, every refusal;
 *   B. tries to get around the function with raw SQL (the console, a cascade,
 *      a multi-row delete) — the trigger has to hold;
 *   C. proves the audit row and the change are ONE transaction;
 *   D. sends real `Request` objects through the REAL `handleRoleChange`
 *      handler — the same function the route runs — wired to that database,
 *      so "a direct API call cannot bypass it" is demonstrated, not asserted.
 *
 * What it can NOT show: two connections racing (PGlite is one connection).
 * That guarantee rests on `pg_advisory_xact_lock`, which serialises every
 * membership change, and is argued in ADR 0069 rather than demonstrated here.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { handleRoleChange } from "@/lib/admin/organiser-role-handler";

const migration = (name: string) =>
  readFileSync(
    new URL(`../../supabase/migrations/${name}`, import.meta.url),
    "utf8",
  );

/** The first `create table public.<name> (...) ;` statement in a migration. */
function createTable(sql: string, name: string): string {
  const m = new RegExp(
    `create table public\\.${name} \\([\\s\\S]*?\\n\\);`,
  ).exec(sql);
  if (!m) throw new Error(`no create table for ${name}`);
  return m[0];
}

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`,
  );
}

const ids = {
  A: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  B: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  C: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  GHOST: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};
const email = {
  A: "amina@example.com",
  B: "brice@example.com",
  C: "chloe@example.com",
};

async function fresh() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    insert into auth.users values
      ('${ids.A}','${email.A}'), ('${ids.B}','${email.B}'), ('${ids.C}','${email.C}');
  `);
  await db.exec(
    createTable(migration("0002_capacity_checkin_lifecycle.sql"), "organisers"),
  );
  await db.exec(
    createTable(migration("0011_editorial_store.sql"), "admin_audit"),
  );
  await db.exec(migration("0026_admin_role_management.sql"));
  return db;
}

/** The function's verdict — or `error:<message>` if the database itself refused (e.g. the trigger). */
const role = async (
  db: PGlite,
  actor: string,
  target: string,
  action: string,
  self = false,
) => {
  try {
    return (
      await db.query<{ v: string }>(
        "select public.set_organiser_role($1::uuid,$2::uuid,$3,$4) as v",
        [actor, target, action, self],
      )
    ).rows[0].v;
  } catch (e) {
    return `error:${(e as Error).message}`;
  }
};
const admins = async (db: PGlite) =>
  (
    await db.query<{ user_id: string }>(
      "select user_id from public.organisers order by user_id",
    )
  ).rows.map(
    (r) =>
      Object.entries(ids).find(([, v]) => v === r.user_id)?.[0] ?? r.user_id,
  );
const audit = async (db: PGlite) =>
  (
    await db.query<{ action: string; after: Record<string, unknown> }>(
      "select action, after from public.admin_audit order by created_at, id",
    )
  ).rows;
const rejects = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

async function main() {
  // ======================================================= A. the function
  console.log("\nA. set_organiser_role — every rule");
  {
    const db = await fresh();
    await db.exec(
      `insert into public.organisers (user_id, note) values ('${ids.A}', 'bootstrapped by hand')`,
    );

    check(
      "sole admin cannot be demoted by themself WITH the confirmation flag",
      (await role(db, ids.A, ids.A, "demote", true)) === "last_admin",
      `admins: ${await admins(db)}`,
    );
    check(
      "…nor without it: the hard rule comes before the self-confirmation rule",
      (await role(db, ids.A, ids.A, "demote", false)) === "last_admin",
    );
    check(
      "the sole admin is still an admin afterwards",
      (await admins(db)).join() === "A",
    );

    check(
      "a non-admin cannot promote anyone",
      (await role(db, ids.B, ids.C, "promote")) === "actor_not_admin",
    );
    check(
      "a non-admin cannot demote an admin",
      (await role(db, ids.B, ids.A, "demote")) === "actor_not_admin",
    );
    check("…and nothing changed", (await admins(db)).join() === "A");

    check(
      "promoting an account that does not exist is refused",
      (await role(db, ids.A, ids.GHOST, "promote")) === "target_not_found",
    );
    check(
      "A promotes B",
      (await role(db, ids.A, ids.B, "promote")) === "promoted",
    );
    check(
      "promoting B again is a harmless no-op",
      (await role(db, ids.A, ids.B, "promote")) === "already_admin",
    );
    check(
      "demoting somebody who is not an admin is a no-op",
      (await role(db, ids.A, ids.C, "demote")) === "not_admin",
    );

    check(
      "with two admins, self-demotion still needs the explicit flag",
      (await role(db, ids.A, ids.A, "demote", false)) ===
        "self_confirmation_required",
    );
    check("…and A is still an admin", (await admins(db)).includes("A"));
    check(
      "B demotes A (two admins -> one)",
      (await role(db, ids.B, ids.A, "demote")) === "demoted",
    );
    check(
      "A, no longer an admin, can no longer act",
      (await role(db, ids.A, ids.C, "promote")) === "actor_not_admin",
    );
    check(
      "B is now the last admin and cannot be removed, even by themself with the flag",
      (await role(db, ids.B, ids.B, "demote", true)) === "last_admin",
    );
    check("exactly one admin remains", (await admins(db)).join() === "B");

    check(
      "promotion, demotion AND every refusal were audited",
      (await audit(db)).map((r) => r.action).join(",") ===
        [
          "organiser.demote_refused",
          "organiser.demote_refused",
          "organiser.change_refused",
          "organiser.change_refused",
          "organiser.promoted",
          "organiser.demote_refused", // self_confirmation_required
          "organiser.demoted",
          "organiser.change_refused", // A after demotion
          "organiser.demote_refused", // B last admin
        ].join(","),
      (await audit(db)).map((r) => r.action).join(","),
    );
    const reasons = (await audit(db))
      .filter((r) => r.action === "organiser.demote_refused")
      .map((r) => r.after.reason);
    check(
      "refusal reasons are recorded",
      reasons.join() ===
        "last_admin,last_admin,self_confirmation_required,last_admin",
      reasons.join(),
    );
    await db.close();
  }

  // ==================================================== B. around the function
  console.log("\nB. raw SQL cannot empty the table either (the trigger)");
  {
    const db = await fresh();
    await db.exec(
      `insert into public.organisers (user_id) values ('${ids.A}')`,
    );
    check(
      "`delete from organisers` on the last row is refused",
      !!(await rejects(db.exec("delete from public.organisers"))) &&
        (await admins(db)).join() === "A",
    );
    check(
      "`delete … where user_id = <last>` is refused",
      !!(await rejects(
        db.exec(`delete from public.organisers where user_id='${ids.A}'`),
      )) && (await admins(db)).join() === "A",
    );
    check(
      "deleting the last admin's auth user (cascade) is refused",
      !!(await rejects(
        db.exec(`delete from auth.users where id='${ids.A}'`),
      )) && (await admins(db)).join() === "A",
    );

    await db.exec(
      `insert into public.organisers (user_id) values ('${ids.B}')`,
    );
    check(
      "ONE statement deleting BOTH rows is refused (a row-level trigger would let it through)",
      !!(await rejects(db.exec("delete from public.organisers"))) &&
        (await admins(db)).join() === "A,B",
    );
    check(
      "deleting one of two by hand is allowed (the rule is 'never zero', not 'never delete')",
      (await rejects(
        db.exec(`delete from public.organisers where user_id='${ids.B}'`),
      )) === null && (await admins(db)).join() === "A",
    );
    check(
      "a delete that matches nothing is not mistaken for emptying the table",
      (await rejects(
        db.exec(`delete from public.organisers where user_id='${ids.GHOST}'`),
      )) === null,
    );
    // Setting up a brand-new project: no admins yet, first row inserted by hand.
    const empty = await fresh();
    check(
      "an empty table (first-ever bootstrap) can still be inserted into by hand",
      (await rejects(
        empty.exec(
          `insert into public.organisers (user_id) values ('${ids.C}')`,
        ),
      )) === null,
    );
    await empty.close();
    await db.close();
  }

  // ================================================ C. audit is atomic
  console.log("\nC. the change and its audit row are one transaction");
  {
    const db = await fresh();
    await db.exec(
      `insert into public.organisers (user_id) values ('${ids.A}')`,
    );
    // Make the audit insert impossible for promotions.
    await db.exec(
      `alter table public.admin_audit add constraint no_promo_audit check (action <> 'organiser.promoted')`,
    );
    const verdict = await role(db, ids.A, ids.B, "promote");
    check(
      "if the audit row cannot be written, the promotion does NOT happen",
      verdict.startsWith("error:") && (await admins(db)).join() === "A",
      verdict.slice(0, 70),
    );
    await db.close();
  }

  // ================================ D. real requests -> real handler -> real SQL
  console.log("\nD. direct API attempts, through the real request handler");
  {
    const db = await fresh();
    await db.exec(
      `insert into public.organisers (user_id) values ('${ids.A}')`,
    );
    let session: keyof typeof ids | null = "A";
    const deps = () => ({
      // Same lookup as the real `currentOrganiser`: a row in `organisers`.
      async currentOrganiser() {
        if (!session) return null;
        const yes = (
          await db.query("select 1 from public.organisers where user_id=$1", [
            ids[session],
          ])
        ).rows.length;
        return yes
          ? { userId: ids[session], email: email[session as "A"] ?? null }
          : null;
      },
      rateLimit: async () => ({
        allowed: true,
        count: 1,
        retryAfterSeconds: 600,
      }),
      async getTarget(id: string) {
        const r = (
          await db.query<{ id: string; email: string }>(
            "select id, email from auth.users where id=$1",
            [id],
          )
        ).rows[0];
        return r ?? null;
      },
      async setRole(a: {
        actor: string;
        target: string;
        action: string;
        confirmSelf: boolean;
      }) {
        try {
          return await role(db, a.actor, a.target, a.action, a.confirmSelf);
        } catch {
          return null;
        }
      },
      recordAudit: async () => {},
      log: { warn() {}, error() {} },
    });
    const post = async (body: unknown) => {
      const res = await handleRoleChange(
        new Request("https://site.test/api/admin/organisers", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            host: "site.test",
            origin: "https://site.test",
          },
          body: JSON.stringify(body),
        }),
        deps(),
      );
      return { status: res.status, body: await res.json() };
    };

    // The scenario the brief names: try to demote the last admin.
    let r = await post({
      userId: ids.A,
      action: "demote",
      confirmEmail: email.A,
      confirmSelf: true,
    });
    check(
      "API: demote the LAST admin (self, with confirmSelf, correct typed email) -> 409 last_admin",
      r.status === 409 && r.body.error === "last_admin",
      `${r.status} ${JSON.stringify(r.body)}`,
    );
    check(
      "     …and the database still has that admin",
      (await admins(db)).join() === "A",
    );

    r = await post({ userId: ids.A, action: "demote", confirmEmail: email.A });
    check(
      "API: same, without confirmSelf -> 409",
      r.status === 409 && r.body.error === "last_admin",
      JSON.stringify(r.body),
    );

    r = await post({
      userId: ids.A,
      action: "demote",
      confirmEmail: "someone-else@example.com",
      confirmSelf: true,
    });
    check(
      "API: wrong typed email is refused before the database is even asked -> 400",
      r.status === 400 && r.body.error === "confirmation_mismatch",
      JSON.stringify(r.body),
    );

    r = await post({ userId: ids.B, action: "promote", confirmEmail: email.B });
    check(
      "API: promote B -> 200 promoted",
      r.status === 200 && r.body.result === "promoted",
      JSON.stringify(r.body),
    );

    r = await post({ userId: ids.A, action: "demote", confirmEmail: email.A });
    check(
      "API: with two admins, self-demotion without confirmSelf -> 409 self_confirmation_required",
      r.status === 409 && r.body.error === "self_confirmation_required",
      JSON.stringify(r.body),
    );

    r = await post({ userId: ids.B, action: "demote", confirmEmail: email.B });
    check(
      "API: A demotes B -> 200 demoted",
      r.status === 200 && r.body.result === "demoted",
      JSON.stringify(r.body),
    );
    check("     one admin left", (await admins(db)).join() === "A");

    r = await post({
      userId: ids.A,
      action: "demote",
      confirmEmail: email.A,
      confirmSelf: true,
    });
    check(
      "API: A, now the last admin again, still cannot remove themself -> 409",
      r.status === 409 && r.body.error === "last_admin",
      JSON.stringify(r.body),
    );

    session = "B"; // B was just demoted — their session still exists, their admin row does not
    r = await post({ userId: ids.C, action: "promote", confirmEmail: email.C });
    check(
      "API: the demoted admin's next request is refused outright -> 403 forbidden",
      r.status === 403 && r.body.error === "forbidden",
      JSON.stringify(r.body),
    );
    r = await post({
      userId: ids.A,
      action: "demote",
      confirmEmail: email.A,
      confirmSelf: true,
    });
    check(
      "API: …including an attempt to remove the last admin -> 403",
      r.status === 403,
    );
    check(
      "     the last admin is still there, untouched",
      (await admins(db)).join() === "A",
    );

    console.log("\n  audit trail (action / reason):");
    for (const row of await audit(db))
      console.log(`    ${row.action.padEnd(26)} ${JSON.stringify(row.after)}`);
    await db.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
