/**
 * Test de rendu réel : charge chaque page dans jsdom, exécute data.js + main.js
 * et vérifie que le DOM produit contient bien ce qu'on attend.
 *   node tools/render-test.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const checks = [];
const fail = (m) => errors.push(m);
const ok = (m) => checks.push(m);

async function load(relPath) {
  const file = join(ROOT, relPath);
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => fail(`${relPath} : erreur JS — ${e.message}`));

  const dom = new JSDOM(readFileSync(file, "utf8"), {
    url: pathToFileURL(file).href,
    runScripts: "dangerously",
    resources: "usable",
    virtualConsole: vc,
  });
  await new Promise((r) => dom.window.addEventListener("load", r));
  return dom.window.document;
}

function expect(doc, page, selector, min, label) {
  const n = doc.querySelectorAll(selector).length;
  if (n < min) fail(`${page} : attendu ≥${min} « ${label} » (${selector}), trouvé ${n}`);
  else ok(`${page} : ${n} × ${label}`);
}

/* --------------------------------------------------------------- Accueil -- */
{
  const doc = await load("index.html");
  const p = "index.html";
  expect(doc, p, "nav.nav a", 5, "liens de navigation");
  expect(doc, p, ".hero__stage", 1, "hero");
  expect(doc, p, ".hero__title", 1, "titre hero");
  expect(doc, p, ".marquee span", 10, "éléments du bandeau");
  expect(doc, p, ".stat", 4, "chiffres clés");
  expect(doc, p, ".partner", 5, "partenaires");
  expect(doc, p, ".pass", 2, "passes");
  expect(doc, p, "#speakers-preview .speaker", 6, "speakers en aperçu");
  expect(doc, p, ".track", 14, "thématiques");
  expect(doc, p, ".day-tab", 2, "onglets de journée");
  expect(doc, p, ".session", 13, "sessions du jour 1");
  expect(doc, p, "#faqs-preview .faq", 4, "questions en aperçu");
  expect(doc, p, "footer.footer a", 8, "liens de pied de page");

  // les textes pilotés par data-field sont bien substitués
  const filled = [...doc.querySelectorAll("[data-field]")].every((n) => n.textContent.trim());
  filled ? ok(`${p} : tous les [data-field] sont remplis`) : fail(`${p} : un [data-field] est vide`);

  // seul le premier panneau de programme est visible
  const panels = doc.querySelectorAll("#day-panels .day-card");
  if (panels.length === 2 && !panels[0].hidden && panels[1].hidden)
    ok(`${p} : onglets de programme — un seul panneau visible`);
  else fail(`${p} : état initial des panneaux de programme incorrect`);

  // les réponses FAQ sont repliées au départ
  const closed = [...doc.querySelectorAll(".faq__a")].every((a) => a.hidden);
  closed ? ok(`${p} : FAQ repliée par défaut`) : fail(`${p} : une réponse FAQ est ouverte`);
}

/* -------------------------------------------------------------- Speakers -- */
{
  const doc = await load("speakers/index.html");
  const p = "speakers/index.html";
  expect(doc, p, "#speakers-all .speaker", 14, "speakers");
  expect(doc, p, "#speaker-filters .filter", 5, "filtres");
  const active = doc.querySelectorAll('.filter[aria-pressed="true"]').length;
  active === 1 ? ok(`${p} : un seul filtre actif`) : fail(`${p} : ${active} filtres actifs`);
  const cur = doc.querySelector('nav .nav__links a[aria-current="page"]');
  cur?.textContent === "Speakers" ? ok(`${p} : lien de nav courant marqué`) : fail(`${p} : aria-current absent`);
}

/* ------------------------------------------------------------- Programme -- */
{
  const doc = await load("schedule/index.html");
  const p = "schedule/index.html";
  expect(doc, p, ".day-tab", 2, "onglets");
  expect(doc, p, ".session", 13, "sessions");
  expect(doc, p, ".day-card__badge", 2, "en-têtes de journée");
  const workshops = doc.querySelectorAll('.session[data-type="workshop"]').length;
  workshops === 3 ? ok(`${p} : 3 ateliers typés`) : fail(`${p} : ${workshops} ateliers typés au lieu de 3`);
}

/* ------------------------------------------------------------- FAQ/Équipe - */
{
  const doc = await load("faqs/index.html");
  expect(doc, "faqs/index.html", "#faqs-all .faq", 8, "questions");
}
{
  const doc = await load("team/index.html");
  const p = "team/index.html";
  expect(doc, p, "#team .member", 10, "membres");
  const avatars = [...doc.querySelectorAll(".member__avatar")].every((a) => a.textContent.length >= 1);
  avatars ? ok(`${p} : initiales générées pour chaque membre`) : fail(`${p} : avatar sans initiales`);
}

/* ---------------------------------------------------------- Interactions -- */
{
  const doc = await load("index.html");
  const p = "interactions";

  // onglet de journée
  const tabs = doc.querySelectorAll(".day-tab");
  const panels = doc.querySelectorAll("#day-panels .day-card");
  tabs[1].click();
  tabs[1].getAttribute("aria-selected") === "true" && panels[1].hidden === false && panels[0].hidden
    ? ok(`${p} : clic sur l'onglet « ateliers » bascule le panneau`)
    : fail(`${p} : le changement d'onglet de programme ne fonctionne pas`);

  // accordéon FAQ
  const q = doc.querySelector(".faq__q");
  const a = doc.querySelector(".faq__a");
  q.click();
  const opened = q.getAttribute("aria-expanded") === "true" && !a.hidden;
  q.click();
  const reclosed = q.getAttribute("aria-expanded") === "false" && a.hidden;
  opened && reclosed
    ? ok(`${p} : l'accordéon FAQ s'ouvre et se referme`)
    : fail(`${p} : l'accordéon FAQ ne bascule pas`);

  // menu mobile
  const toggle = doc.querySelector(".nav__toggle");
  const links = doc.querySelector(".nav__links");
  toggle.click();
  links.getAttribute("data-open") === "true" && toggle.getAttribute("aria-expanded") === "true"
    ? ok(`${p} : le menu mobile s'ouvre`)
    : fail(`${p} : le menu mobile ne s'ouvre pas`);
}
{
  const doc = await load("speakers/index.html");
  const p = "interactions";
  const filters = [...doc.querySelectorAll("#speaker-filters .filter")];
  const target = filters.find((f) => f.textContent === "Cybersécurité");
  target.click();
  const visible = [...doc.querySelectorAll("#speakers-all .speaker")].filter((c) => !c.hidden);
  visible.length === 2 && target.getAttribute("aria-pressed") === "true"
    ? ok(`${p} : filtre « Cybersécurité » → ${visible.length} speakers`)
    : fail(`${p} : le filtre par thématique renvoie ${visible.length} speakers au lieu de 2`);

  filters[0].click(); // « Tous »
  const all = [...doc.querySelectorAll("#speakers-all .speaker")].filter((c) => !c.hidden);
  all.length === 14 ? ok(`${p} : filtre « Tous » restaure les 14 speakers`) : fail(`${p} : « Tous » ne restaure pas la liste`);
}

/* ------------------------------------------------------------- Rapport ---- */
for (const c of checks) console.log("  ok  " + c);
for (const e of errors) console.error(" FAIL " + e);
console.log(errors.length ? `\n${errors.length} erreur(s).` : `\nRendu conforme (${checks.length} vérifications).`);
process.exit(errors.length ? 1 : 0);
