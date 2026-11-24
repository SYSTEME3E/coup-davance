// Synchronisation des actualités : GitHub Actions (toutes les 30 min) ou `npm run news`.
// Variables : SUPABASE_URL, SUPABASE_SERVICE_KEY.
import { createClient } from "@supabase/supabase-js";
import { PROVIDERS } from "./news/providers/index.js";
import { build, type Known, type SourceRules } from "./news/pipeline.js";
import { tokens, norm } from "./news/text.js";
import type { Feed, RawArticle } from "./news/types.js";
import { enrich } from "./news/enrich.js";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis."); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const must = <T>(r: { data: T | null; error: any }, what: string): T => { if (r.error) throw new Error(what + " : " + r.error.message); return r.data as T; };

async function main() {
  const feeds = must(await sb.from("news_feeds").select("*").eq("enabled", true), "news_feeds") as Feed[];
  const rulesRows = must(await sb.from("news_sources").select("domain,name,kind"), "news_sources") as { domain: string | null; name: string | null; kind: any }[];
  const rules: SourceRules = { byDomain: new Map(), byName: new Map() };
  for (const r of rulesRows) { if (r.domain) rules.byDomain.set(r.domain.toLowerCase(), r.kind); if (r.name) rules.byName.set(norm(r.name), r.kind); }

  const items: { feed: Feed; a: RawArticle }[] = [];
  for (const f of feeds) {
    const p = PROVIDERS[f.provider];
    if (!p) { console.warn("Fournisseur inconnu :", f.provider); continue; }
    try {
      const got = await p.fetchItems(f);
      got.forEach(a => items.push({ feed: f, a }));
      await sb.from("news_feeds").update({ last_fetched_at: new Date().toISOString(), last_status: "ok", last_error: null, last_count: got.length }).eq("id", f.id);
      console.log("OK", f.label, got.length);
    } catch (e: any) {
      await sb.from("news_feeds").update({ last_fetched_at: new Date().toISOString(), last_status: "error", last_error: String(e?.message ?? e).slice(0, 300) }).eq("id", f.id);
      console.error("ERREUR", f.label, e?.message ?? e);
    }
  }

  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const recent = must(await sb.from("news_articles").select("id,title,title_key,source_name,also_reported_by,image_url").gte("published_at", since).order("published_at", { ascending: false }).limit(2000), "articles récents") as any[];
  const known: Known[] = recent.map(r => ({ id: r.id, title_key: r.title_key, toks: tokens(r.title), source_name: r.source_name, also: r.also_reported_by ?? [], has_image: !!r.image_url }));

  const { rows, merged, dups, upgrades } = build(items, rules, known);
  for (let i = 0; i < rows.length; i += 200) {
    const r = await sb.from("news_articles").upsert(rows.slice(i, i + 200), { onConflict: "url_hash", ignoreDuplicates: true });
    if (r.error) throw new Error("insertion : " + r.error.message);
  }
  for (const m of merged) await sb.from("news_articles").update({ also_reported_by: m.also }).eq("id", m.id);
  for (const u of upgrades) { const patch: Record<string, unknown> = { url: u.url, image_url: u.image_url, enrich_status: "feed" }; if (u.snippet) patch.snippet = u.snippet; await sb.from("news_articles").update(patch).eq("id", u.id); }

  // Enrichissement : image + extrait depuis la page de l'éditeur (60 articles par passage, les plus récents d'abord)
  const todo = must(await sb.from("news_articles").select("id,url,snippet,image_url").is("enriched_at", null).order("published_at", { ascending: false }).limit(60), "à enrichir") as { id: string; url: string; snippet: string | null; image_url: string | null }[];
  let okN = 0, failN = 0, next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const a = todo[next++];
      try {
        const e = await enrich(a.url);
        const patch: Record<string, unknown> = { enriched_at: new Date().toISOString(), enrich_status: e ? (e.text || e.image ? "ok" : "empty") : "no_link" };
        if (e) { patch.url = e.url; if (e.image && !a.image_url) patch.image_url = e.image; if (e.text && e.text.length > (a.snippet?.length ?? 0)) patch.snippet = e.text; }
        await sb.from("news_articles").update(patch).eq("id", a.id);
        e && (e.text || e.image || a.image_url) ? okN++ : failN++;
      } catch (err: any) {
        failN++;
        await sb.from("news_articles").update({ enriched_at: new Date().toISOString(), enrich_status: "error" }).eq("id", a.id);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  console.log(`Enrichissement : ${okN} réussis, ${failN} sans image/texte.`);
  // Rétention : 60 jours (sauf articles mis à la une)
  await sb.from("news_articles").delete().lt("published_at", new Date(Date.now() - 60 * 864e5).toISOString()).eq("featured", false);
  console.log(`Terminé : ${items.length} lus, ${rows.length} nouveaux, ${upgrades.length} complétés avec image, ${dups} doublons ignorés, ${rows.filter(r => r.moderation_status === "pending").length} à modérer.`);
}
main().catch(e => { console.error(e); process.exit(1); });
