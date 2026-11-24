// Détection du championnat d'un article, par mots-clés (titre + début du texte). Simple et vérifiable.
// Un article sur « Real Madrid – PSV » est classé « liga » ; un match entre deux championnats prend celui qui revient le plus (sinon le premier cité).
import { norm } from "./text.js";
export type League = "ligue-1" | "liga" | "premier-league" | "serie-a" | "bundesliga";
export const LEAGUES: [League, string][] = [["ligue-1", "Ligue 1"], ["liga", "Liga"], ["premier-league", "Premier League"], ["serie-a", "Serie A"], ["bundesliga", "Bundesliga"]];
const R = (...w: string[]) => new RegExp("\\b(" + w.join("|") + ")\\b", "g");
const RULES: [League, RegExp][] = [
  ["ligue-1", R("ligue 1", "psg", "paris saint germain", "paris fc", "marseille", "om", "lyon", "olympique lyonnais", "ol", "monaco", "lille", "losc", "lens", "rc lens", "rennes", "nice", "ogc nice", "nantes", "strasbourg", "reims", "toulouse", "brest", "montpellier", "auxerre", "angers", "le havre", "lorient", "metz")],
  ["liga", R("liga", "la liga", "real madrid", "barca", "barcelone", "fc barcelone", "atletico", "atletico madrid", "seville", "fc seville", "valence", "villarreal", "real sociedad", "athletic bilbao", "betis", "real betis", "girona", "celta vigo", "osasuna", "getafe", "mallorque")],
  ["premier-league", R("premier league", "manchester city", "manchester united", "man city", "man united", "liverpool", "arsenal", "chelsea", "tottenham", "newcastle", "aston villa", "west ham", "everton", "brighton", "leicester")],
  ["serie-a", R("serie a", "juventus", "juve", "inter milan", "ac milan", "milan ac", "naples", "napoli", "as rome", "lazio", "atalanta", "fiorentina", "bologne", "torino")],
  ["bundesliga", R("bundesliga", "bayern", "bayern munich", "dortmund", "borussia dortmund", "leverkusen", "leipzig", "rb leipzig", "stuttgart", "francfort", "eintracht", "wolfsburg", "fribourg")],
];
export function detectLeague(title: string, snippet: string | null): League | null {
  const t = norm(title), full = norm(title + " " + (snippet ?? "").slice(0, 300));
  let best: League | null = null, bs = 0, bpos = Infinity;
  for (const [lg, re] of RULES) {
    // le titre compte double
    const inT = [...t.matchAll(re)].length, inFull = [...full.matchAll(re)];
    const s = inT * 2 + inFull.length, pos = inFull.length ? inFull[0].index! : Infinity;
    if (s > bs || (s === bs && s > 0 && pos < bpos)) { best = lg; bs = s; bpos = pos; }
  }
  return best;
}
