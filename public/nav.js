// Barre de navigation du bas + favoris (étoile jaune sur les matchs).
// Favoris : copie gardée sur le téléphone (rapide, marche hors ligne) + synchronisation avec le compte Supabase (table « favorites »),
// pour retrouver la même liste dans l'app Android et sur le web.
(function(){
  if(/\/(admin|verif)/.test(location.pathname))return;
  var KEY="pb_favoris_v1",QK="pb_favq_v1",UK="pb_fav_uid";
  function rd(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function lire(){return rd(KEY,{})}
  function ecrire(f){wr(KEY,f)}

  // ---- Synchronisation avec le compte ----
  var DB=null;try{DB=typeof sb!=="undefined"?sb:null}catch(e){}
  var busy=false,again=false,last=0;
  // file d'attente : changements pas encore envoyés au compte (hors ligne, erreur réseau…)
  function enfiler(op,k,data){var q=rd(QK,{});q[k]={op:op,data:data,ajout:data&&data.ajout||Date.now(),t:Date.now()+Math.random()};wr(QK,q)}
  function sync(){
    if(!DB)return;
    if(busy){again=true;return}
    busy=true;last=Date.now();
    var fin=function(){busy=false;if(again){again=false;setTimeout(sync,300)}};
    DB.auth.getSession().then(function(r){
      var s=r&&r.data&&r.data.session,u=s&&s.user&&s.user.id;
      if(!u)return fin();
      // les favoris gardés sur le téléphone appartenaient à un autre compte : on ne les mélange pas
      var prev=null,SK="pb_fav_sync_"+u,premier=true;
      try{prev=localStorage.getItem(UK);premier=!localStorage.getItem(SK)}catch(e){}
      if(prev&&prev!==u){wr(KEY,{});wr(QK,{});premier=true}
      try{localStorage.setItem(UK,u)}catch(e){}
      var q=rd(QK,{});
      // première connexion de cet appareil avec ce compte : on envoie les favoris du téléphone (rien n'est perdu)
      if(premier){var f0=lire();Object.keys(f0).forEach(function(k){if(!q[k])q[k]={op:"set",data:f0[k],ajout:f0[k].ajout||Date.now(),t:0}})}
      var sets=[],dels=[];
      Object.keys(q).forEach(function(k){if(q[k].op==="del")dels.push(k);else sets.push({user_id:u,k:k,data:q[k].data,ajout:q[k].ajout})});
      var p=Promise.resolve({});
      if(sets.length)p=p.then(function(){return DB.from("favorites").upsert(sets,{onConflict:"user_id,k"})});
      p=p.then(function(x){if(x&&x.error)throw x.error;if(dels.length)return DB.from("favorites").delete().eq("user_id",u).in("k",dels)});
      return p.then(function(x){
        if(x&&x.error)throw x.error;
        // on retire de la file ce qui vient d'être envoyé (sauf si l'utilisateur l'a modifié entre-temps)
        var q2=rd(QK,{});Object.keys(q).forEach(function(k){if(q2[k]&&q2[k].t===q[k].t)delete q2[k]});wr(QK,q2);
        return DB.from("favorites").select("k,data,ajout").eq("user_id",u);
      }).then(function(x){
        if(x.error)throw x.error;
        var f={};(x.data||[]).forEach(function(r){f[r.k]=Object.assign({},r.data,{k:r.k,ajout:Number(r.ajout)})});
        // changements faits pendant la synchronisation : on les garde
        var q3=rd(QK,{});Object.keys(q3).forEach(function(k){if(q3[k].op==="del")delete f[k];else f[k]=q3[k].data});
        var avant=JSON.stringify(Object.keys(lire()).sort());
        ecrire(f);
        try{localStorage.setItem(SK,"1")}catch(e){}
        repeindre();
        document.dispatchEvent(new CustomEvent("pbfavsync"));
        if(avant!==JSON.stringify(Object.keys(f).sort()))document.dispatchEvent(new CustomEvent("pbfav"));
        fin();
      });
    }).catch(function(){fin()});
  }
  window.PBFAV={lire:lire,sync:sync};

  var css=document.createElement("style");
  css.textContent="body{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}"
  +".bnav{position:fixed;left:0;right:0;bottom:0;z-index:45;display:grid;grid-template-columns:repeat(5,1fr);align-items:end;background:#fff;border-top:1px solid #E4E5EE;box-shadow:0 -2px 12px rgba(0,0,0,.18);padding:6px 2px calc(6px + env(safe-area-inset-bottom,0px))}"
  +".bnav a{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;color:#6B6890;text-decoration:none;font:700 11px 'Hanken Grotesk',system-ui,sans-serif;white-space:nowrap}"
  +".bnav svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}"
  +".bnav a.on{color:#1D6FD8}"
  +".bnav .home i{display:flex;align-items:center;justify-content:center;width:62px;height:62px;margin-top:-30px;border-radius:50%;background:#1D6FD8;border:4px solid #fff;box-shadow:0 4px 14px rgba(29,111,216,.5)}"
  +".bnav .home svg,.bnav .home.on svg{width:32px;height:32px;stroke:#fff}"
  +".favb{flex:none;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:0;background:none;color:#F5B800;font:400 26px/1 system-ui,sans-serif;cursor:pointer}"
  +".pc-top .favb{margin-left:auto;margin-right:-4px}"
  +".sx-m.hasfav{grid-template-columns:50px minmax(0,1fr) 30px 34px;gap:8px}"
  +".nw-toast{bottom:calc(100px + env(safe-area-inset-bottom,0px))!important}"
  // ordinateur : plus de barre du bas, les pages sont dans le menu à 3 barres
  +"@media (min-width:900px){.bnav{display:none!important}body{padding-bottom:24px!important}.nw-toast{bottom:24px!important}}";
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
    if(f[k]){delete f[k];enfiler("del",k)}
    else{var el=b.closest(".pc[data-id],.sx-m,.oth-m"),i=el&&infos(el);if(!i)return;i.ajout=Date.now();f[k]=i;enfiler("set",k,i)}
    ecrire(f);sync();
    document.querySelectorAll(".favb").forEach(function(x){if(x.dataset.fav===k)peindre(x,!!f[k])});
    document.dispatchEvent(new CustomEvent("pbfav"));
  },true);
  function repeindre(){var f=lire();document.querySelectorAll(".favb").forEach(function(x){peindre(x,!!f[x.dataset.fav])})}
  decorer();
  new MutationObserver(decorer).observe(document.body,{childList:true,subtree:true});

  // synchronisation : au chargement, à la connexion, au retour en ligne et quand l'app revient au premier plan
  sync();
  if(DB){
    try{DB.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_IN"&&Date.now()-last>5000)setTimeout(sync,0)})}catch(e){}
    addEventListener("online",sync);
    document.addEventListener("visibilitychange",function(){if(!document.hidden&&Date.now()-last>30000)sync()});
  }
})();
