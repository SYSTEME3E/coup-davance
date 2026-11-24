// Tests de la logique avec un petit XML de TEST (jamais inséré en base). Lancer : npm run news:test
import assert from "node:assert/strict";
import { parseRss } from "./providers/rss.js";
import { build, type SourceRules } from "./pipeline.js";
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
console.log("Tous les tests passent.");
