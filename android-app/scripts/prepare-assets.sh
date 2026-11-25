#!/usr/bin/env bash
# Remplace les icônes et l'écran de démarrage par défaut de Capacitor par ceux de Coup d'Avance.
# À lancer depuis android-app/ après « npx cap add android ». Nécessite ImageMagick (convert).
set -euo pipefail
RES="android/app/src/main/res"
ICON="../public/icons/icon-512.png"
MASK="../public/icons/maskable-512.png"
BLUE="#1D6FD8"

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

# Écran de démarrage : fond bleu + icône au centre, à la taille de chaque image existante
for f in $(find "$RES" -name "splash.png"); do
  size=$(identify -format "%wx%h" "$f")
  w=${size%x*}; h=${size#*x}
  m=$(( (w<h ? w : h) * 30 / 100 ))
  convert -size ${size} xc:"$BLUE" \( "$ICON" -resize ${m}x${m} \) -gravity center -composite "$f"
done
echo "Icônes et écran de démarrage générés."
