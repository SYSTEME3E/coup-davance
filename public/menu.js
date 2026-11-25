// Protection des images : pas de glisser-déposer ni de menu « enregistrer l'image » (dissuasif, pas absolu).
(function(){const b=e=>{if(e.target&&e.target.tagName==="IMG")e.preventDefault()};document.addEventListener("contextmenu",b);document.addEventListener("dragstart",b)})();
// Menu à 3 barres (en haut à droite) : navigation + déconnexion.
// Les informations du compte (nom, prénom, e-mail, mot de passe) sont dans la page « Réglages » (reglages.html).
// Nécessite la variable globale `sb` (client Supabase) et un <header class="top"> dans la page.
(function(){
  const hdr=document.querySelector("header.top");
  if(!hdr||typeof sb==="undefined")return;
  const g=id=>document.getElementById(id);
  const IC={
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  live:'<circle cx="12" cy="12" r="10"/><path d="m12 8 3.8 2.8-1.4 4.4H9.6l-1.4-4.4z"/><path d="M12 8V2.2M15.8 10.8l5.5-1.8M14.4 15.2l3.4 4.7M9.6 15.2l-3.4 4.7M8.2 10.8 2.7 9"/>',
  hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  vip:'<path d="m2 4 3 12h14l3-12-6 4-4-6-4 6-6-4z"/><path d="M5 20h14"/>',
  wal:'<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  out:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  set:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  adm:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  lite:'<path d="m2 2 20 20"/><path d="M10.4 5H19a2 2 0 0 1 2 2v8.6M21 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 .6-1.4"/><circle cx="9" cy="9" r="1.5"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L10 17"/>',
  quit:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  img:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  tag:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
  usr:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  mat:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1.2 1.2C7.9 18.7 7 20.2 7 22M14 14.7V17c0 .6.5 1 1.2 1.2.9.5 1.8 2 1.8 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>',
  back:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
  dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  news:'<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v5h5M2 15h8M2 11h4M2 19h8"/>'
  };
  const ic=n=>'<svg class="mi" viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>';

  const btn=document.createElement("button");
  btn.type="button";btn.className="burger";btn.setAttribute("aria-label","Ouvrir le menu");btn.setAttribute("aria-expanded","false");
  btn.innerHTML="<i></i><i></i><i></i>";
  hdr.appendChild(btn);

  const ov=document.createElement("div");ov.className="ov";
  const dr=document.createElement("aside");dr.className="drw";dr.setAttribute("role","dialog");dr.setAttribute("aria-modal","true");dr.setAttribute("aria-label","Menu");
  dr.innerHTML=''
    +'<div class="dtop"><b>Menu</b><button type="button" class="dx" aria-label="Fermer le menu">✕</button></div>'
    +'<nav class="mn">'+'<a href="dashboard.html">'+ic("cal")+'<span>Matchs du jour</span></a>'+'<a href="sport.html">'+ic("live")+'<span>Football en direct</span></a>'+'<a href="actualites.html">'+ic("news")+'<span>Actualités</span></a>'+'<a href="historique.html">'+ic("hist")+'<span>Historique</span></a>'+'<a href="abonnement.html">'+ic("vip")+'<span>VIP</span></a>'+'<a href="balance.html">'+ic("wal")+'<span>Mon solde</span></a>'+'<a href="retrait.html">'+ic("out")+'<span>Retrait</span></a>'+'<a href="reglages.html">'+ic("set")+'<span>Réglages</span></a>'+'<a href="admin.html" id="mAdmin" hidden>'+ic("adm")+'<span>Espace administrateur</span></a></nav>'
    +'<a class="dl-app" id="mApk" href="PronostBet.apk" download hidden>'+ic("dl")+'<span>Télécharger l’application</span></a>'
    +'<button type="button" class="out2" id="mLite" style="margin-bottom:10px">'+ic("lite")+'<span>'+(window.LITE?'Mode Lite activé · sans images (touche pour désactiver)':'Activer le mode Lite (sans images, plus léger)')+'</span></button>'
    +'<button type="button" class="out2" id="mOut">'+ic("quit")+'<span>Quitter</span></button>';
  document.body.appendChild(ov);document.body.appendChild(dr);

  const open=()=>{dr.classList.add("on");ov.classList.add("on");btn.setAttribute("aria-expanded","true");document.body.style.overflow="hidden";dr.querySelector(".dx").focus()};
  const close=()=>{dr.classList.remove("on");ov.classList.remove("on");btn.setAttribute("aria-expanded","false");document.body.style.overflow="";btn.focus()};
  btn.onclick=open;ov.onclick=close;dr.querySelector(".dx").onclick=close;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&dr.classList.contains("on"))close()});

  (function(){var u=navigator.userAgent;if(!/Android/i.test(u)||/CoupDavanceApp/.test(u))return;
    fetch("PronostBet.apk",{method:"HEAD",cache:"no-store"}).then(function(r){if(r.ok&&!/text\/html/.test(r.headers.get("content-type")||""))g("mApk").hidden=false}).catch(function(){})})();
  g("mLite").onclick=()=>{try{localStorage.setItem("pb_lite",window.LITE?"0":"1")}catch(e){}location.reload()};
  g("mOut").onclick=async()=>{await window.PUSH_READY;if(window.PUSH)await PUSH.release(sb);await sb.auth.signOut();location.href="index.html"};

  if(window.PB)PB.sync(sb);
  // Notifications push : config Firebase puis push.js ; PUSH_READY permet aux pages (réglages) d'attendre le chargement
  const lp=src=>new Promise(r=>{const s=document.createElement("script");s.src=src;s.onload=s.onerror=()=>r();document.head.appendChild(s)});
  window.PUSH_READY=lp("firebase-config.js").then(()=>lp("push.js"));
  // Chargement du compte : blocage et liens administrateur
  (async()=>{
    const{data:{session}}=await sb.auth.getSession();
    if(!session)return;
    const{data}=await sb.from("profiles").select("is_admin,blocked").eq("id",session.user.id).maybeSingle();
    if(data){
      if(data.blocked){await window.PUSH_READY;if(window.PUSH)await PUSH.release(sb);await sb.auth.signOut();location.href="auth.html#login";return}
      if(data.is_admin){g("mAdmin").hidden=false}
    }
    await window.PUSH_READY;if(window.PUSH)PUSH.boot(sb); // connexion : rattache cet appareil au compte
  })();
})();
