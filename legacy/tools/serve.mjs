/** Serveur statique minimal, sans dépendance : node tools/serve.mjs [port] */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2]) || 8421;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split("?")[0]);
    let file = join(ROOT, normalize(url).replace(/^([/\\])+/, ""));
    if (!file.startsWith(ROOT)) throw new Error("hors racine");

    const info = await stat(file).catch(() => null);
    if (!info || info.isDirectory()) file = join(file, "index.html");

    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
