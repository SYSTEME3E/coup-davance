// Client SportScore : appelle l'Edge Function "sportscore" (nécessite `sb`).
// Endpoints : matches, match, team, standings, topscorers, player, bracket, tracker
async function SS(endpoint,params){
  const{data,error}=await sb.functions.invoke("sportscore",{body:{endpoint,params:params||{}}});
  if(error||!data||data.error)throw new Error((data&&data.error)||(error&&error.message)||"Erreur SportScore");
  return data}
const ssPick=(o,ks)=>{for(const k of ks){const v=k.split(".").reduce((a,x)=>a==null?a:a[x],o);if(v!=null&&v!=="")return v}return null};
// Trouve la première liste dans une réponse (tolère data/results/matches/…)
function ssArr(d,keys){if(Array.isArray(d))return d;if(!d||typeof d!=="object")return[];
  for(const k of(keys||[]).concat(["data","results","matches","events","items","rows","standings","table","players","scorers","rounds"])){const v=d[k];if(Array.isArray(v))return v;if(v&&typeof v==="object"){const r=ssArr(v,[]);if(r.length)return r}}
  for(const k in d)if(Array.isArray(d[k]))return d[k];return[]}
const ssName=t=>t==null?"":typeof t==="string"?t:(t.name||t.title||t.short_name||t.shortName||"");
const ssLogo=t=>t&&typeof t==="object"?(t.logo||t.image||t.img||t.crest||""):"";
// Normalise un match
function ssMatch(m){const h=ssPick(m,["home_team","homeTeam","home","teams.home"]),a=ssPick(m,["away_team","awayTeam","away","teams.away"]);
  const sc=(k)=>{const v=ssPick(m,[k+"_score",k+"Score","score."+k,"goals."+k,"scores."+k]);return v&&typeof v==="object"?ssPick(v,["current","display","total","ft"]):v};
  const st=String(ssPick(m,["status","status_name","state","status.short","status.type"])||"").toLowerCase();
  const live=/live|inprogress|in_progress|1h|2h|ht|half|extra|pen|en cours/.test(st),done=/finish|ended|^ft$|full|aet|terminé|final/.test(st);
  return{id:ssPick(m,["id","match_id","fixture_id"]),home:ssName(h),away:ssName(a),hl:ssLogo(h),al:ssLogo(a),hid:ssPick(h||{},["id"]),aid:ssPick(a||{},["id"]),
    hs:sc("home"),as:sc("away"),status:st,live,done,minute:ssPick(m,["minute","elapsed","time.minute","status.minute"]),
    start:ssPick(m,["start_time","startTime","kickoff","date","start_at","datetime"]),comp:ssName(ssPick(m,["competition","league","tournament"])),
    cid:ssPick(m,["competition.id","league.id","tournament.id","competition_id","league_id"]),raw:m}}
