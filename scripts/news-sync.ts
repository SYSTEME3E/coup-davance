// Synchronisation des actualités : GitHub Actions (toutes les 30 min) ou `npm run news`.
// Variables : SUPABASE_URL, SUPABASE_SERVICE_KEY.
import { createClient } from "@supabase/supabase-js";
import { PROVIDERS } from "./news/providers/index.js";
import { build, type Known, type SourceRules } from "./news/pipeline.js";
import { tokens, norm } from "./news/text.js";
import type { Feed, RawArticle } from "./news/types.js";

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
  const recent = must(await sb.from("news_articles").select("id,title,title_key,source_name,also_reported_by").gte("published_at", since).order("published_at", { ascending: false }).limit(2000), "articles récents") as any[];
  const known: Known[] = recent.map(r => ({ id: r.id, title_key: r.title_key, toks: tokens(r.title), source_name: r.source_name, also: r.also_reported_by ?? [] }));

  const { rows, merged, dups } = build(items, rules, known);
  for (let i = 0; i < rows.length; i += 200) {
    const r = await sb.from("news_articles").upsert(rows.slice(i, i + 200), { onConflict: "url_hash", ignoreDuplicates: true });
    if (r.error) throw new Error("insertion : " + r.error.message);
  }
  for (const m of merged) await sb.from("news_articles").update({ also_reported_by: m.also }).eq("id", m.id);
  // Rétention : 60 jours (sauf articles mis à la une)
  await sb.from("news_articles").delete().lt("published_at", new Date(Date.now() - 60 * 864e5).toISOString()).eq("featured", false);
  console.log(`Terminé : ${items.length} lus, ${rows.length} nouveaux, ${dups} doublons ignorés, ${rows.filter(r => r.moderation_status === "pending").length} à modérer.`);
}
main().catch(e => { console.error(e); process.exit(1); });
