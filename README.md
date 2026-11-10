# Coup d’Avance
HTML + TypeScript · Vercel (site) · Supabase (comptes + base) · football-data.org (données) · GitHub Actions (calcul quotidien).

## Mise en route
1. Pousse ce dossier sur GitHub, puis importe le dépôt dans Vercel (aucune variable nécessaire pour le site).
2. Supabase → Authentication → URL Configuration : mets l’adresse de ton site Vercel dans « Site URL ».
3. GitHub → Settings → Secrets and variables → Actions : ajoute `FOOTBALL_DATA_TOKEN`, `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` (clé service_role, à ne jamais mettre dans le site).
4. GitHub → Actions → « Pronostics du jour » → Run workflow, pour le premier calcul. Ensuite il tourne chaque jour à 6h UTC.
5. Test local : `cp .env.example .env`, `npm install`, `npm run sync`.

Pages : `/` · `/auth.html#login` · `/auth.html#signup` · `/dashboard.html` · `/legal.html`.
Avant le lancement : remplace les [CHAMPS] de legal.html et fais relire les textes légaux.
⚠️ Aucun pronostic n’est garanti. Site réservé aux majeurs.
