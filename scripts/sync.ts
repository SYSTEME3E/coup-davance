// Calcule les pronostics du jour et les enregistre dans Supabase.
// Offre gratuite football-data.org : 10 appels/minute, donc une pause entre chaque appel.
import { createClient } from "@supabase/supabase-js";
import { predict, type Game } from "../lib/predict.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(path: string) {
  await sleep(6500);
  const r = await fetch("https://api.football-data.org/v4" + path, { headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! } });
  if (!r.ok) throw new Error(`football-data.org ${r.status} sur ${path}`);
  return r.json();
}
const games = (ms: any[], id: number): Game[] => ms
  .filter((m) => m.score?.fullTime?.home != null)
  .sort((a, b) => +new Date(b.utcDate) - +new Date(a.utcDate))
  .map((m) => m.homeTeam.id === id
    ? { scored: m.score.fullTime.home, conceded: m.score.fullTime.away }
    : { scored: m.score.fullTime.away, conceded: m.score.fullTime.home });

const day = new Date().toISOString().slice(0, 10);
const { matches } = await api(`/matches?date=${day}`);
for (const m of matches.filter((x: any) => ["SCHEDULED", "TIMED"].includes(x.status))) {
  try {
    const h = await api(`/teams/${m.homeTeam.id}/matches?status=FINISHED&limit=10`);
    const a = await api(`/teams/${m.awayTeam.id}/matches?status=FINISHED&limit=10`);
    const x = await api(`/matches/${m.id}/head2head?limit=5`);
    const data = predict({ home: games(h.matches, m.homeTeam.id), away: games(a.matches, m.awayTeam.id), h2h: games(x.matches, m.homeTeam.id) });
    const { error } = await sb.from("predictions").upsert({ fixture_id: m.id, kickoff: m.utcDate, league: m.competition.name, home: m.homeTeam.name, away: m.awayTeam.name, data });
    if (error) throw error;
    console.log("OK", m.homeTeam.name, "-", m.awayTeam.name);
  } catch (e) { console.error("Échec :", m.homeTeam.name, "-", m.awayTeam.name, e); }
}
