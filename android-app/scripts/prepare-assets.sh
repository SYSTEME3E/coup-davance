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

# Mise à jour intégrée : module Android qui télécharge le nouvel APK et ouvre l'installation
JAVA="android/app/src/main/java/com/coupdavance/app"
MANIFEST="android/app/src/main/AndroidManifest.xml"
mkdir -p "$JAVA"
cat > "$JAVA/MainActivity.java" <<'JAVA_EOF'
package com.coupdavance.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MajPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
JAVA_EOF
cat > "$JAVA/MajPlugin.java" <<'JAVA_EOF'
package com.coupdavance.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "Maj")
public class MajPlugin extends Plugin {
    // Adresse fixe : la page web ne peut pas faire installer un autre fichier
    private static final String APK = "https://coup-davance.vercel.app/PronostBet.apk";

    @PluginMethod
    public void installer(final PluginCall call) {
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())));
            call.reject("Autorisation requise", "AUTORISATION");
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    File fichier = new File(getContext().getCacheDir(), "PronostBet-maj.apk");
                    HttpURLConnection c = (HttpURLConnection) new URL(APK).openConnection();
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(30000);
                    c.setUseCaches(false);
                    c.setRequestProperty("Accept-Encoding", "identity");
                    if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
                    try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(fichier)) {
                        byte[] tampon = new byte[65536];
                        int n;
                        long total = c.getContentLengthLong(), recu = 0;
                        int dernier = -1;
                        while ((n = in.read(tampon)) != -1) {
                            out.write(tampon, 0, n);
                            recu += n;
                            int pct = total > 0 ? (int) (recu * 100 / total) : -1;
                            if (pct != dernier) {
                                dernier = pct;
                                JSObject etat = new JSObject();
                                etat.put("pct", pct);
                                notifyListeners("progres", etat);
                            }
                        }
                    }
                    PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(fichier.getPath(), 0);
                    if (info == null || !getContext().getPackageName().equals(info.packageName)) throw new Exception("APK invalide");
                    Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", fichier);
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setDataAndType(uri, "application/vnd.android.package-archive");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(i);
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Mise à jour impossible : " + e.getMessage());
                }
            }
        }).start();
    }
}
JAVA_EOF
grep -q REQUEST_INSTALL_PACKAGES "$MANIFEST" || sed -i 's#</manifest>#    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n</manifest>#' "$MANIFEST"

echo "Icônes et écran de démarrage générés."
