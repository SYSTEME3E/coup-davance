// Client SportScore : appels directs à l'API REST publique https://sportscore.com/api/widget/<endpoint>/
// Tous les points de terminaison sont en GET, renvoient du JSON, CORS ouvert (*), cache 60 s.
// Endpoints : matches, match, team, standings, topscorers, player, bracket, tracker
// La clé (CFG.ss) est envoyée en paramètre ?api_key= (évite la requête CORS préliminaire d'un en-tête X-API-Key).
const SS_BASE="https://sportscore.com/api/widget/";
async function SS(endpoint,params){
  const q=new URLSearchParams({sport:"football"});
  Object.entries(params||{}).forEach(([k,v])=>{if(v!=null&&v!=="")q.set(k,v)});
  const c=window.CFG||{};
  if(c.ss)q.set("api_key",c.ss);
  if(c.src)q.set("src",c.src);
  let res;
  try{res=await fetch(SS_BASE+endpoint+"/?"+q.toString())}catch(e){throw new Error("Réseau indisponible")}
  let d=null;try{d=await res.json()}catch(e){}
  if(!res.ok||!d||d.error)throw new Error((d&&(d.error||d.detail))||("Erreur SportScore ("+res.status+")"));
  return d}
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
  const cl=String(m.competition_logo||"").match(/\/competition\/([a-z0-9]+)\.\w+$/i);
  return{id:u?u[1]:ssPick(m,["slug","id"]),mid:u&&u[2]?u[2]:ssPick(m,["match_id","id"]),
    home:ssName(h),away:ssName(a),hl:ssLogo(h)||m.home_logo||"",al:ssLogo(a)||m.away_logo||"",
    hid:ssSlug(ssName(h)),aid:ssSlug(ssName(a)),hs:sc("home"),as:sc("away"),status:st.trim(),live,done,minute,
    start:ssPick(m,["time","start_time","startTime","kickoff","date","datetime"]),comp,
    cid:ssPick(m,["competition.slug","league.slug","competition_slug"])||ssSlug(comp)||null,calt:cl?cl[1]:null,raw:m}}
