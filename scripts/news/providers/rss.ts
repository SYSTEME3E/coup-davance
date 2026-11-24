// Fournisseur RSS générique. Google News (test) et tout futur flux RSS sous licence passent par ici.
import { XMLParser } from "fast-xml-parser";
import type { Feed, NewsProvider, RawArticle } from "../types.js";
import { stripHtml, clip, decodeBytes, cleanAuthor } from "../text.js";
import { SNIPPET_MAX, absUrl } from "../enrich.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#t", processEntities: true });
const txt = (v: any): string => v == null ? "" : typeof v === "object" ? String(v["#t"] ?? "") : String(v);

// Image fournie par le flux lui-même : media:content, media:thumbnail, enclosure, ou première <img> du contenu.
function feedImage(it: any, link: string): string | null {
  const pick = (v: any): string | null => {
    for (const x of Array.isArray(v) ? v : v ? [v] : []) {
      const u = x?.["@_url"]; const t = String(x?.["@_type"] ?? x?.["@_medium"] ?? "image");
      if (u && /image|jpe?g|png|webp/i.test(t + u)) return u;
    }
    return null;
  };
  const u = pick(it["media:content"]) ?? pick(it["media:thumbnail"]) ?? pick(it.enclosure)
    ?? String(txt(it["content:encoded"]) + " " + txt(it.description)).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
  return absUrl(u ? u.replace(/&amp;/g, "&") : null, link);
}

export function parseRss(xml: string, google: boolean, fallbackSource: string | null = null): RawArticle[] {
  const items = parser.parse(xml)?.rss?.channel?.item;
  const list: any[] = Array.isArray(items) ? items : items ? [items] : [];
  const out: RawArticle[] = [];
  for (const it of list) {
    let title = stripHtml(txt(it.title)); const link = txt(it.link).trim();
    const d = new Date(txt(it.pubDate));
    if (!title || !/^https?:\/\//.test(link) || isNaN(+d)) continue;      // pas de date/lien valides = on ignore, on n'invente rien
    if (+d > Date.now() + 3600e3) continue;                                // date dans le futur : suspect
    const sourceName = (it.source ? stripHtml(txt(it.source)) || null : null) ?? (google ? null : fallbackSource);
    const sourceUrl = it.source?.["@_url"] ?? null;
    // Google News ajoute « - Nom de la source » à la fin du titre
    if (google && sourceName && title.endsWith(" - " + sourceName)) title = title.slice(0, -(sourceName.length + 3)).trim();
    // Google News : la description ne contient que le titre + la source (pas de vrai résumé) → pas de résumé affiché.
    // Flux direct : on prend le contenu le plus long fourni par l'éditeur (content:encoded sinon description)
    let snippet: string | null = stripHtml(google ? txt(it.description) : (txt(it["content:encoded"]) || txt(it.description)));
    if (google || !snippet || snippet.toLowerCase().startsWith(title.toLowerCase().slice(0, 40))) snippet = google ? null : (snippet && snippet !== title ? snippet : null);
    out.push({ title, link, snippet: snippet ? clip(snippet, SNIPPET_MAX) : null, sourceName, sourceUrl, publishedAt: d.toISOString(), imageUrl: google ? null : feedImage(it, link), author: google ? null : cleanAuthor(txt(it["dc:creator"]) || txt(it.author?.name ?? it.author)) });
  }
  return out;
}

export const rssProvider = (id: string, google: boolean): NewsProvider => ({
  id,
  async fetchItems(feed: Feed) {
    let last: unknown;
    for (let n = 0; n < 3; n++) {
      try {
        const r = await fetch(feed.url, { headers: { "User-Agent": "CoupDAvanceNewsBot/1.0 (+contact: voir mentions légales)", Accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const items = parseRss(decodeBytes(new Uint8Array(await r.arrayBuffer()), r.headers.get("content-type") ?? ""), google, feed.label);
        if (!feed.keyword_filter) return items;
        const re = new RegExp(feed.keyword_filter, "i");   // flux généraliste : on ne garde que ce qui parle de football
        return items.filter(a => re.test(a.title) || re.test(a.snippet ?? ""));
      } catch (e) { last = e; await new Promise(r => setTimeout(r, 1500 * (n + 1))); }
    }
    throw last;
  }
});
