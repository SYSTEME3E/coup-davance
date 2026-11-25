// Client SportScore : appels directs à l'API REST publique https://sportscore.com/api/widget/<endpoint>/
// Points de terminaison (tous en GET, CORS ouvert) : matches, match, team, standings, topscorers, player, bracket, tracker
// Aucune clé API n'est envoyée depuis le navigateur (elle serait visible par tous les visiteurs).
const SS_BASE="https://sportscore.com/api/widget/";
// SS.last = dernière requête (chemin sans clé, statut HTTP, début de la réponse) : bloc « Diagnostic » de sport.html (?debug=1)
async function ssFetch(endpoint,params){
  const base=new URLSearchParams({sport:"football"});
  Object.entries(params||{}).forEach(([k,v])=>{if(v!=null&&v!=="")base.set(k,v)});
  const c=window.CFG||{};
  const attempt=async withKey=>{
    const q=new URLSearchParams(base);
    if(c.src)q.set("src",c.src);
    const root=/^v1\//.test(endpoint)?"https://sportscore.com/api/":SS_BASE;
    const path=root+endpoint+"/?"+base.toString();
    let res,txt="";
    try{res=await fetch(root+endpoint+"/?"+q.toString(),{});txt=await res.text()}
    catch(e){SS.last={path,status:0,keyed:withKey,body:String(e)};throw new Error("Réseau indisponible ou requête bloquée (CORS)")}
    SS.last={path,status:res.status,keyed:withKey,body:txt.slice(0,1500)};
    return{res,txt}};
  return await attempt(false)}
async function SS(endpoint,params){
  const{res,txt}=await ssFetch(endpoint,params);
  let d=null;try{d=JSON.parse(txt)}catch(e){}
  if(!res.ok)throw new Error((d&&(d.error||d.detail))||("Erreur SportScore ("+res.status+")"));
  if(!d)throw new Error("Réponse SportScore illisible (pas du JSON)");
  if(d.error)throw new Error(d.error);
  return d}
