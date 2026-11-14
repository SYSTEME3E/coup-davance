// Code commun à dashboard.html, historique.html et match.html (nécessite la variable globale `sb`, le client Supabase)
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LB={home:"victoire à domicile",draw:"match nul",away:"victoire à l’extérieur"};
const yn=b=>b?"✔":"✘";
const fr=n=>String(n).replace(".",",");
const META={};
const lgo=(u,c)=>u?'<img class="lgo'+(c?" "+c:"")+'" src="'+esc(u)+'" alt="" loading="lazy" onerror="this.remove()">':"";
// Match en cours : badge rouge + score en direct
const liveBox=m=>{const ht=m.live_status==="HT",has=m.live_home!=null&&m.live_away!=null;
  return '<div class="res live">'+(has?'<div class="sc">'+m.live_home+' – '+m.live_away+'<small>Score en direct</small></div>':'<div class="sc"><small>Le score s’affichera à la fin du match</small></div>')
  +'<div class="vd"><span class="lv"><i></i>'+(ht?"MI-TEMPS":has?"EN COURS":"MATCH EN LIVE")+'</span>'+(!ht&&m.live_minute?'<small>'+m.live_minute+'’</small>':"")+'</div></div>'};
const result=m=>{
  if(m.settled_at&&m.final_home!=null){const v=m.verdict||{};
    return '<div class="res '+(v.ok1x2?"ok":"ko")+'"><div class="sc">'+m.final_home+' – '+m.final_away+'<small>Score final</small></div>'
    +'<div class="vd"><b>'+(v.ok1x2?"✔ Pronostic juste":"✘ Pronostic raté")+'</b><small>Prévu : '+(LB[v.predicted]||"?")+'</small></div></div>'
    +(v.btts&&v.over25?'<div class="chk">Les deux marquent '+yn(v.btts.ok)+' · Plus de 2,5 buts '+yn(v.over25.ok)+' · Score exact '+yn(v.scoreHit)+'</div>':"")}
  if(m.settled_at)return '<div class="res wait">Match annulé ou non joué ('+esc(m.final_status)+')</div>';
  if(m.live_status)return liveBox(m);
  if(new Date(m.kickoff)<Date.now())return '<div class="res wait">Match en cours ou résultat en attente…</div>';
  return ""};
// Corners et fautes prévus (si disponibles pour ce match)
const xt=d=>{const e=d.extra;if(!e)return"";let a="";
  if(e.corners)a+='<div>Corners prévus<b>'+fr(e.corners.total)+'</b></div><div>Plus de 9,5 corners<b>'+e.corners.over["9.5"]+'%</b></div>';
  if(e.fouls)a+='<div>Fautes prévues<b>'+fr(e.fouls.total)+'</b></div>';
  if(e.cards)a+='<div>Cartons jaunes prévus<b>'+fr(e.cards.total)+'</b></div><div>Plus de 3,5 cartons<b>'+e.cards.over["3.5"]+'%</b></div>';
  if(e.throwIns)a+='<div>Touches prévues<b>'+fr(e.throwIns.total)+'</b></div>';
  return a?'<div class="stats x">'+a+'</div>':""};
// Forme des 5 derniers matchs (V = victoire, N = nul, D = défaite), du plus récent au plus ancien
const FM=s=>String(s||"").split("").map(x=>'<i class="f'+x+'">'+x+'</i>').join("");
const frm=d=>d.form&&(d.form.home||d.form.away)?'<div class="frm"><span>Forme domicile '+FM(d.form.home)+'</span><span>Forme extérieur '+FM(d.form.away)+'</span></div>':"";
const when=m=>new Date(m.kickoff).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})+" · "+new Date(m.kickoff).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
const isOpen=m=>!!(m.data&&m.data.result);
const tagOf=m=>{const solid=m.kind?m.kind==="solid":(()=>{const p=m.data.result;return Math.max(p.home,p.draw,p.away)>=55})();
  return /friendl/i.test(m.league||"")?'<span class="cf lo">Match amical · très imprévisible</span>':solid?'<span class="cf hi">Favori probable</span>':'<span class="cf lo">Match incertain</span>'};
