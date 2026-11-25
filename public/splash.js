// Écran de démarrage de l'application PronostBet (une fois par ouverture).
(function(){
  if(/CoupDavanceApp/.test(navigator.userAgent)){var m=document.createElement("script");m.src="maj.js";document.head.appendChild(m)}
  var app=/CoupDavanceApp/.test(navigator.userAgent)||matchMedia("(display-mode: standalone)").matches;
  if(!app)return;
  try{if(sessionStorage.getItem("pbSplash"))return}catch(e){}
  var DUREE=10000,t0=Date.now();
  // l'heure de début est gardée : un changement de page ne relance pas les 10 s
  try{t0=+sessionStorage.getItem("pbDebut")||t0;sessionStorage.setItem("pbDebut",t0)}catch(e){}
  var ecoule=Date.now()-t0;
  var v=navigator.userAgent.match(/CoupDavanceApp\/([\d.]+)/);
  var f=document.createElement("link");f.rel="stylesheet";f.href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&display=swap";
  document.head.appendChild(f);
  var c=document.createElement("style");
  c.textContent="#pbs{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 50%,#0b2a6b 0,#030c2e 65%);transition:opacity .4s}"
   +"#pbs img{width:150px;height:150px;border-radius:34px;box-shadow:0 0 50px #1d6fd8aa;animation:pbf 2s ease-in-out infinite}"
   +"#pbs .n{margin-top:34px;color:#fff;font:italic 900 36px Montserrat,Arial,sans-serif}#pbs .n b{color:#4cc3ff;font:inherit}"
   +"#pbs .p{position:absolute;bottom:14%;display:flex;gap:16px}#pbs .p i{width:12px;height:12px;border-radius:50%;background:#fff;opacity:.2;animation:pba .3s forwards}#pbs .v{position:absolute;right:18px;bottom:18px;color:#c5cbe0;font:14px Arial,sans-serif}"
   +"@keyframes pbf{50%{transform:translateY(-14px)}}@keyframes pba{to{opacity:1}}";
  document.head.appendChild(c);
  var s=document.createElement("div");s.id="pbs";
  var dots="";for(var i=0;i<8;i++)dots+='<i style="animation-delay:'+((i*DUREE/8-ecoule)/1000)+'s"></i>';
  s.innerHTML='<img src="icons/icon-512.png" alt=""><div class="n">PRONOST<b>BET</b></div><div class="p">'+dots+'</div>'+(v?'<div class="v">PronostBet v.'+v[1]+'</div>':'');
  document.body.appendChild(s);
  setTimeout(function(){
    try{sessionStorage.setItem("pbSplash","1")}catch(e){}
    s.style.opacity="0";setTimeout(function(){s.remove()},400);
  },Math.max(0,DUREE-ecoule));
})();
