// Types communs du module Actualités.
export type Category = "mercato" | "clubs" | "joueurs" | "matchs" | "blessures" | "international" | "analyses";
export type TransferStatus = "official" | "rumor" | "unverified";
export type ModerationStatus = "approved" | "pending" | "rejected";
// test_only : flux autorisé uniquement pour le développement (ex. Google News). commercial : licence en règle.
export type License = "test_only" | "commercial";

export interface Feed {
  id: string; provider: string; url: string; label: string;
  license: License; category_hint: Category | null; enabled: boolean;
}
// Ce qu'un fournisseur renvoie : uniquement des champs présents dans la source, rien d'inventé.
export interface RawArticle {
  title: string; link: string; snippet: string | null;
  sourceName: string | null; sourceUrl: string | null; publishedAt: string; // ISO
}
export interface NewsProvider { id: string; fetchItems(feed: Feed): Promise<RawArticle[]>; }
