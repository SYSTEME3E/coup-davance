// Fournisseur RSS générique. Google News (test) et tout futur flux RSS sous licence passent par ici.
import { XMLParser } from "fast-xml-parser";
import type { Feed, NewsProvider, RawArticle } from "../types.js";
import { stripHtml, clip } from "../text.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#t", processEntities: true });
const txt = (v: any): string => v == null ? "" : typeof v === "object" ? String(v["#t"] ?? "") : String(v);

export function parseRss(xml: string, google: boolean): RawArticle[] {
  const items = parser.parse(xml)?.rss?.channel?.item;
  const list: any[] = Array.isArray(items) ? items : items ? [items] : [];
  const out: RawArticle[] = [];
  for (const it of list) {
    let title = stripHtml(txt(it.title)); const link = txt(it.link).trim();
    const d = new Date(txt(it.pubDate));
    if (!title || !/^https?:\/\//.test(link) || isNaN(+d)) continue;      // pas de date/lien valides = on ignore, on n'invente rien
    if (+d > Date.now() + 3600e3) continue;                                // date dans le futur : suspect
    const sourceName = it.source ? stripHtml(txt(it.source)) || null : null;
    const sourceUrl = it.source?.["@_url"] ?? null;
    // Google News ajoute « - Nom de la source » à la fin du titre
    if (google && sourceName && title.endsWith(" - " + sourceName)) title = title.slice(0, -(sourceName.length + 3)).trim();
    // Google News : la description ne contient que le titre + la source (pas de vrai résumé) → pas de résumé affiché.
    let snippet: string | null = stripHtml(txt(it.description));
    if (google || !snippet || snippet.toLowerCase().startsWith(title.toLowerCase().slice(0, 40))) snippet = google ? null : (snippet && snippet !== title ? snippet : null);
    out.push({ title, link, snippet: snippet ? clip(snippet, 280) : null, sourceName, sourceUrl, publishedAt: d.toISOString() });
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
        return parseRss(await r.text(), google);
      } catch (e) { last = e; await new Promise(r => setTimeout(r, 1500 * (n + 1))); }
    }
    throw last;
  }
});
