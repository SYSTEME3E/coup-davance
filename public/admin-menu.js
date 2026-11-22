// Menu à 3 barres de l'administration (différent du menu des utilisateurs).
// Nécessite la variable globale `sb` (client Supabase) et un <header class="top"> dans la page.
(function(){
  const hdr=document.querySelector("header.top");
  if(!hdr||typeof sb==="undefined")return;
  const P=location.pathname.split("/").pop()||"admin.html";
  const L=[
    ["admin.html","Accueil",["admin.html"]],
    ["admin-carrousel.html","Carrousel et codes promo",["admin-carrousel.html"]],
    ["admin-prix.html","Prix des abonnements",["admin-prix.html"]],
    ["admin-utilisateurs.html","Utilisateurs",["admin-utilisateurs.html","admin-user.html"]],
    ["admin-matchs.html","Matchs",["admin-matchs.html"]],
    ["admin-retraits.html","Retraits",["admin-retraits.html"]]
  ];
  const btn=document.createElement("button");
  btn.type="button";btn.className="burger";btn.setAttribute("aria-label","Ouvrir le menu administration");btn.setAttribute("aria-expanded","false");
  btn.innerHTML="<i></i><i></i><i></i>";hdr.appendChild(btn);
  const ov=document.createElement("div");ov.className="ov";
  const dr=document.createElement("aside");dr.className="drw";dr.setAttribute("role","dialog");dr.setAttribute("aria-modal","true");dr.setAttribute("aria-label","Menu administration");
  dr.innerHTML='<div class="dtop"><b>Administration</b><button type="button" class="dx" aria-label="Fermer le menu">✕</button></div>'
    +'<nav class="mn">'+L.map(l=>'<a href="'+l[0]+'"'+(l[2].indexOf(P)>=0?' aria-current="page" style="font-weight:800;text-decoration:underline"':'')+'>'+l[1]+'</a>').join("")
    +'<a href="dashboard.html">← Voir le site (côté utilisateur)</a></nav>'
    +'<button type="button" class="out2" id="aOut">Quitter</button>';
  document.body.appendChild(ov);document.body.appendChild(dr);
  const open=()=>{dr.classList.add("on");ov.classList.add("on");btn.setAttribute("aria-expanded","true");document.body.style.overflow="hidden";dr.querySelector(".dx").focus()};
  const close=()=>{dr.classList.remove("on");ov.classList.remove("on");btn.setAttribute("aria-expanded","false");document.body.style.overflow="";btn.focus()};
  btn.onclick=open;ov.onclick=close;dr.querySelector(".dx").onclick=close;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&dr.classList.contains("on"))close()});
  document.getElementById("aOut").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};
})();
