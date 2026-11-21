// Barre de navigation en bas des pages d'administration.
(function(){
  const P=location.pathname.split("/").pop()||"";
  const I={
    home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    ball:'<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/><path d="M12 3v4M16 10l4-1M14.5 15l2.5 4M9.5 15L7 19M8 10L4 9"/>',
    cash:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
    app:'<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>'
  };
  const T=[["admin.html","Accueil","home",["admin.html","admin-user.html"]],["admin-matchs.html","Matchs","ball",["admin-matchs.html"]],["admin-retraits.html","Retraits","cash",["admin-retraits.html"]],["dashboard.html","App","app",[]]];
  const st=document.createElement("style");
  st.textContent='.anav{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;background:#1B1450;border-top:1px solid #322A7E;padding:6px 6px calc(6px + env(safe-area-inset-bottom,0px))}'
   +'.anav a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;border-radius:12px;color:#B9B4E3;text-decoration:none;font:700 12px/1.1 system-ui,sans-serif;min-height:52px;justify-content:center}'
   +'.anav a svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
   +'.anav a[aria-current=page]{color:#fff;background:rgba(111,91,255,.28)}'
   +'.anav a:focus-visible{outline:3px solid #9A8CFF;outline-offset:-3px}'
   +'body{padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}';
  document.head.appendChild(st);
  const n=document.createElement("nav");n.className="anav";n.setAttribute("aria-label","Navigation administration");
  n.innerHTML=T.map(t=>'<a href="'+t[0]+'"'+(t[3].indexOf(P)>=0?' aria-current="page"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+I[t[2]]+'</svg>'+t[1]+'</a>').join("");
  document.body.appendChild(n);
})();
