// Vérification des transferts. Règle d'or : on n’affiche « Officiel » que si la SOURCE est officielle (club, ligue, fédération)
// ET que le titre annonce une confirmation. Une annonce de la presse seule reste « non vérifiée ».
import type { TransferStatus } from "./types.js";
import { norm } from "./text.js";
export type SourceKind = "official" | "trusted" | "blocked" | "unknown";
const OFFICIAL_WORDS = /\b(officiel|officielle|officialise|officialisent|officialisee|annonce officiellement|communique|confirme officiellement|c est fait|here we go)\b/;
const RUMOR_WORDS = /\b(rumeur|rumeurs|piste|pistes|serait|seraient|pourrait|pourraient|aurait|selon|interesse|interessee|cible|vise|en discussions?|discute|negocie|negociations?|proche de|a l etude|sur les tablettes|tente|tenterait|envisage|veut|voudrait|aurait|probable|possible|espere|dans le viseur|courtise)\b/;
const TRANSFER_WORDS = /\b(transferts?|mercato|recrue|recrute|signe|signature|pret|clause|rejoint|quitte|offre|prolonge|prolongation|contrat|arrive|accord)\b/;
export const isTransfer = (title: string) => TRANSFER_WORDS.test(norm(title));
export interface Verdict { status: TransferStatus | null; note: string | null }
export function verifyTransfer(title: string, snippet: string | null, kind: SourceKind): Verdict {
  const t = norm(title), full = norm(title + " " + (snippet ?? ""));
  if (!isTransfer(title)) return { status: null, note: null };
  const says = OFFICIAL_WORDS.test(t), rumor = RUMOR_WORDS.test(full) || title.includes("?");
  if (says && kind === "official" && !rumor) return { status: "official", note: "Annoncé par une source officielle (club, ligue ou fédération)." };
  if (says && kind !== "official") return { status: "unverified", note: "Présenté comme officiel par un média, sans source officielle confirmée : non vérifié." };
  if (rumor) return { status: "rumor", note: "Rumeur ou information non confirmée." };
  return { status: "unverified", note: "Information de transfert non confirmée officiellement." };
}
