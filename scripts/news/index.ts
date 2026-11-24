// Registre des fournisseurs. Pour ajouter ou remplacer une source :
//  1) ajouter ici un fournisseur (RSS sous licence ou API) qui renvoie des RawArticle ;
//  2) ajouter une ligne dans la table news_feeds (et désactiver l'ancienne avec enabled = false).
import type { NewsProvider } from "../types.js";
import { rssProvider } from "./rss.js";
export const PROVIDERS: Record<string, NewsProvider> = {
  google_news_rss: rssProvider("google_news_rss", true),
  rss: rssProvider("rss", false),
  // api_xxx: { id: "api_xxx", async fetchItems(feed) { ... } }   ← exemple d'emplacement pour un futur fournisseur API
};
