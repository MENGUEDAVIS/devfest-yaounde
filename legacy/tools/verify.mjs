/**
 * Vérification du site statique DevFest Yaoundé.
 *   node tools/verify.mjs
 *
 * 1. les fichiers JS sont syntaxiquement valides et data.js s'évalue ;
 * 2. cohérence des données (speakers du programme, thématiques, doublons) ;
 * 3. chaque href/src local pointe vers un fichier qui existe ;
 * 4. chaque point de montage attendu par main.js existe dans au moins une page ;
 * 5. les balises des pages HTML sont équilibrées.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const checks = [];

const fail = (m) => errors.push(m);
const ok = (m) => checks.push(m);

/* ---------------------------------------------------------------- 1. JS --- */

const dataSrc = readFileSync(join(ROOT, "assets/js/data.js"), "utf8");
const mainSrc = readFileSync(join(ROOT, "assets/js/main.js"), "utf8");

new vm.Script(mainSrc, { filename: "main.js" }); // lève si syntaxe invalide
ok("main.js : syntaxe valide");

const sandbox = { window: {} };
vm.createContext(sandbox);
new vm.Script(dataSrc, { filename: "data.js" }).runInContext(sandbox);
const D = sandbox.window.DEVFEST;
if (!D) fail("data.js n'expose pas window.DEVFEST");
else ok("data.js : window.DEVFEST exposé");

/* ------------------------------------------------------- 2. Cohérence ----- */

if (D) {
  const speakerNames = new Set(D.speakers.map((s) => s.name));

  if (speakerNames.size !== D.speakers.length) fail("speakers : noms en double");
  else ok(`speakers : ${D.speakers.length} entrées uniques`);

  let sessionCount = 0;
  for (const day of D.schedule) {
    for (const s of day.sessions) {
      sessionCount++;
      if (!s.title) fail(`session sans titre dans ${day.id}`);
      if (!s.room) fail(`session sans salle : « ${s.title} »`);
      if (s.speaker && !speakerNames.has(s.speaker))
        fail(`session « ${s.title} » : speaker « ${s.speaker} » absent de la liste speakers`);
    }
  }
  ok(`programme : ${sessionCount} sessions sur ${D.schedule.length} journées, speakers résolus`);

  const tracks = new Set(D.tracks);
  const extraTags = new Set();
  for (const s of D.speakers) for (const t of s.tags || []) if (!tracks.has(t)) extraTags.add(t);
  ok(
    extraTags.size
      ? `thématiques : ${tracks.size} déclarées, hors-liste tolérées : ${[...extraTags].join(", ")}`
      : `thématiques : ${tracks.size} déclarées, toutes couvertes`
  );

  for (const [field, val] of Object.entries({
    "event.registerUrl": D.event.registerUrl,
    "event.communityUrl": D.event.communityUrl,
    "community.members": D.community.members,
  }))
    if (!val) fail(`champ obligatoire vide : ${field}`);

  if (!D.team.length) fail("team : liste vide");
  else ok(`équipe : ${D.team.length} membres`);

  if (!D.faqs.length) fail("faqs : liste vide");
  else ok(`faq : ${D.faqs.length} questions`);
}

/* -------------------------------------------------------- 3./5. Pages ----- */

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "tools") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr", "!doctype",
]);

const pages = htmlFiles(ROOT);
if (!pages.length) fail("aucune page HTML trouvée");

const foundIds = new Set();

for (const page of pages) {
  const rel = relative(ROOT, page).replace(/\\/g, "/");
  const html = readFileSync(page, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const pageDir = dirname(page);

  for (const m of html.matchAll(/\sid="([^"]+)"/g)) foundIds.add(m[1]);

  // 3. liens et ressources locaux
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|#|data:|\/\/)/.test(url)) continue;
    const target = url.endsWith("/") ? join(pageDir, url, "index.html") : join(pageDir, url);
    if (!existsSync(target)) fail(`${rel} → ressource introuvable : ${url}`);
  }

  // 5. équilibre des balises
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z!][a-zA-Z0-9-]*)([^>]*)>/g)) {
    const [, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (VOID.has(tag) || attrs.trimEnd().endsWith("/")) continue;
    if (closing) {
      const last = stack.pop();
      if (last !== tag) fail(`${rel} : balise fermante </${tag}> inattendue (ouverte : ${last ?? "aucune"})`);
    } else stack.push(tag);
  }
  if (stack.length) fail(`${rel} : balises non fermées → ${stack.join(", ")}`);
}
ok(`${pages.length} pages HTML : balises équilibrées et ressources locales résolues`);

/* --------------------------------------------------- 4. Points de montage - */

const MOUNTS = [
  "site-nav", "site-footer", "hero", "marquee", "partners", "passes", "tracks",
  "team", "stats", "other-events", "speakers-preview", "speakers-all",
  "speaker-filters", "day-tabs", "day-panels", "faqs-preview", "faqs-all",
];
const missing = MOUNTS.filter((id) => !foundIds.has(id));
if (missing.length) fail(`points de montage jamais présents dans le HTML : ${missing.join(", ")}`);
else ok(`${MOUNTS.length} points de montage main.js présents dans les pages`);

/* ------------------------------------------------------------- Rapport --- */

for (const c of checks) console.log("  ok  " + c);
for (const e of errors) console.error(" FAIL " + e);
console.log(errors.length ? `\n${errors.length} erreur(s).` : `\nTout est vert (${checks.length} vérifications).`);
process.exit(errors.length ? 1 : 0);
