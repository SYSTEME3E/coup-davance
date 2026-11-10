// Moteur de prédiction : modèle de Poisson pondéré par la forme récente.
export type Game = { scored: number; conceded: number }; // du plus récent au plus ancien
export type Input = { home: Game[]; away: Game[]; h2h?: Game[]; leagueAvg?: number };

const wavg = (g: Game[], k: keyof Game) => {
  let s = 0, w = 0;
  g.slice(0, 10).forEach((x, i) => { const p = Math.pow(0.9, i); s += x[k] * p; w += p; });
  return w ? s / w : 1.3;
};
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const pois = (k: number, l: number) => (Math.exp(-l) * Math.pow(l, k)) / fact(k);

export function predict({ home, away, h2h = [], leagueAvg = 1.35 }: Input) {
  // Force attaque/défense relative à la moyenne du championnat
  const atkH = wavg(home, "scored") / leagueAvg, defH = wavg(home, "conceded") / leagueAvg;
  const atkA = wavg(away, "scored") / leagueAvg, defA = wavg(away, "conceded") / leagueAvg;
  let lamH = atkH * defA * leagueAvg * 1.1; // avantage du terrain
  let lamA = atkA * defH * leagueAvg * 0.95;
  if (h2h.length) { // le H2H pèse 20 %
    lamH = lamH * 0.8 + wavg(h2h, "scored") * 0.2;
    lamA = lamA * 0.8 + wavg(h2h, "conceded") * 0.2;
  }
  let pH = 0, pD = 0, pA = 0, btts = 0, best = { s: "0-0", p: 0 };
  const over = { o05: 0, o15: 0, o25: 0, o35: 0 };
  for (let h = 0; h <= 8; h++) for (let a = 0; a <= 8; a++) {
    const p = pois(h, lamH) * pois(a, lamA);
    if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
    if (h > 0 && a > 0) btts += p;
    if (h + a > 0) over.o05 += p; if (h + a > 1) over.o15 += p;
    if (h + a > 2) over.o25 += p; if (h + a > 3) over.o35 += p;
    if (p > best.p) best = { s: `${h}-${a}`, p };
  }
  const t = pH + pD + pA, r = (x: number) => Math.round((x / t) * 100);
  return {
    expectedGoals: { home: +lamH.toFixed(2), away: +lamA.toFixed(2) },
    result: { home: r(pH), draw: r(pD), away: r(pA) },
    btts: r(btts), over: { "0.5": r(over.o05), "1.5": r(over.o15), "2.5": r(over.o25), "3.5": r(over.o35) },
    homeScores: Math.round((1 - pois(0, lamH)) * 100), awayScores: Math.round((1 - pois(0, lamA)) * 100),
    likelyScore: best.s,
  };
}
