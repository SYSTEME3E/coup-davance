// Client SportScore : appels directs à l'API REST publique https://sportscore.com/api/widget/<endpoint>/
// Points de terminaison (tous en GET, CORS ouvert) : matches, match, team, standings, topscorers, player, bracket, tracker
// La clé (CFG.ss) est envoyée en paramètre ?api_key= (évite la requête CORS préliminaire d'un en-tête X-API-Key).
const SS_BASE="https://sportscore.com/api/widget/";
// SS.last = dernière requête (chemin sans clé, statut HTTP, début de la réponse) : bloc « Diagnostic » de sport.html (?debug=1)
async function ssFetch(endpoint,params){
  const base=new URLSearchParams({sport:"football"});
  Object.entries(params||{}).forEach(([k,v])=>{if(v!=null&&v!=="")base.set(k,v)});
  const c=window.CFG||{};
  const attempt=async withKey=>{
    const q=new URLSearchParams(base);
    if(withKey&&c.ss)q.set("api_key",c.ss);
    if(c.src)q.set("src",c.src);
    const path=SS_BASE+endpoint+"/?"+base.toString();
    let res,txt="";
    try{res=await fetch(SS_BASE+endpoint+"/?"+q.toString());txt=await res.text()}
    catch(e){SS.last={path,status:0,keyed:withKey,body:String(e)};throw new Error("Réseau indisponible ou requête bloquée (CORS)")}
    SS.last={path,status:res.status,keyed:withKey,body:txt.slice(0,1500)};
    return{res,txt}};
  let r=await attempt(true);
  // La doc SportScore indique qu'aucune clé n'est requise : si la clé est refusée, on réessaie sans clé
  if(!r.res.ok&&(r.res.status===401||r.res.status===403)&&c.ss)r=await attempt(false);
  return r}
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
