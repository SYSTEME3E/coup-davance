// Barre de navigation du bas + favoris (étoile jaune sur les matchs). Favoris gardés sur le téléphone, par appareil.
(function(){
  if(/\/(admin|verif)/.test(location.pathname))return;
  var KEY="pb_favoris_v1";
  function lire(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
  function ecrire(f){try{localStorage.setItem(KEY,JSON.stringify(f))}catch(e){}}
  window.PBFAV={lire:lire};

  var css=document.createElement("style");
  css.textContent="body{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}"
  +".bnav{position:fixed;left:0;right:0;bottom:0;z-index:45;display:grid;grid-template-columns:repeat(5,1fr);align-items:end;background:#1B1450;border-top:1px solid #322A7E;padding:6px 2px calc(6px + env(safe-area-inset-bottom,0px))}"
  +".bnav a{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;color:#A9A4D6;text-decoration:none;font:700 11px 'Hanken Grotesk',system-ui,sans-serif;white-space:nowrap}"
  +".bnav svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}"
  +".bnav a.on{color:#fff}.bnav a.on svg{stroke:#FFC933}"
  +".bnav .home i{display:flex;align-items:center;justify-content:center;width:62px;height:62px;margin-top:-30px;border-radius:50%;background:#1D6FD8;border:4px solid #130F33;box-shadow:0 4px 14px rgba(29,111,216,.5)}"
  +".bnav .home svg,.bnav .home.on svg{width:32px;height:32px;stroke:#fff}"
  +".favb{flex:none;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:0;background:none;color:#F5B800;font:400 26px/1 system-ui,sans-serif;cursor:pointer}"
  +".pc-top .favb{margin-left:auto;margin-right:-4px}"
  +".sx-m.hasfav{grid-template-columns:50px minmax(0,1fr) 30px 34px;gap:8px}"
  +".nw-toast{bottom:calc(100px + env(safe-area-inset-bottom,0px))!important}";
  document.head.appendChild(css);

  var IC={
    news:'<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v5h5M2 15h8M2 11h4M2 19h8"/>',
    fav:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    live:'<circle cx="12" cy="12" r="10"/><path d="m12 8 3.8 2.8-1.4 4.4H9.6l-1.4-4.4z"/><path d="M12 8V2.2M15.8 10.8l5.5-1.8M14.4 15.2l3.4 4.7M9.6 15.2l-3.4 4.7M8.2 10.8 2.7 9"/>'
  };
  var page=location.pathname.split("/").pop().replace(/\.html$/,"");
  var nav=document.createElement("nav");nav.className="bnav";nav.setAttribute("aria-label","Navigation principale");
  nav.innerHTML=[["actualites","Actualités","news"],["favoris","Favoris","fav"],["dashboard","Accueil","home"],["historique","Historique","hist"],["sport","Direct","live"]].map(function(x){
    var svg='<svg viewBox="0 0 24 24" aria-hidden="true">'+IC[x[2]]+'</svg>',on=page===x[0];
    return '<a href="'+x[0]+'.html" class="'+(x[2]==="home"?"home ":"")+(on?"on":"")+'"'+(on?' aria-current="page"':'')+'>'+(x[2]==="home"?"<i>"+svg+"</i>":svg)+'<span>'+x[1]+'</span></a>'}).join("");
  document.body.appendChild(nav);

  // ---- Étoiles ----
  function txt(el){return el?el.textContent.trim():""}
  // identifiant d'un match : « p: » = match avec pronostic, « s: » = match du direct (SportScore)
  function infos(el){
    if(el.classList.contains("pc")){
      var t=el.querySelectorAll(".pc-t b");
      return{k:"p:"+el.dataset.id,id:el.dataset.id,home:txt(t[0]),away:txt(t[1]),comp:txt(el.querySelector(".pc-lg span")),link:"match.html?id="+el.dataset.id};
    }
    var route=el.getAttribute("data-go")||(el.getAttribute("href")||"").split("#")[1]||"";
    if(route.indexOf("match/")!==0)return null;
    var noms=el.querySelectorAll(".tm span"),p=el.previousElementSibling;
    while(p&&!p.matches(".sx-cmp,.oth-c"))p=p.previousElementSibling;
    return{k:"s:"+decodeURIComponent(route.split("/")[1]),id:decodeURIComponent(route.split("/")[1]),home:txt(noms[0]),away:txt(noms[1]),comp:p?txt(p.querySelector("span")):"",link:"sport.html#"+route};
  }
  function peindre(b,actif){b.textContent=actif?"★":"☆";b.setAttribute("aria-pressed",actif?"true":"false");b.setAttribute("aria-label",actif?"Retirer des favoris":"Ajouter aux favoris")}
  function decorer(){
    var f=lire();
    document.querySelectorAll(".pc[data-id],.sx-m,.oth-m").forEach(function(el){
      if(el.querySelector(".favb"))return;
      var i=infos(el);if(!i)return;
      var b=document.createElement("button");b.type="button";b.className="favb";b.dataset.fav=i.k;peindre(b,!!f[i.k]);
      if(el.classList.contains("pc")){var top=el.querySelector(".pc-top");if(top)top.insertBefore(b,top.querySelector(".pc-badge"))}
      else{if(el.classList.contains("sx-m"))el.classList.add("hasfav");el.appendChild(b)}
    });
  }
  // capture : le clic sur l'étoile n'ouvre pas la fiche du match
  document.addEventListener("click",function(e){
    var b=e.target.closest&&e.target.closest(".favb");if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    var f=lire(),k=b.dataset.fav;
    if(f[k])delete f[k];
    else{var el=b.closest(".pc[data-id],.sx-m,.oth-m"),i=el&&infos(el);if(!i)return;i.ajout=Date.now();f[k]=i}
    ecrire(f);
    document.querySelectorAll(".favb").forEach(function(x){if(x.dataset.fav===k)peindre(x,!!f[k])});
    document.dispatchEvent(new CustomEvent("pbfav"));
  },true);
  decorer();
  new MutationObserver(decorer).observe(document.body,{childList:true,subtree:true});
})();
