// Pré-modération automatique : les contenus sensibles ou douteux passent en « pending » (invisibles tant qu'un admin n'a pas validé).
import type { ModerationStatus, TransferStatus } from "./types.js";
import type { SourceKind } from "./verify.js";
import { norm } from "./text.js";
const SENSITIVE = /\b(deces|decede|mort|meurt|mourir|suicide|arrete|garde a vue|accuse|accusation|plainte|proces|condamne|dopage|dope|agression|viol|violences|escroquerie|fraude|corruption|drogue|cancer|hospitalise|coma)\b/;
const CLICKBAIT = /\b(choc|incroyable|scandale|bombe|exclusif|exclu|vous n allez pas croire|folle rumeur|ca part en vrille|polemique)\b/;
const PROMO = /\b(paris sportifs?|bonus|code promo|cote boostee|pronostics?|bookmakers?|inscrivez vous|offre de bienvenue|gagnez)\b/;
export interface Mod { status: ModerationStatus; flags: string[]; reason: string | null }
export function moderate(title: string, snippet: string | null, kind: SourceKind, transfer: TransferStatus | null, officialClaim: boolean): Mod {
  const flags: string[] = [], t = norm(title), full = norm(title + " " + (snippet ?? ""));
  if (kind === "blocked") return { status: "rejected", flags: ["source_bloquee"], reason: "Source bloquée" };
  const safe = kind === "official" || kind === "trusted";
  if (SENSITIVE.test(full) && !safe) flags.push("sensible");
  if (CLICKBAIT.test(t) || /[!?]{2,}/.test(title) || (title.length > 15 && title === title.toUpperCase())) flags.push("sensationnel");
  if (PROMO.test(full) && !safe) flags.push("promo");
  if (officialClaim && kind !== "official") flags.push("officiel_non_confirme");
  if (transfer === "rumor" && !safe && CLICKBAIT.test(t)) flags.push("rumeur_sensationnelle");
  return flags.length ? { status: "pending", flags, reason: "Contrôle manuel requis : " + flags.join(", ") } : { status: "approved", flags, reason: null };
}
export const claimsOfficial = (title: string) => /\b(officiel|officielle|officialise|c est fait)\b/.test(norm(title));
