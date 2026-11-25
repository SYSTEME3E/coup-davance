// Écran de démarrage de l'application PronostBet (une fois par ouverture).
(function(){
  var app=/CoupDavanceApp/.test(navigator.userAgent)||matchMedia("(display-mode: standalone)").matches;
  if(!app)return;
  try{if(sessionStorage.getItem("pbSplash"))return}catch(e){}
  var f=document.createElement("link");f.rel="stylesheet";f.href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&display=swap";
  document.head.appendChild(f);
  var c=document.createElement("style");
  c.textContent="#pbs{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 50%,#0b2a6b 0,#030c2e 65%);transition:opacity .4s}"
   +"#pbs img{width:150px;height:150px;border-radius:34px;box-shadow:0 0 50px #1d6fd8aa;animation:pbf 2s ease-in-out infinite}"
   +"#pbs .n{margin-top:34px;color:#fff;font:italic 900 36px Montserrat,Arial,sans-serif}#pbs .n b{color:#4cc3ff;font:inherit}"
   +"#pbs .p{position:absolute;bottom:14%;display:flex;gap:16px}#pbs .p i{width:12px;height:12px;border-radius:50%;background:#fff;opacity:.2;animation:pba 1.6s infinite}"
   +"@keyframes pbf{50%{transform:translateY(-14px)}}@keyframes pba{0%,100%{opacity:.2}10%,70%{opacity:1}}";
  document.head.appendChild(c);
  var s=document.createElement("div");s.id="pbs";
  var dots="";for(var i=0;i<8;i++)dots+='<i style="animation-delay:'+(i*0.15)+'s"></i>';
  s.innerHTML='<img src="icons/icon-512.png" alt=""><div class="n">PRONOST<b>BET</b></div><div class="p">'+dots+'</div>';
  document.body.appendChild(s);
  var t0=Date.now(),done=false;
  function end(){
    if(done)return;done=true;
    try{sessionStorage.setItem("pbSplash","1")}catch(e){}
    s.style.opacity="0";setTimeout(function(){s.remove()},400);
  }
  addEventListener("load",function(){setTimeout(end,Math.max(0,2500-(Date.now()-t0)))});
  setTimeout(end,6000); // sécurité : jamais bloqué si le réseau est lent
})();
