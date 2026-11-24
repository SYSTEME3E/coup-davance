// Trouve le flux RSS d'un site à partir de son adresse. Réservée aux administrateurs (is_admin()).
// Appel depuis le navigateur : sb.functions.invoke("discover-feed", { body: { url: "https://exemple.fr" } })
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const UA = "Mozilla/5.0 (compatible; CoupDAvanceNewsBot/1.0)";
const COMMON = ["/feed", "/feed/", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/rss/football", "/rss/sport", "/flux-rss.xml", "/rss/une.xml"];

// On ne visite que des adresses http(s) publiques (pas de réseau interne).
function isPublicHttp(u: string): boolean {
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) return false;
    const h = x.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h === "[::1]") return false;
    return !/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  } catch { return false; }
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#t" });
const txt = (v: any): string => v == null ? "" : typeof v === "object" ? String(v["#t"] ?? "") : String(v);
const strip = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#0*39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
const hasImg = (it: any) => !!(it["media:content"] || it["media:thumbnail"] || it.enclosure || /<img/i.test(txt(it["content:encoded"]) + txt(it.description)));

async function get(u: string): Promise<{ url: string; text: string } | null> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(7000) });
    if (!r.ok || !isPublicHttp(r.url)) return null;
    return { url: r.url, text: (await r.text()).slice(0, 1_500_000) };
  } catch { return null; }
}

function readFeed(xml: string) {
  if (!/<(rss|feed|rdf:RDF)\b/i.test(xml.slice(0, 3000))) return null;
  try {
    const d = parser.parse(xml);
    const ch = d?.rss?.channel ?? d?.["rdf:RDF"]?.channel;
    let items = d?.rss?.channel?.item ?? d?.feed?.entry ?? d?.["rdf:RDF"]?.item;
    items = Array.isArray(items) ? items : items ? [items] : [];
    if (!items.length) return null;
    return {
      title: strip(txt(ch?.title ?? d?.feed?.title)),
      count: items.length,
      with_image: items.filter(hasImg).length,
      sample: items.slice(0, 3).map((it: any) => ({ title: strip(txt(it.title)), image: hasImg(it) })),
    };
  } catch { return null; }
}

// Adresses de flux annoncées par la page : <link rel="alternate" type="application/rss+xml" href="...">
function linkedFeeds(html: string, base: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?alternate/i.test(tag) || !/type\s*=\s*["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    try { out.push(new URL((href?.[1] ?? href?.[2] ?? "").replace(/&amp;/g, "&"), base).toString()); } catch { /* adresse invalide */ }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  // Administrateurs uniquement
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

  let input = "";
  try { input = String((await req.json())?.url ?? "").trim(); } catch { /* corps vide */ }
  if (!input) return json({ error: "Adresse manquante" }, 400);
  if (!/^https?:\/\//i.test(input)) input = "https://" + input;
  if (!isPublicHttp(input)) return json({ error: "Adresse invalide" }, 400);

  const first = await get(input);
  if (!first) return json({ error: "Site inaccessible (il bloque peut-être les robots).", feeds: [] });

  // 1) l'adresse donnée est déjà un flux
  const direct = readFeed(first.text);
  if (direct) return json({ feeds: [{ url: first.url, ...direct }] });

  // 2) flux annoncés par la page, puis 3) adresses courantes
  const origin = new URL(first.url).origin;
  const candidates = [...new Set([...linkedFeeds(first.text, first.url), ...COMMON.map((p) => origin + p)])].filter(isPublicHttp).slice(0, 14);
  const checked = await Promise.all(candidates.map(async (u) => {
    const r = await get(u); const f = r ? readFeed(r.text) : null;
    return f && r ? { url: r.url, ...f } : null;
  }));
  const seen = new Set<string>();
  const feeds = checked.filter((f): f is NonNullable<typeof f> => !!f && !seen.has(f.url) && !!seen.add(f.url))
    .sort((a, b) => b.with_image - a.with_image || b.count - a.count).slice(0, 4);
  return json({ feeds });
});
