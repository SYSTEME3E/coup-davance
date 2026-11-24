// Pipeline pur (sans réseau ni base) : normalisation → classement → vérification → modération → doublons. Testable.
import type { Category, Feed, RawArticle } from "./types.js";
import { classify } from "./classify.js";
import { verifyTransfer, type SourceKind } from "./verify.js";
import { moderate, claimsOfficial } from "./moderate.js";
import { sha1, norm, tokens, jaccard, domain } from "./text.js";

export interface Known { id: string; title_key: string; toks: Set<string>; source_name: string | null; also: string[]; has_image?: boolean }
export interface Row {
  url_hash: string; title_key: string; title: string; snippet: string | null; url: string;
  source_name: string; source_domain: string | null; published_at: string; category: Category;
  transfer_status: string | null; verification_note: string | null; moderation_status: string; flags: string[]; mod_reason: string | null;
  feed_id: string; license: string; also_reported_by: string[];
  image_url: string | null; enriched_at: string | null; enrich_status: string | null;
}
export interface SourceRules { byDomain: Map<string, SourceKind>; byName: Map<string, SourceKind> }
export const kindOf = (r: SourceRules, d: string | null, n: string | null): SourceKind =>
  (d && r.byDomain.get(d)) || (n && r.byName.get(norm(n))) || "unknown";
export const SIM = 0.8;

export function build(items: { feed: Feed; a: RawArticle }[], rules: SourceRules, known: Known[]) {
  const rows: Row[] = [], merged: { id: string; also: string[] }[] = [], upgrades: { id: string; url: string; image_url: string; snippet: string | null }[] = [];
  const pool: (Known & { row?: Row })[] = [...known];
  let dups = 0;
  // Le « canonique » d'un groupe de doublons est la source la plus fiable (officielle > de confiance > autre), puis la plus récente.
  const rank = (a: RawArticle) => ({ official: 0, trusted: 1, unknown: 2, blocked: 3 } as const)[kindOf(rules, domain(a.sourceUrl), a.sourceName)];
  items.sort((x, y) => rank(x.a) - rank(y.a) || (x.a.imageUrl ? 0 : 1) - (y.a.imageUrl ? 0 : 1) || +new Date(y.a.publishedAt) - +new Date(x.a.publishedAt));
  for (const { feed, a } of items) {
    const urlHash = sha1(a.link), key = sha1(norm(a.title)), toks = tokens(a.title);
    const src = a.sourceName ?? domain(a.sourceUrl) ?? "Source inconnue";
    const hit = pool.find(k => k.title_key === key || jaccard(k.toks, toks) >= SIM);
    if (hit) {
      dups++;
      // Le même article arrive avec une image depuis le flux direct de l'éditeur : on complète la version existante.
      if (a.imageUrl && hit.row && !hit.row.image_url) { hit.row.image_url = a.imageUrl; hit.row.url = a.link; if (a.snippet && a.snippet.length > (hit.row.snippet?.length ?? 0)) hit.row.snippet = a.snippet; }
      else if (a.imageUrl && hit.id && hit.has_image === false && !upgrades.some(u => u.id === hit.id)) { upgrades.push({ id: hit.id, url: a.link, image_url: a.imageUrl, snippet: a.snippet }); hit.has_image = true; }
      if (hit.source_name !== src && !hit.also.includes(src)) {
        hit.also.push(src);
        if (hit.row) hit.row.also_reported_by = hit.also; else merged.push({ id: hit.id, also: hit.also });
      }
      continue;
    }
    const d = domain(a.sourceUrl), kind = kindOf(rules, d, a.sourceName);
    const cat = classify(a.title, a.snippet, feed.category_hint);
    const v = verifyTransfer(a.title, a.snippet, kind);
    // Un transfert est toujours rangé en Mercato, même si une autre règle l'emportait
    const category: Category = v.status ? "mercato" : cat;
    const m = moderate(a.title, a.snippet, kind, v.status, claimsOfficial(a.title));
    const row: Row = { url_hash: urlHash, title_key: key, title: a.title, snippet: a.snippet, url: a.link, source_name: src, source_domain: d,
      published_at: a.publishedAt, category, transfer_status: v.status, verification_note: v.note, moderation_status: m.status, flags: m.flags,
      mod_reason: m.reason, feed_id: feed.id, license: feed.license, also_reported_by: [],
      image_url: a.imageUrl ?? null, enriched_at: null, enrich_status: a.imageUrl ? "feed" : null };
    rows.push(row);
    pool.push({ id: "", title_key: key, toks, source_name: src, also: row.also_reported_by, row });
  }
  return { rows, merged, dups, upgrades };
}
