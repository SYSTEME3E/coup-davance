#!/usr/bin/env bash
# À lancer depuis la racine du dépôt : bash renommer-pronostbet.sh
set -e
[ -d public ] || { echo "Lance ce script à la racine du dépôt (là où se trouve le dossier public)."; exit 1; }

# 1) Nom du site : Pronos-bet -> PronostBet
sed -i 's/Pronos-bet/PronostBet/g' public/*.html public/*.js public/*.webmanifest
sed -i -E 's/"pronos-bet-v[0-9]+"/"pronostbet-v26"/' public/sw.js

# 2) Fichier APK : coup-davance.apk -> PronostBet.apk
if [ -f public/coup-davance.apk ]; then git mv public/coup-davance.apk public/PronostBet.apk 2>/dev/null || mv public/coup-davance.apk public/PronostBet.apk; fi
sed -i 's/coup-davance\.apk/PronostBet.apk/g; s/coup-davance-apk/PronostBet-apk/g' public/menu.js public/dashboard.html vercel.json .github/workflows/android.yml

# 3) Anciens noms dans les textes
sed -i "s/Coup d’Avance/PronostBet/g" README.md
sed -i "s/Coup d'Avance/PronostBet/g" android-app/www/index.html android-app/package.json android-app/scripts/prepare-assets.sh

echo "Terminé. Vérifie avec : git status"
