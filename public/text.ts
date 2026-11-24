import { createHash } from "node:crypto";
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘", hellip: "…", ndash: "–", mdash: "—" };
export const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
export const stripHtml = (s: string) => decode(decode(s).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
export const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set("le la les un une des de du d l et en au aux a ce cet cette ces pour par sur dans avec sans que qui se sa son ses est sont il elle ils the of to".split(" "));
export const tokens = (s: string) => new Set(norm(s).split(" ").filter(w => w.length > 2 && !STOP.has(w)));
export const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i);
};
export const clip = (s: string, n: number) => s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
// Domaine nettoyé (sans www.) d'une URL, ou null.
export const domain = (u: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, "").toLowerCase() : null } catch { return null } };
