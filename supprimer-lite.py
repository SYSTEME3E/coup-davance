#!/usr/bin/env python3
# À lancer depuis la racine du dépôt : python3 supprimer-lite.py
# Supprime définitivement le « Mode Lite » (les logos des équipes s'affichent toujours).
import os, re, sys
if not os.path.isdir("public"):
    sys.exit("Lance ce script à la racine du dépôt (là où se trouve le dossier public).")

def edit(path, fn):
    p = os.path.join("public", path)
    if not os.path.exists(p): print("absent :", path); return
    with open(p, encoding="utf-8", newline="") as f: s = f.read()
    n = fn(s)
    if n != s:
        with open(p, "w", encoding="utf-8", newline="") as f: f.write(n)
        print("modifié :", path)

IMG = "u&&!window.LITE?"
edit("menu.js", lambda s: re.sub(r'  lite:\'.*?\',\n', '',
    re.sub(r'  g\("mLite"\)\.onclick=.*?\n', '',
    re.sub(r"    \+'<button type=\"button\" class=\"out2\" id=\"mLite\".*?</button>'\n", '', s, flags=re.S))))
edit("config.js", lambda s: re.sub(r'// Mode Lite.*?\n', '', re.sub(r'// Activé par défaut.*?\n', '',
    re.sub(r'window\.LITE=\(function\(\).*?\}\)\(\);\nif\(window\.LITE\)document\.documentElement\.classList\.add\("lite"\);\n', '', s, flags=re.S))))
edit("cards.js", lambda s: s.replace(IMG, "u?").replace("  if(window.LITE)return; // Lite : pas de logos, donc aucune requête pour les chercher\n", ""))
edit("sport.html", lambda s: s.replace(IMG, "u?"))
edit("match.html", lambda s: s.replace(IMG, "u?").replace("(!window.LITE&&v.imgUrl?", "(v.imgUrl?"))
edit("ticker.js", lambda s: s.replace(IMG, "u?").replace("window.LITE?90000:60000", "60000"))
edit("dashboard.html", lambda s: s.replace("window.LITE?90000:60000", "60000"))
edit("style.css", lambda s: re.sub(r'/\* Mode Lite : aucune image.*?\*/\n', '',
    s.replace("html.lite img.lgo,html.lite .sx-m .tm img,html.lite .oth-m img{display:none!important}\n", "")))
edit("i18n.js", lambda s: re.sub(r'"Mode Lite activé[^"]*":"[^"]*",?', '', re.sub(r'"Activer le mode Lite[^"]*":"[^"]*",?', '', s)))
print("Terminé. Vérifie avec : git status")