// Pronostic masqué (le serveur n'envoie pas les vraies valeurs : ce flou n'est qu'un décor)
const FAKE='<div class="bar"><span class="h" style="flex:40">00%</span><span class="d" style="flex:30">00%</span><span class="a" style="flex:30">00%</span></div><div class="lg"><span>Domicile</span><span>Nul</span><span>Extérieur</span></div><div class="stats"><div>Les deux marquent<b>00%</b></div><div>Plus de 2,5 buts<b>00%</b></div><div>Score probable<b>0-0</b></div></div>';
const lockBox=m=>'<div class="lockbox"><div class="blurred" aria-hidden="true">'+FAKE+'</div><div class="lkov"><b>Pronostic masqué</b><span>Match '+(m.kind==="solid"?"solide":"incertain")+'</span><button type="button" class="btn" data-unlock="'+m.fixture_id+'">Débloquer le pronostic</button></div></div>';
const FULL={};
const probs=d=>{const p=d.result;
  return '<div class="bar"><span class="h" style="flex:'+p.home+'">'+p.home+'%</span><span class="d" style="flex:'+p.draw+'">'+p.draw+'%</span><span class="a" style="flex:'+p.away+'">'+p.away+'%</span></div>'
  +'<div class="lg"><span>Domicile</span><span>Nul</span><span>Extérieur</span></div>'
  +'<div class="stats"><div>Les deux marquent<b>'+d.btts+'%</b></div><div>Plus de 2,5 buts<b>'+d.over["2.5"]+'%</b></div><div>Score probable<b>'+esc(d.likelyScore)+'</b></div></div>'+xt(d)+frm(d)};
const card=m=>{m=FULL[m.fixture_id]||m;const d=m.data,me=META[m.fixture_id]||{};
  return '<div class="card" data-id="'+m.fixture_id+'" role="link" tabindex="0"><div class="tm"><b class="tn">'+lgo(me.home_logo)+esc(m.home)+'</b><span>contre</span><b class="tn">'+lgo(me.away_logo)+esc(m.away)+'</b></div>'
  +'<div class="mk">'+lgo(me.league_logo,"sm")+'<span>'+esc(m.league||"")+' · '+when(m)+'</span>'+tagOf(m)+'</div>'
  +(isOpen(m)?probs(d):lockBox(m))+result(m)+'<div class="chk go">Voir le détail et les statistiques ›</div></div>'};
// Un clic sur une carte ouvre la page du match
const openCard=e=>{const c=e.target.closest&&e.target.closest(".card[data-id]");if(!c||e.target.closest("a,button"))return;
  if(String(getSelection()).length)return;location.href="match.html?id="+c.dataset.id};
document.addEventListener("click",openCard);
document.addEventListener("keydown",e=>{if(e.key==="Enter")openCard(e)});
// Charge les logos des matchs affichés ; redessine la liste (rerender) si de nouveaux logos arrivent
let logoAsked=false;
async function ensureLogos(rows,rerender){
  const ids=[...new Set((rows||[]).map(m=>m.fixture_id))].filter(i=>!(i in META)).slice(0,200);
  if(!ids.length)return;
  const load=async()=>{const{data}=await sb.from("match_meta").select("*").in("fixture_id",ids);let n=0;
    (data||[]).forEach(r=>{if(!META[r.fixture_id]){META[r.fixture_id]=r;n++}});return n};
  let n=0;
  try{n=await load()}catch(e){}
  const missing=ids.filter(i=>!(i in META)&&i>=1e9);
  if(missing.length&&!logoAsked){logoAsked=true;
    try{await sb.functions.invoke("match-info",{body:{action:"logos",ids:missing.slice(0,100)}});n+=await load()}catch(e){}}
  ids.forEach(i=>{if(!(i in META))META[i]=null});
  if(n&&rerender)rerender()}

// Débloquer un pronostic (quota du jour géré côté serveur par unlock_pick)
document.addEventListener("click",async e=>{
  const b=e.target.closest&&e.target.closest("[data-unlock]");if(!b||b.disabled)return;
  const id=Number(b.dataset.unlock),t=b.textContent;b.disabled=true;b.textContent="Déblocage…";
  const note=h=>{let n=b.parentNode.querySelector(".lkn");if(!n){n=document.createElement("small");n.className="lkn";b.parentNode.appendChild(n)}n.innerHTML=h};
  const fail=h=>{b.disabled=false;b.textContent=t;note(h)};
  const{data,error}=await sb.rpc("unlock_pick",{p_fixture:id});
  if(error||!data||!data.ok){
    if(data&&data.error==="quota")return fail("Quota du jour atteint ("+data.limit+" "+(data.kind==="solid"?"pronostics solides":"matchs incertains")+"). <a href=\"abonnement.html\">Voir les abonnements</a>");
    return fail("Déblocage impossible. Réessaie dans un instant.")}
  const{data:row}=await sb.from("predictions_safe").select("*").eq("fixture_id",id).maybeSingle();
  if(!row||!isOpen(row))return fail("Déblocage impossible. Réessaie dans un instant.");
  FULL[id]=row;
  document.querySelectorAll('.card[data-id="'+id+'"]').forEach(c=>{c.outerHTML=card(row)});
  if(window.afterUnlock)window.afterUnlock(row)});
