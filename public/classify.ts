// Classement par règles (mots-clés français), volontairement simple et vérifiable. L'admin peut corriger à la main.
import type { Category } from "./types.js";
import { norm } from "./text.js";
const R = (...w: string[]) => new RegExp("\\b(" + w.join("|") + ")\\b");
const RULES: [Category, RegExp, number][] = [
  ["blessures", R("blesse", "blessee", "blessure", "blessures", "forfait", "indisponible", "infirmerie", "entorse", "fracture", "ligaments?", "rupture", "lesion", "opere", "operation", "absent pour", "touche a"), 3],
  ["mercato", R("transferts?", "mercato", "recrue", "recrute", "recruter", "signe", "signature", "pret", "clause", "offre", "officialise", "rejoint", "quitte", "piste", "accord", "contrat", "prolonge", "prolongation"), 3],
  ["matchs", R("score", "victoire", "defaite", "match nul", "nul", "en direct", "compo", "composition", "resume", "journee", "affiche", "buts?", "battu", "bat", "s impose", "face a", "vs", "demi finale", "quart de finale", "finale", "coup d envoi", "arbitre", "var"), 2],
  ["analyses", R("analyse", "tactique", "decryptage", "pourquoi", "le point", "bilan", "chronique", "enseignements", "portrait", "tribune", "dossier", "enquete", "statistiques", "data", "reportage", "interview", "entretien"), 3],
  ["international", R("ligue des champions", "ligue europa", "europa league", "conference league", "coupe du monde", "euro", "ligue des nations", "premier league", "liga", "serie a", "bundesliga", "mls", "can", "bresil", "angleterre", "espagne", "italie", "allemagne", "selection", "equipe de france", "bleus", "fifa", "uefa", "conmebol", "caf"), 2],
  ["clubs", R("club", "president", "entraineur", "coach", "staff", "stade", "direction", "actionnaire", "psg", "om", "ol", "marseille", "lyon", "monaco", "lille", "lens", "rennes", "nice", "nantes", "strasbourg", "reims", "toulouse", "brest", "montpellier", "auxerre", "angers", "le havre", "saint etienne", "real madrid", "barca", "barcelone", "manchester", "liverpool", "arsenal", "chelsea", "bayern", "juventus", "milan", "inter"), 1],
  ["joueurs", R("joueur", "joueurs", "attaquant", "gardien", "milieu", "defenseur", "capitaine", "ballon d or", "buteur", "pepite", "international", "star", "vedette"), 1],
];
export const CATEGORIES: Category[] = ["mercato", "clubs", "joueurs", "matchs", "blessures", "international", "analyses"];
export function classify(title: string, snippet: string | null, hint: Category | null): Category {
  const t = norm(title), full = norm(title + " " + (snippet ?? ""));
  const score = new Map<Category, number>(); if (hint) score.set(hint, 0.5);
  for (const [cat, re, w] of RULES) {
    // le titre pèse plus que le résumé
    const s = (re.test(t) ? w : 0) + (re.test(full) ? 0.5 : 0);
    if (s) score.set(cat, (score.get(cat) ?? 0) + s);
  }
  let best: Category = hint ?? "international", bs = -1;
  for (const [c, s] of score) if (s > bs) { best = c; bs = s; }   // égalité : première catégorie rencontrée (ordre de priorité des règles)
  return best;
}
