#!/usr/bin/env bash
# Remplace les icônes et l'écran de démarrage par défaut de Capacitor par ceux de PronostBet.
# À lancer depuis android-app/ après « npx cap add android ». Nécessite ImageMagick (convert).
set -euo pipefail
RES="android/app/src/main/res"
ICON="../public/icons/icon-512.png"
MASK="../public/icons/maskable-512.png"
BLUE="#1D6FD8"
DARK="#030C2E"

# Couleur de fond des icônes adaptatives (celle du fond de l'icône du site)
cat > "$RES/values/ic_launcher_background.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$BLUE</color>
</resources>
XML


# Icônes : (dossier, taille de l'icône classique, taille du calque adaptatif)
for spec in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  IFS=: read d legacy fg <<<"$spec"
  D="$RES/mipmap-$d"
  convert "$ICON" -resize ${legacy}x${legacy} "$D/ic_launcher.png"
  convert "$ICON" -resize ${legacy}x${legacy} \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "circle $((legacy/2)),$((legacy/2)) $((legacy/2)),0" \) -alpha off -compose CopyOpacity -composite "$D/ic_launcher_round.png"
  inner=$((fg*72/100))
  convert -size ${fg}x${fg} xc:none \( "$MASK" -resize ${inner}x${inner} \) -gravity center -composite "$D/ic_launcher_foreground.png"
done

# Écran de démarrage : fond bleu nuit + icône au centre, à la taille de chaque image existante
for f in $(find "$RES" -name "splash.png"); do
  size=$(identify -format "%wx%h" "$f")
  w=${size%x*}; h=${size#*x}
  m=$(( (w<h ? w : h) * 30 / 100 ))
  convert -size ${size} xc:"$DARK" \( "$ICON" -resize ${m}x${m} \) -gravity center -composite "$f"
done
# Fond bleu nuit partout au lancement (évite l'écran noir avant l'affichage de la page)
STYLES="$RES/values/styles.xml"
# thème de lancement (Android 12+) et fond de fenêtre de l'activité
sed -i "/<style name=\"AppTheme.NoActionBarLaunch\"/a\\        <item name=\"windowSplashScreenBackground\">$DARK</item>" "$STYLES"
sed -i "/<style name=\"AppTheme.NoActionBar\" /a\\        <item name=\"android:windowBackground\">@color/pb_dark</item>" "$STYLES"
cat > "$RES/values/pb_colors.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="pb_dark">$DARK</color>
</resources>
XML
grep -q windowSplashScreenBackground "$STYLES" && grep -q pb_dark "$STYLES" || { echo "::error::styles.xml non modifié"; exit 1; }

# Version de l'app transmise au site (même numéro que versionName : 1.0.<numéro de build>)
CONF="android/app/src/main/assets/capacitor.config.json"
sed -i "s#CoupDavanceApp[^\"]*#CoupDavanceApp/1.0.${GITHUB_RUN_NUMBER:-0}#" "$CONF"
grep -q "CoupDavanceApp/1.0." "$CONF" || { echo "::error::version non ajoutée"; exit 1; }

echo "Icônes et écran de démarrage générés."
