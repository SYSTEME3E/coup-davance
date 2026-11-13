// Installation de l'app (PWA) : enregistre le service worker et pilote le bouton « Installer l'app ».
(function(){
  if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
  var box=document.getElementById("install");if(!box)return;
  var btn=document.getElementById("installBtn"),help=document.getElementById("installHelp"),dp=null;
  var standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  if(standalone)return;
  var ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  box.hidden=false;
  addEventListener("beforeinstallprompt",function(e){e.preventDefault();dp=e;box.hidden=false});
  addEventListener("appinstalled",function(){box.hidden=true;dp=null});
  btn.addEventListener("click",function(){
    if(dp){dp.prompt();dp.userChoice.finally(function(){dp=null});return}
    help.hidden=!help.hidden;
    help.innerHTML=ios
      ?"Sur iPhone : touche <b>Partager</b> (le carré avec une flèche) puis <b>Sur l’écran d’accueil</b>."
      :"Ouvre le menu <b>⋮</b> du navigateur puis touche <b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>).";
  });
})();
