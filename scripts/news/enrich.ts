// Enrichissement : pour chaque article Google News, on retrouve la vraie page de l'éditeur,
// puis on en tire une image (og:image) et un EXTRAIT de texte (500 à 1000 caractères max).
// Le reste de l'article n'est jamais copié : le bouton « Lire l'article original » renvoie vers le site de l'éditeur.
import { decode, stripHtml, clip, decodeBytes } from "./text.js";

export const SNIPPET_MAX = Math.min(1000, Math.max(300, Number(process.env.NEWS_SNIPPET_MAX) || 600));
const UA = "Mozilla/5.0 (compatible; CoupDAvanceNewsBot/1.0; +contact: voir mentions légales)";

// ---------- Sécurité : on ne suit que des adresses http(s) publiques ----------
export function isPublicHttp(u: string): boolean {
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) return false;
    const h = x.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === "[::1]") return false;
    return true;
  } catch { return false; }
}

// ---------- 1) Lien Google News → vraie adresse de l'article ----------
const gId = (u: string) => { try { const x = new URL(u); return x.hostname === "news.google.com" ? x.pathname.split("/").pop() ?? null : null; } catch { return null; } };

// Ancien format : l'adresse réelle est directement encodée en base64 dans l'identifiant.
export function decodeGoogleId(id: string): string | null {
  try {
    const s = Buffer.from(id.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("latin1");
    const m = s.match(/https?:\/\/[\x21-\x7e]+/);
    return m && isPublicHttp(m[0]) ? m[0] : null;
  } catch { return null; }
}

// Nouveau format : il faut interroger Google (même méthode que le navigateur). Peut échouer → on garde le lien Google.
async function resolveViaGoogle(id: string): Promise<string | null> {
  const page = await fetch(`https://news.google.com/rss/articles/${id}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
  const html = await page.text();
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1], ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!sg || !ts) return null;
  const inner = JSON.stringify(["garturlreq", [["X", "X", ["X", "X"], null, null, 1, 1, "FR:fr", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], id, Number(ts), sg]);
  const body = "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", inner, null, "generic"]]]));
  const r = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
    method: "POST", body, signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": UA },
  });
  const t = await r.text();
  const part = t.split("\n\n")[1];
  const url = JSON.parse(JSON.parse(part)[0][2])[1];
  return typeof url === "string" && isPublicHttp(url) ? url : null;
}

export async function resolveLink(link: string): Promise<string | null> {
  const id = gId(link);
  if (!id) return isPublicHttp(link) ? link : null;
  return decodeGoogleId(id) ?? (await resolveViaGoogle(id).catch(() => null));
}

// ---------- 2) Page de l'éditeur → image + extrait ----------
const attr = (tag: string, name: string) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i")); return m ? (m[1] ?? m[2]) : null; };

export function meta(html: string, keys: string[]): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const k = (attr(m[0], "property") ?? attr(m[0], "name") ?? "").toLowerCase();
    if (keys.includes(k)) { const c = attr(m[0], "content"); if (c) return decode(c).trim(); }
  }
  return null;
}

// Phrase complète : on coupe à la fin d'une phrase quand c'est possible, sinon sur un mot.
export function cutText(s: string, max: number): string {
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max), end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  return end > max * 0.6 ? head.slice(0, end + 1) : clip(s, max);
}

const BAD = /abonn|cookies?|newsletter|connectez-vous|s['’]inscrire|réservé aux|accept(er)? (tout|les)|javascript|©|tous droits/i;

export function articleText(html: string): string {
  // a) JSON-LD articleBody (présent sur beaucoup de sites)
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (n: any): string | null => {
        if (!n || typeof n !== "object") return null;
        if (typeof n.articleBody === "string" && n.articleBody.length > 200) return n.articleBody;
        for (const v of Array.isArray(n) ? n : Object.values(n)) { const r = walk(v); if (r) return r; }
        return null;
      };
      const b = walk(JSON.parse(m[1]));
      if (b) return stripHtml(b);
    } catch { /* JSON-LD invalide : on passe */ }
  }
  // b) paragraphes de <article> (sinon de toute la page)
  const scope = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? html;
  const clean = scope.replace(/<(script|style|nav|header|footer|aside|figure|form)\b[\s\S]*?<\/\1>/gi, " ");
  const out: string[] = [];
  for (const p of clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = stripHtml(p[1]);
    if (t.length >= 60 && !BAD.test(t)) out.push(t);
    if (out.join(" ").length > SNIPPET_MAX + 200) break;
  }
  return out.join(" ");
}

export function absUrl(u: string | null, base: string): string | null {
  if (!u) return null;
  try { const x = new URL(u, base); return /^https?:$/.test(x.protocol) ? x.toString() : null; } catch { return null; }
}

export interface Enriched { url: string; image: string | null; text: string | null }

export function extract(html: string, pageUrl: string, max = SNIPPET_MAX): Omit<Enriched, "url"> {
  const image = absUrl(meta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]), pageUrl);
  const desc = meta(html, ["og:description", "description", "twitter:description"]);
  let body = articleText(html);
  // Si le corps est introuvable (mur payant, JavaScript), on garde au moins la description de la page.
  if (body.length < 120) body = desc ?? "";
  const text = body ? cutText(body, max) : null;
  return { image, text: text && text.length >= 40 ? text : null };
}

async function readLimited(r: Response, limit = 700_000): Promise<string> {
  const ct = r.headers.get("content-type") ?? "";
  const reader = r.body?.getReader(); if (!reader) return decodeBytes(new Uint8Array(await r.arrayBuffer()), ct);
  const parts: Uint8Array[] = []; let n = 0;
  while (n < limit) { const { done, value } = await reader.read(); if (done) break; parts.push(value); n += value.length; }
  reader.cancel().catch(() => {});
  const all = new Uint8Array(n); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  return decodeBytes(all, ct);
}

export async function enrich(googleOrDirectLink: string): Promise<Enriched | null> {
  const url = await resolveLink(googleOrDirectLink);
  if (!url) return null;
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "fr-FR,fr;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  const finalUrl = isPublicHttp(r.url) ? r.url : url;
  if (!r.ok || !/html/i.test(r.headers.get("content-type") ?? "")) return { url: finalUrl, image: null, text: null };
  return { url: finalUrl, ...extract(await readLimited(r), finalUrl) };
}
