// Matchs en direct -> page « Pronostics » (match.html) quand le match a un pronostic.
// Utilisé par la bande « En direct », les lignes « Autres matchs du jour » et la page Direct (sport.html).
// Nécessite : sportscore.js (ssSameMatch) et le client Supabase `sb`. Sans pronostic, le lien d'origine (sport.html#match/…) est conservé.
(function(){
  var LS="pb_home_v1",list=[],loadedAt=0,busy=null;
  var tms=function(s){if(s==null||s==="")return 0;var n=typeof s==="number"?(s<1e12?s*1000:s):Date.parse(s);return isNaN(n)?0:n};
  var fromLS=function(){try{var s=JSON.parse(localStorage.getItem(LS)||"null");
    if(s&&Array.isArray(s.data))return s.data.map(function(m){return{id:m.fixture_id,home:m.home,away:m.away,t:tms(m.kickoff)}})}catch(e){}return[]};
  list=fromLS();
  function load(){
    if(busy)return busy;
    if(typeof sb==="undefined")return Promise.resolve();
    var d0=new Date();d0.setHours(0,0,0,0);d0.setDate(d0.getDate()-1);var d1=new Date(d0.getTime()+3*864e5);
    busy=Promise.resolve(sb.from("predictions_safe").select("fixture_id,kickoff,home,away").gte("kickoff",d0.toISOString()).lt("kickoff",d1.toISOString()).is("settled_at",null).limit(500))
      .then(function(r){if(r&&r.data&&r.data.length){list=r.data.map(function(m){return{id:m.fixture_id,home:m.home,away:m.away,t:tms(m.kickoff)}});loadedAt=Date.now()}})
      .catch(function(){}).then(function(){busy=null});
    return busy}
  function find(x){
    if(typeof ssSameMatch!=="function")return null;
    for(var i=0;i<list.length;i++){var p=list[i];if(ssSameMatch({home:p.home,away:p.away,t:p.t},{home:x.home,away:x.away,t:x.t||0},3))return p.id}
    return null}
  // attributs à poser sur un lien / une ligne de match en direct
  function attrs(x){return x&&x.live&&x.home&&x.away?' data-lh="'+String(x.home).replace(/"/g,"&quot;")+'" data-la="'+String(x.away).replace(/"/g,"&quot;")+'" data-lt="'+tms(x.start)+'"':""}
  window.PBLINK={find:find,attrs:attrs,load:load};
  // capture : ce clic remplace l'ouverture du suivi SportScore par la page Pronostics (avec les cotes)
  document.addEventListener("click",function(e){
    if(e.defaultPrevented||!e.target.closest)return;
    if(e.target.closest(".favb"))return;
    var el=e.target.closest("[data-lh]");if(!el)return;
    var id=find({home:el.getAttribute("data-lh"),away:el.getAttribute("data-la"),t:+el.getAttribute("data-lt")||0});
    if(!id)return;
    e.preventDefault();e.stopImmediatePropagation();
    location.href="match.html?id="+id},true);
  load();setInterval(function(){if(!document.hidden&&Date.now()-loadedAt>12e4)load()},6e4);
})();
