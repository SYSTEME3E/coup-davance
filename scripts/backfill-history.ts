// Remonte l'historique des matchs terminés (petites ligues comprises) depuis SportScore vers match_archive.
// Usage : npm run backfill -- --days 45        (ajouter --dry pour tester sans rien écrire)
// Variables : SUPABASE_URL, SUPABASE_SERVICE_KEY. Aucune clé SportScore n'est nécessaire (point de terminaison public).
// Limite connue : l'API renvoie au plus 200 matchs par appel (offset ignoré) : les jours très chargés peuvent être incomplets.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis."); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const arg = (n: string, d: string) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const DAYS = Math.min(120, Math.max(1, +arg("days", "45"))), DRY = process.argv.includes("--dry");

// Même normalisation que la fonction SQL archive_live_finished() : les clés doivent rester identiques.
const FROM = "éèêëàâäîïôöùûüçñáíóúãõšćčžđłøåæ", TO = "eeeeaaaiioouuucnaiouaoscczdloaae";
const norm = (s: string) => [...s].map(c => { const i = FROM.indexOf(c.toLowerCase()); return i >= 0 ? TO[i] : c; }).join("")
  .replace(/[^a-zA-Z0-9 ]/g, " ").toLowerCase().replace(/\s+/g, " ").trim();
// Identifiant stable (négatif, comme ceux du flux live) dérivé de la clé du match
const fid = (k: string) => { let h = 0xcbf29ce484222325n; for (const c of k) h = ((h ^ BigInt(c.charCodeAt(0))) * 0x100000001b3n) & 0xfffffffffffffn; return -Number(h % 9007199254740000n) - 1; };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchDay(date: string) {
  const q = new URLSearchParams({ sport: "football", date, status: "finished", limit: "200", src: "coup-davance" });
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch("https://sportscore.com/api/v1/fixtures/?" + q, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; coup-davance-backfill)" }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d: any = await r.json();
      const arr = Array.isArray(d) ? d : d.matches ?? d.data ?? d.results ?? d.fixtures ?? [];
      return arr as any[];
    } catch (e) { if (a === 2) throw e; await sleep(1500 * (a + 1)); }
  }
  return [];
}
const nm = (t: any) => typeof t === "string" ? t : t?.name ?? "";

async function main() {
  // Ligues déjà couvertes par d'autres sources : on ne les touche pas (évite les doublons).
  const skip = new Set<string>();
  ((await sb.from("league_alias").select("raw_name")).data ?? []).forEach((r: any) => skip.add(r.raw_name));
  const lg = await sb.rpc("covered_leagues");   // fournie par la migration ci-dessous si elle existe ; sinon on se rabat sur league_alias seul
  if (!lg.error) (lg.data ?? []).forEach((r: any) => skip.add(r.league));

  let seen = 0, kept = 0, written = 0, fails = 0;
  console.log("Début : " + DAYS + " jours" + (DRY ? " (essai)" : ""));
  for (let i = 1; i <= DAYS; i++) {
    const date = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    let list: any[];
    try { list = await fetchDay(date); } catch (e) { console.warn(date, "échec :", String(e)); if (++fails >= 5) { console.error("5 échecs de suite : SportScore ne répond pas à ce serveur. Arrêt."); process.exit(1); } continue; }
    fails = 0;
    const rows: any[] = [];
    for (const m of list) {
      seen++;
      const home = nm(m.home_team ?? m.home), away = nm(m.away_team ?? m.away);
      const league = nm(m.competition ?? m.league);
      const hs = Number(m.home_score ?? m.score?.home), as = Number(m.away_score ?? m.score?.away);
      const t = m.time ?? m.start_time ?? m.kickoff;
      if (!home || !away || !league || !t || !Number.isFinite(hs) || !Number.isFinite(as) || skip.has(league)) continue;
      const ko = new Date(t); if (isNaN(+ko)) continue;
      const hk = norm(home), ak = norm(away), mk = ko.toISOString().slice(0, 10) + "|" + hk + "|" + ak;
      rows.push({ fixture_id: fid(mk), kickoff: ko.toISOString(), league, home, away, home_goals: hs, away_goals: as, status: "FT", source: "live_feed", home_key: hk, away_key: ak, match_key: mk });
    }
    kept += rows.length;
    if (!DRY && rows.length) {
      const r = await sb.from("match_archive").upsert(rows, { onConflict: "match_key", ignoreDuplicates: true }).select("id");
      if (r.error) { console.warn(date, "écriture :", r.error.message); continue; }
      written += r.data?.length ?? 0;
    }
    console.log(date, "lus", list.length, "gardés", rows.length, list.length >= 200 ? "(plafond 200 atteint)" : "");
    await sleep(700);
  }
  console.log(`Terminé${DRY ? " (essai, rien écrit)" : ""} : ${seen} lus, ${kept} retenus, ${written} nouveaux.`);
}
main().catch(e => { console.error(e); process.exit(1); });
