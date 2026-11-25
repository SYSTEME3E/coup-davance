// Mise à jour obligatoire de l'application Android.
(function(){
  var ua=navigator.userAgent;
  if(!/CoupDavanceApp/.test(ua))return;
  var m=ua.match(/CoupDavanceApp\/\d+\.\d+\.(\d+)/),installe=m?+m[1]:0;
  var URL_APK=location.origin+"/PronostBet.apk";
  fetch("version.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(j&&+j.build>installe&&navigator.onLine!==false)afficher();
  }).catch(function(){});
  function afficher(){
    var d=document.createElement("div");
    d.setAttribute("style","position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center;color:#fff;font:17px/1.5 Arial,sans-serif;background:radial-gradient(circle at 50% 35%,#0b2a6b 0,#030c2e 70%)");
    d.innerHTML='<img src="icons/icon-512.png" alt="" style="width:130px;height:130px;border-radius:30px">'
      +'<p style="margin:32px 0">Une nouvelle version de PronostBet est disponible.<br>Mets l’application à jour pour continuer.</p>'
      +'<button style="width:100%;max-width:340px;min-height:54px;border:0;border-radius:14px;background:#1D6FD8;color:#fff;font:700 18px Arial,sans-serif">Mettre à jour</button>'
      +'<div style="display:none;width:100%;max-width:340px;margin-top:20px"><div style="height:12px;border-radius:6px;background:#ffffff26;overflow:hidden"><div class="pbj" style="height:100%;width:0;background:#4cc3ff;transition:width .2s"></div></div><div class="pbt" style="margin-top:8px;font-weight:700"></div></div>'
      +'<p style="margin:16px 0 0;font-size:15px;word-break:break-word;user-select:text"></p>';
    (document.body||document.documentElement).appendChild(d);
    document.documentElement.style.overflow="hidden";
    var b=d.querySelector("button"),info=d.querySelectorAll("p")[1];
    // anciennes applications sans le module de mise à jour : installation par le navigateur
    function manuel(){info.textContent="Ouvre Chrome, va à cette adresse puis installe le fichier : "+URL_APK;
      b.textContent="Copier l’adresse";b.disabled=false;
      b.onclick=function(){navigator.clipboard.writeText(URL_APK).then(function(){b.textContent="Adresse copiée"}).catch(function(){})}}
    var plugin=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Maj;
    if(!plugin){manuel();return}
    var zone=d.querySelector(".pbj").parentNode.parentNode,jauge=d.querySelector(".pbj"),texte=d.querySelector(".pbt");
    // la barre n'apparaît que si le module envoie sa progression
    if(plugin.addListener)plugin.addListener("progres",function(e){
      if(!e||e.pct<0)return;
      zone.style.display="block";jauge.style.width=e.pct+"%";texte.textContent=e.pct+" %";
    });
    b.onclick=function(){
      zone.style.display="none";jauge.style.width="0";
      b.disabled=true;b.textContent="Téléchargement…";info.textContent="";
      plugin.installer().then(function(){
        b.disabled=false;b.textContent="Mettre à jour";info.textContent="Touche « Installer » dans la fenêtre Android.";
      }).catch(function(e){
        b.disabled=false;b.textContent="Réessayer";
        info.textContent=e&&e.code==="AUTORISATION"
          ?"Autorise PronostBet à installer des applications, reviens ici puis touche Réessayer."
          :"La mise à jour a échoué. Vérifie ta connexion, ou installe depuis Chrome : "+URL_APK;
      });
    };
  }
})();