// L'endpoint « tracker » renvoie une petite page HTML (un <iframe>), pas du JSON : on en extrait l'adresse du lecteur.
async function ssTracker(id){
  const{res,txt}=await ssFetch("tracker",{id});
  if(!res.ok)throw new Error("Suivi live indisponible ("+res.status+")");
  const m=txt.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if(!m)throw new Error("Suivi live indisponible pour ce match");
  const u=m[1].replace(/&amp;/g,"&");
  if(!/^https:\/\//i.test(u))throw new Error("Adresse du suivi live invalide");
  return u}
// Messages d'erreur compréhensibles
function ssErr(e){const m=String((e&&e.message)||e||"");
  if(/no current season/i.test(m))return"Pas de saison en cours pour cette compétition.";
  if(/competition not found/i.test(m))return"Compétition introuvable chez SportScore.";
  if(/match not found/i.test(m))return"Match introuvable (il a peut-être été retiré).";
  if(/not found/i.test(m))return"Aucune donnée trouvée.";
  return m}
const ssPick=(o,ks)=>{for(const k of ks){const v=k.split(".").reduce((a,x)=>a==null?a:a[x],o);if(v!=null&&v!=="")return v}return null};
// Première liste trouvée dans une réponse (matches, standings, scorers, rounds…)
function ssArr(d,keys){if(Array.isArray(d))return d;if(!d||typeof d!=="object")return[];
  for(const k of(keys||[]).concat(["matches","data","results","events","items","rows","standings","table","players","scorers","rounds"])){const v=d[k];if(Array.isArray(v))return v;if(v&&typeof v==="object"){const r=ssArr(v,[]);if(r.length)return r}}
  for(const k in d)if(Array.isArray(d[k]))return d[k];return[]}
const ssName=t=>t==null?"":typeof t==="string"?t:(t.name||t.title||t.short_name||t.shortName||"");
const ssLogo=t=>t&&typeof t==="object"?(t.logo||t.image||t.img||t.crest||""):"";
const ssSlug=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
// Normalise un match. Format réel : {home:"Équipe", away:"…", home_logo, away_logo, home_score:"4", away_score:"0",
// status:"finished", status_text:"Finished", time:"ISO", competition:"Nom", competition_logo, url:"/football/match/<slug>/<id>/", live_minute}
function ssMatch(m){m=m||{};
  const h=ssPick(m,["home_team","homeTeam","home","teams.home"]),a=ssPick(m,["away_team","awayTeam","away","teams.away"]);
  const sc=k=>{const v=ssPick(m,[k+"_score",k+"Score","score."+k,"goals."+k,"scores."+k]);return v&&typeof v==="object"?ssPick(v,["current","display","total","ft"]):v};
  const st=String(ssPick(m,["status","status_text","state"])||"").toLowerCase()+" "+String(m.status_text||"").toLowerCase();
  const minute=ssPick(m,["live_minute","minute","elapsed"]);
  const done=/finish|ended|\bft\b|full[- ]?time|\baet\b|terminé|final/.test(st);
  const live=!done&&(minute!=null||/\b(live|inprogress|in_progress|in progress|1h|2h|ht|half[- ]?time|1st half|2nd half|extra[- ]?time|penalties|en cours)\b/.test(st));
  const u=String(m.url||"").match(/\/match\/([^/?#]+)\/?([^/?#]*)/);
  const comp=ssName(ssPick(m,["competition","league","tournament"]));
  // L'API ne donne pas le slug des équipes : on le retrouve dans celui du match (« equipe-a-vs-equipe-b »), l'ordre n'étant pas fiable
  const parts=u&&u[1].indexOf("-vs-")>0?u[1].split("-vs-"):null;
  const tslug=n=>{const fb=ssSlug(n);if(!parts)return fb;const toks=fb.split("-").filter(t=>t.length>2);let best=null,bs=0;
    parts.forEach(p=>{const w=p.split("-"),s=toks.filter(t=>w.indexOf(t)>=0).length;if(s>bs){bs=s;best=p}});return best||fb};
  let hid=tslug(ssName(h)),aid=tslug(ssName(a));if(hid===aid&&parts)aid=ssSlug(ssName(a));
  return{id:u?u[1]:ssPick(m,["slug","id"]),mid:u&&u[2]?u[2]:ssPick(m,["match_id","id"]),
    home:ssName(h),away:ssName(a),hl:ssLogo(h)||m.home_logo||"",al:ssLogo(a)||m.away_logo||"",
    hid,aid,hs:sc("home"),as:sc("away"),status:st.trim(),live,done,minute,
    start:ssPick(m,["time","start_time","startTime","kickoff","date","datetime"]),comp,cl:m.competition_logo||"",
    cid:ssPick(m,["competition.slug","league.slug","competition_slug"])||ssSlug(comp)||null,raw:m}}

// ---- Matchs : v1/fixtures (vérifié le 20/11/2026) ----
// • max. 200 matchs par appel, triés par heure de début ; offset/page sont ignorés
// • date=AAAA-MM-JJ (UTC) change de jour ; competition=<nom en minuscules avec des tirets> filtre une compétition
// • status=live renvoie TOUS les matchs en direct du monde en un seul appel (finished/upcoming filtrent aussi)
// • pas de minute de jeu : seulement status_text (« 1st half », « Halftime »…) et le score
const SS_TOP=["english-premier-league","spanish-la-liga","italian-serie-a","french-ligue-1","bundesliga","brazilian-serie-a"];
const ssFix=async p=>ssArr(await SS("v1/fixtures",p)).map(ssMatch);
// Une seule requête « direct » à la fois, réutilisée 20 s (dashboard, bande live et liste du jour l'appelaient chacun de leur côté)
let _ssLv={t:0,p:null};
const ssLive=()=>{if(_ssLv.p&&Date.now()-_ssLv.t<2e4)return _ssLv.p;_ssLv={t:Date.now(),p:ssFix({status:"live"}).catch(()=>[])};return _ssLv.p};
const ssKey=m=>String((m.raw&&m.raw.url)||m.home+"|"+m.away+"|"+m.start);
const ssMerge=lists=>{const seen=new Map();lists.flat().forEach(m=>{const k=ssKey(m);if(!seen.has(k)||m.live)seen.set(k,m)});
  return[...seen.values()].sort((a,b)=>+new Date(a.start)-+new Date(b.start))};
// Liste du jour. L'API limite chaque appel à 200 matchs : on additionne donc plusieurs appels (par statut et par compétition) puis on enlève les doublons.
// Statuts : en cours, terminés, à venir (200 chacun) + les grandes compétitions en entier. Gardé 5 min (le direct est mis à jour à chaque appel).
const SS_MORE=["uefa-champions-league","uefa-europa-league","uefa-conference-league","english-championship","dutch-eredivisie","portuguese-primeira-liga"];
// Cache de la liste du jour : en mémoire ET dans localStorage (il survit au changement de page, donc plus de 14 requêtes à chaque retour sur le tableau de bord).
// Moins de 5 min : on la sert telle quelle. Entre 5 min et 1 h : on la sert tout de suite et on la rafraîchit en arrière-plan.
let _ssDay={d:"",t:0,v:[],err:""},_ssBusy=null,_ssBusyD="";
const SS_LS="pb_ssday_v2";
const ssLoadLS=d=>{try{const s=JSON.parse(localStorage.getItem(SS_LS)||"null");if(s&&s.d===d&&Array.isArray(s.v)&&s.v.length&&Date.now()-s.t<36e5)return s}catch(e){}return null};
const ssSaveLS=()=>{try{
  // on ne garde de « raw » que l'adresse du match (sert à repérer les doublons) pour rester léger
  const v=_ssDay.v.map(m=>Object.assign({},m,{raw:{url:m.raw&&m.raw.url}}));
  localStorage.setItem(SS_LS,JSON.stringify({d:_ssDay.d,t:_ssDay.t,v}))}catch(e){}};
// Les appels sont lancés par petits groupes : trop de requêtes en parallèle se faisaient refuser par SportScore (limite de débit),
// ce qui laissait la liste « Autres matchs du jour » vide sans aucun message.
async function ssPool(tasks,n){const out=[];let i=0;
  await Promise.all(Array.from({length:n},async()=>{while(i<tasks.length){const k=i++;out[k]=await tasks[k]()}}));return out}
async function ssFetchDay(d){
  let fails=0,last="";
  const q=p=>async()=>{
    for(let a=0;a<2;a++){try{return await ssFix(Object.assign({date:d,limit:200},p))}catch(e){last=String((e&&e.message)||e);fails++;await new Promise(r=>setTimeout(r,500))}}
    return[]};
  // « direct » vient de ssLive() (un seul appel pour tous les matchs en cours) : inutile de le redemander ici
  const base=[{status:"finished"},{status:"upcoming"}].map(q);
  const comps=SS_TOP.concat(SS_MORE).map(c=>q({competition:c}));
  const r=await ssPool(base.concat(comps),6);
  const v=ssMerge(r);
  // Si tout a échoué on garde l'ancienne liste plutôt que d'afficher une page vide
  if(!v.length&&_ssDay.v.length&&_ssDay.d===d){_ssDay.t=Date.now()-24e4;_ssDay.err=last}
  else{_ssDay={d,t:Date.now(),v,err:v.length?"":last};if(v.length)ssSaveLS()}}
// force = true : ignore les caches (page de vérification)
async function ssToday(date,force){
  const today=new Date().toISOString().slice(0,10),d=date||today;
  if(_ssDay.d!==d||!_ssDay.v.length){const s=force?null:ssLoadLS(d);if(s)_ssDay={d,t:s.t,v:s.v,err:""}}
  const age=Date.now()-_ssDay.t,have=_ssDay.d===d&&_ssDay.v.length;
  if(force||_ssDay.d!==d||age>36e5||!have){
    if(!_ssBusy||_ssBusyD!==d){_ssBusyD=d;_ssBusy=ssFetchDay(d).finally(()=>{_ssBusy=null})}
    await _ssBusy}
  else if(age>3e5&&!_ssBusy){_ssBusyD=d;_ssBusy=ssFetchDay(d).catch(()=>{}).finally(()=>{_ssBusy=null})} // copie un peu ancienne : affichée tout de suite, rafraîchie en arrière-plan
  return d===today?ssMerge([_ssDay.v,await ssLive()]):_ssDay.v}
// ---- Rapprochement des noms d'équipes entre deux sources ----
const SS_STOP=new Set("fc ec sc cr ac as fr fbpa cf afc club de da do dos del la le les the paulista and".split(" "));
const ssToks=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\brb\b/g,"red bull").replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(t=>t&&t.length>1&&!SS_STOP.has(t));
const ssSameTeam=(a,b)=>{const A=ssToks(a),B=ssToks(b);if(!A.length||!B.length)return false;const i=A.filter(t=>B.includes(t)).length;return i>0&&(i===A.length||i===B.length||i/new Set(A.concat(B)).size>=0.5)};
// x et y : {home, away, t (ms)} ; hrs = écart d'heure de début toléré
const ssSameMatch=(x,y,hrs)=>ssSameTeam(x.home,y.home)&&ssSameTeam(x.away,y.away)&&(!x.t||!y.t||Math.abs(x.t-y.t)<=(hrs||3)*3600e3);
