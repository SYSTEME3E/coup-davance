// Tests de la logique avec un petit XML de TEST (jamais inséré en base). Lancer : npm run news:test
import assert from "node:assert/strict";
import { parseRss } from "./providers/rss.js";
import { build, type SourceRules } from "./pipeline.js";
import { extract, decodeGoogleId, isPublicHttp, cutText } from "./enrich.js";
const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Le club annonce officiellement la signature de X - Club Officiel</title><link>https://example.com/a</link><pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate><description>&lt;a href="https://example.com/a"&gt;Le club annonce officiellement la signature de X&lt;/a&gt;&amp;nbsp;&lt;font&gt;Club Officiel&lt;/font&gt;</description><source url="https://www.club-officiel.test">Club Officiel</source></item>
<item><title>Le club annonce officiellement la signature de X - Journal A</title><link>https://example.com/b</link><pubDate>Mon, 23 Nov 2026 11:00:00 GMT</pubDate><source url="https://www.journal-a.test">Journal A</source></item>
<item><title>Mercato : Y serait proche de Z, selon la presse - Journal B</title><link>https://example.com/c</link><pubDate>Mon, 23 Nov 2026 09:00:00 GMT</pubDate><source url="https://journal-b.test">Journal B</source></item>
<item><title>OFFICIEL : W signe à Z - Journal B</title><link>https://example.com/d</link><pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate><source url="https://journal-b.test">Journal B</source></item>
<item><title>Sans date - Journal B</title><link>https://example.com/e</link><source url="https://journal-b.test">Journal B</source></item>
<item><title>Attaquant blessé, forfait pour dimanche - Journal B</title><link>https://example.com/f</link><pubDate>Mon, 23 Nov 2026 07:00:00 GMT</pubDate><source url="https://journal-b.test">Journal B</source></item>
</channel></rss>`;
const feed: any = { id: "f1", provider: "google_news_rss", url: "", label: "t", license: "test_only", category_hint: null, enabled: true };
const items = parseRss(xml, true);
assert.equal(items.length, 5, "l'item sans date doit être ignoré");
assert.equal(items[0].title, "Le club annonce officiellement la signature de X");
assert.equal(items[0].snippet, null, "pas de résumé inventé pour Google News");
const rules: SourceRules = { byDomain: new Map([["club-officiel.test", "official"]]), byName: new Map() };
const { rows, dups } = build(items.map(a => ({ feed, a })), rules, []);
const by = (u: string) => rows.find(r => r.url === u)!;
assert.equal(dups, 1, "doublon inter-sources fusionné");
assert.equal(by("https://example.com/a").transfer_status, "official");
assert.deepEqual(by("https://example.com/a").also_reported_by, ["Journal A"]);
assert.equal(by("https://example.com/c").transfer_status, "rumor");
assert.equal(by("https://example.com/d").transfer_status, "unverified", "« officiel » d'un média sans source officielle ≠ officiel");
assert.equal(by("https://example.com/d").moderation_status, "pending");
assert.equal(by("https://example.com/f").category, "blessures");

// --- Enrichissement (page d'éditeur fictive) ---
const long = "Amin Chiakha a inscrit dix-neuf buts avec Rosenborg cette saison et attire désormais l'attention de plusieurs clubs européens. ".repeat(12);
const page = `<html><head><meta property="og:image" content="/img/a.jpg"><meta name="description" content="Résumé court de la page."></head><body><nav><p>Connectez-vous pour continuer à lire cet article sur le site</p></nav><article><p>${long}</p><p>Deuxième paragraphe assez long pour être retenu dans l'extrait de l'article publié.</p></article></body></html>`;
const ex = extract(page, "https://site.test/x/y", 600);
assert.equal(ex.image, "https://site.test/img/a.jpg", "image relative → absolue");
assert.ok(ex.text && ex.text.length <= 600 && ex.text.length > 300, "extrait entre 300 et 600 caractères");
assert.ok(!/Connectez-vous/.test(ex.text!), "texte de navigation ignoré");
assert.equal(extract("<meta name=\"description\" content=\"Seulement une description assez longue pour servir de texte de secours.\">", "https://a.test").text, "Seulement une description assez longue pour servir de texte de secours.");
const ld = `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", articleBody: "Corps de l'article. ".repeat(60) })}</script>`;
assert.ok(extract(ld, "https://a.test", 500).text!.length <= 500, "JSON-LD tronqué à la limite");
assert.equal(decodeGoogleId(Buffer.from("\x08\x13\x22\x1chttps://exemple.fr/article-1\xd2\x01\x00").toString("base64url")), "https://exemple.fr/article-1");
assert.equal(isPublicHttp("http://192.168.1.5/x"), false); assert.equal(isPublicHttp("file:///etc/passwd"), false); assert.equal(isPublicHttp("https://lequipe.fr/a"), true);
assert.ok(cutText("Phrase une. ".repeat(100), 500).endsWith("."));
// --- Flux direct d'éditeur : image (media:content / enclosure / <img>) + texte du flux ---
const direct = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
<item><title>PSG : Doué incertain pour Lens</title><link>https://media.test/a</link><pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate><description>Résumé court.</description><media:content url="https://img.media.test/a.jpg" medium="image"/></item>
<item><title>Lyon : Fonseca évite la polémique</title><link>https://media.test/b</link><pubDate>Mon, 23 Nov 2026 09:00:00 GMT</pubDate><enclosure url="https://img.media.test/b.jpg" type="image/jpeg" length="1"/><content:encoded><![CDATA[<p>Texte plus long de l'éditeur.</p>]]></content:encoded></item>
<item><title>OM : Genesio explique la défaite</title><link>https://media.test/c</link><pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate><description>&lt;img src="/x/c.png"&gt; Le coach marseillais s'explique.</description></item>
</channel></rss>`;
const di = parseRss(direct, false, "Média Test");
assert.equal(di[0].imageUrl, "https://img.media.test/a.jpg");
assert.equal(di[1].imageUrl, "https://img.media.test/b.jpg");
assert.equal(di[1].snippet, "Texte plus long de l'éditeur.", "content:encoded prioritaire");
assert.equal(di[2].imageUrl, "https://media.test/x/c.png", "image relative dans la description");
assert.equal(di[0].sourceName, "Média Test", "source = nom du flux");
// Un article déjà connu (Google, sans image) est complété par la version du flux direct
const known = [{ id: "k1", title_key: "x", toks: new Set(["psg", "doue", "incertain", "lens"]), source_name: "Google", also: [], has_image: false }];
const up = build(di.map(a => ({ feed: { ...feed, provider: "rss", license: "commercial" }, a })), rules, known as any);
assert.equal(up.upgrades.length, 1, "article connu complété avec image");
assert.equal(up.upgrades[0].image_url, "https://img.media.test/a.jpg");
console.log("Tous les tests passent.");
