// Protection des images : pas de glisser-déposer ni de menu « enregistrer l'image » (dissuasif, pas absolu).
(function(){const b=e=>{if(e.target&&e.target.tagName==="IMG")e.preventDefault()};document.addEventListener("contextmenu",b);document.addEventListener("dragstart",b)})();
// Menu à 3 barres (en haut à droite) : navigation + déconnexion.
// Les informations du compte (nom, prénom, e-mail, mot de passe) sont dans la page « Réglages » (reglages.html).
// Nécessite la variable globale `sb` (client Supabase) et un <header class="top"> dans la page.
(function(){
  const hdr=document.querySelector("header.top");
  if(!hdr||typeof sb==="undefined")return;
  const g=id=>document.getElementById(id);

  const btn=document.createElement("button");
  btn.type="button";btn.className="burger";btn.setAttribute("aria-label","Ouvrir le menu");btn.setAttribute("aria-expanded","false");
  btn.innerHTML="<i></i><i></i><i></i>";
  hdr.appendChild(btn);

  const ov=document.createElement("div");ov.className="ov";
  const dr=document.createElement("aside");dr.className="drw";dr.setAttribute("role","dialog");dr.setAttribute("aria-modal","true");dr.setAttribute("aria-label","Menu");
  dr.innerHTML=''
    +'<div class="dtop"><b>Menu</b><button type="button" class="dx" aria-label="Fermer le menu">✕</button></div>'
    +'<nav class="mn"><a href="dashboard.html">Matchs du jour</a><a href="sport.html">Football en direct</a><a href="historique.html">Historique</a><a href="abonnement.html">Abonnement</a><a href="balance.html">Parrainage et gains</a><a href="reglages.html">Réglages</a><a href="admin.html" id="mAdmin" hidden>Espace administrateur</a><a href="admin-retraits.html" id="mAdminW" hidden>Retraits à suivre (admin)</a></nav>'
    +'<button type="button" class="out2" id="mLite" style="margin-bottom:10px">'+(window.LITE?'Mode Lite activé · sans images (touche pour désactiver)':'Activer le mode Lite (sans images, plus léger)')+'</button>'
    +'<button type="button" class="out2" id="mOut">Quitter</button>';
  document.body.appendChild(ov);document.body.appendChild(dr);

  const open=()=>{dr.classList.add("on");ov.classList.add("on");btn.setAttribute("aria-expanded","true");document.body.style.overflow="hidden";dr.querySelector(".dx").focus()};
  const close=()=>{dr.classList.remove("on");ov.classList.remove("on");btn.setAttribute("aria-expanded","false");document.body.style.overflow="";btn.focus()};
  btn.onclick=open;ov.onclick=close;dr.querySelector(".dx").onclick=close;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&dr.classList.contains("on"))close()});

  g("mLite").onclick=()=>{try{localStorage.setItem("pb_lite",window.LITE?"0":"1")}catch(e){}location.reload()};
  g("mOut").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};

  // Chargement du compte : blocage et liens administrateur
  (async()=>{
    const{data:{session}}=await sb.auth.getSession();
    if(!session)return;
    const{data}=await sb.from("profiles").select("is_admin,blocked").eq("id",session.user.id).maybeSingle();
    if(data){
      if(data.blocked){await sb.auth.signOut();location.href="auth.html#login";return}
      if(data.is_admin){g("mAdmin").hidden=false;g("mAdminW").hidden=false}
    }
  })();
})();
