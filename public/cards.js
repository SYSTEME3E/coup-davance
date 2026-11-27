// Code commun à dashboard.html, historique.html et match.html (nécessite la variable globale `sb`, le client Supabase)
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LB={home:"victoire à domicile",draw:"match nul",away:"victoire à l’extérieur"};
const yn=b=>b?"✔":"✘";
const fr=n=>String(n).replace(".",",");
const META={};
const lgo=(u,c)=>u?'<img class="lgo'+(c?" "+c:"")+'" src="'+esc(u)+'" alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false" onload="if(this.naturalWidth<3)this.remove()" onerror="this.remove()">':"";
// Match en cours : badge rouge + score en direct
const liveBox=m=>{const ht=m.live_status==="HT",has=m.live_home!=null&&m.live_away!=null;
  return '<div class="res live">'+(has?'<div class="sc">'+m.live_home+' – '+m.live_away+'<small>Score en direct</small></div>':'<div class="sc"><small>Le score s’affichera à la fin du match</small></div>')
  +'<div class="vd"><span class="lv"><i></i>'+(ht?"MI-TEMPS":has?"EN COURS":"MATCH EN LIVE")+'</span>'+(!ht&&m.live_minute?'<small>'+m.live_minute+'’</small>':"")+'</div></div>'};
const result=m=>{
  if(m.settled_at&&m.final_home!=null){const v=m.verdict||{},hit=!!v.scoreHit,good=!!v.ok1x2||hit;
    // Vert si le résultat 1X2 est juste OU si le score exact est trouvé ; autocollants Gagné / Échoué / Score exact
    const title=v.ok1x2?"✔ Pronostic juste":hit?"✔ Score exact":"✘ Pronostic raté";
    const sub=!v.ok1x2&&hit?"Score prévu : "+esc(v.likelyScore||m.final_home+"-"+m.final_away):"Prévu : "+(LB[v.predicted]||"?");
    const stk=m.verdict?'<div class="stk">'+(v.ok1x2?'<span class="g">✔ Gagné</span>':hit?"":'<span class="x">✘ Échoué</span>')+(hit?'<span class="e">🎯 Score exact</span>':"")+'</div>':"";
    return '<div class="res '+(good?"ok":"ko")+'"><div class="sc">'+m.final_home+' – '+m.final_away+'<small>Score final</small></div>'
    +'<div class="vd"><b>'+title+'</b><small>'+sub+'</small></div></div>'+stk
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
// Flux pronostics : forme sur 10 matchs (archive) + absences signalées par la presse (data.flux, calculé côté serveur par pronos-flux)
const fx=d=>{const f=d&&d.flux;if(!f)return"";let h="";const a=f.archive;
  if(a&&a.home&&a.away&&a.home.n&&a.away.n){const av=(x,k)=>fr((x[k]/x.n).toFixed(1));
    h+='<div class="stats x"><div>Domicile · '+a.home.n+' derniers<b>'+a.home.w+'V '+a.home.d+'N '+a.home.l+'D</b></div><div>Extérieur · '+a.away.n+' derniers<b>'+a.away.w+'V '+a.away.d+'N '+a.away.l+'D</b></div>'
     +'<div>Buts pour/contre (dom.)<b>'+av(a.home,"gf")+' / '+av(a.home,"ga")+'</b></div><div>Buts pour/contre (ext.)<b>'+av(a.away,"gf")+' / '+av(a.away,"ga")+'</b></div></div>'}
  const ev=(l,arr)=>(arr||[]).filter(e=>e.impact<0).slice(0,3).map(e=>'<li>'+esc(l)+' : '+esc(e.title)+' <small>('+esc(e.source||"presse")+(e.confirmed?"":", non confirmé")+')</small></li>').join("");
  const lst=ev("Domicile",f.events&&f.events.home)+ev("Extérieur",f.events&&f.events.away);
  if(lst)h+='<p class="note" style="margin:8px 0 2px"><b>Absences signalées dans la presse</b></p><ul class="note" style="margin:0 0 6px;padding-left:18px">'+lst+'</ul>';
  if(f.h2h&&f.h2h.length)h+='<p class="note" style="margin:6px 0 0">Derniers face-à-face : '+f.h2h.slice(0,3).map(x=>esc(x.s)).join(" · ")+'</p>';
  return h};
const when=m=>new Date(m.kickoff).toLocaleDateString((window.PB?PB.loc():"fr-FR"),{weekday:"short",day:"numeric",month:"short"})+" · "+new Date(m.kickoff).toLocaleTimeString((window.PB?PB.loc():"fr-FR"),{hour:"2-digit",minute:"2-digit"});
const isOpen=m=>!!(m.data&&m.data.result);
const tagOf=m=>{const solid=m.kind?m.kind==="solid":(()=>{const p=m.data.result;return Math.max(p.home,p.draw,p.away)>=55})();
  return /friendl/i.test(m.league||"")?'<span class="cf lo">Match amical · très imprévisible</span>':solid?'<span class="cf hi">Favori probable</span>':'<span class="cf lo">Match incertain</span>'};
// ---- Cartes de pronostic (style SportScore sombre) ----
const PCN={h:"Domicile",d:"Nul",a:"Extérieur"},PCK={h:"home",d:"draw",a:"away"};
// Pronostic d'origine : si les chiffres stockés ont été recalculés après le match, ils ne correspondent plus au verdict enregistré.
// On affiche alors le pronostic réellement enregistré (verdict) au lieu des pourcentages recalculés.
const drift=m=>{const v=m&&m.verdict,d=m&&m.data;if(!m||!m.settled_at||!v||!v.predicted||!d||!d.result||!d.over)return false;
  const p=d.result,pk=p.home>=p.draw&&p.home>=p.away?"home":p.away>=p.draw?"away":"draw";
  return v.predicted!==pk||(v.btts&&v.btts.predicted!==(d.btts>=50))||(v.over25&&v.over25.predicted!==(d.over["2.5"]>=50))||(!!v.likelyScore&&v.likelyScore!==d.likelyScore)};
const origBox=(m,hc)=>{const v=m.verdict,pk={home:"Domicile",draw:"Nul",away:"Extérieur"}[v.predicted]||"?",yes=b=>b?"Oui":"Non";
  const sc=v.likelyScore?esc(v.likelyScore):"–";
  const note='<p class="note" style="margin:8px 0 0">Pronostic enregistré avant le match. Les pourcentages détaillés ne sont plus disponibles pour ce match.</p>';
  if(hc)return'<div class="stats"><div>Pronostic<b>'+pk+'</b></div><div>Score prévu<b>'+sc+'</b></div>'
    +(v.btts?'<div>Les deux marquent<b>'+yes(v.btts.predicted)+'</b></div>':"")+(v.over25?'<div>Plus de 2,5 buts<b>'+yes(v.over25.predicted)+'</b></div>':"")+'</div>'+note;
  return'<div class="pc-pills"><span class="pc-pk '+({home:"h",draw:"d",away:"a"}[v.predicted]||"d")+'">pronostic '+pk+'</span><span>score prévu <b>'+sc+'</b></span></div>'
    +'<div class="pc-chips">'+(v.over25?'<span>Plus de 2,5 buts <b>'+yes(v.over25.predicted)+'</b></span>':"")+(v.btts?'<span>Les deux marquent <b>'+yes(v.btts.predicted)+'</b></span>':"")+'</div>'+note};
const pcPick=p=>{const m=Math.max(p.home,p.draw,p.away);return p.home===m?"h":p.away===m?"a":"d"};
const pcBar=p=>{const sg=(k,c)=>'<span class="'+c+'" style="flex:'+Math.max(p[k],1)+'">'+(p[k]>=10?p[k]+"%":"")+'</span>';return'<div class="pc-bar">'+sg("home","h")+sg("draw","d")+sg("away","a")+'</div>'};
// Pronostic masqué (le serveur n'envoie pas les vraies valeurs : ce flou n'est qu'un décor)
const FAKE='<div class="pc-bar"><span class="h" style="flex:40">00%</span><span class="d" style="flex:30">00%</span><span class="a" style="flex:30">00%</span></div><div class="pc-pills"><span class="pc-pk h">pronostic Domicile · 00%</span><span>score prévu <b>0-0</b></span></div><div class="pc-chips"><span>Plus de 2,5 buts <b>00%</b></span><span>Les deux marquent <b>00%</b></span></div>';
const lockBox=m=>'<div class="lockbox"><div class="blurred" aria-hidden="true">'+FAKE+'</div><div class="lkov"><b>Pronostic masqué</b><span>Match '+(m.kind==="solid"?"solide":"incertain")+'</span><button type="button" class="btn" data-unlock="'+m.fixture_id+'">Débloquer le pronostic</button></div></div>';
const FULL={};
// Lignes affichées sur la page : au clic, la ligne et les logos sont gardés pour que match.html s'affiche tout de suite, sans attendre la base.
const PBROW={};
const pbStash=id=>{try{const m=FULL[id]||PBROW[id];if(m)sessionStorage.setItem("pb_row_"+id,JSON.stringify({t:Date.now(),row:m,meta:META[id]||null}))}catch(e){}};
// Modèle v3 : total de buts attendu, plus de 3,5 / 4,5 et 3 scores les plus probables (absents des anciens pronostics)
const gx=d=>{const o=d.over||{};let a="";
  if(d.expectedTotal!=null)a+='<span>Total prévu <b>'+fr(d.expectedTotal)+'</b></span>';
  if(o["3.5"]!=null)a+='<span>+3,5 buts <b>'+o["3.5"]+'%</b></span>';
  if(o["4.5"]!=null)a+='<span>+4,5 buts <b>'+o["4.5"]+'%</b></span>';
  return a};
const tops=d=>Array.isArray(d.topScores)&&d.topScores.length?'<div class="pc-chips"><span>Top scores <b>'+d.topScores.map(t=>esc(t.s)+' ('+fr(t.p)+'%)').join(" · ")+'</b></span></div>':"";
const pcWhy=d=>xt(d)+frm(d)+fx(d);
// fold = true : le détail (corners, forme…) est renvoyé à part, dans un bloc repliable (voir card)
const probs=(d,fold)=>{const p=d.result,k=pcPick(p);
  return pcBar(p)+'<div class="pc-pills"><span class="pc-pk '+k+'">pronostic '+PCN[k]+' · '+p[PCK[k]]+'%</span><span>score prévu <b>'+esc(d.likelyScore)+'</b></span></div>'
  +'<div class="pc-chips"><span>Plus de 2,5 buts <b>'+d.over["2.5"]+'%</b></span><span>Les deux marquent <b>'+d.btts+'%</b></span>'+gx(d)+'</div>'+tops(d)+(fold?"":pcWhy(d))};
const pcState=m=>m.settled_at?(m.final_home!=null?"done":"void"):m.live_status?"live":new Date(m.kickoff)<Date.now()?"wait":"next";
const card=m=>{m=FULL[m.fixture_id]||m;PBROW[m.fixture_id]=m;const d=m.data,me=META[m.fixture_id]||{},st=pcState(m),open=isOpen(m),k=open?pcPick(d.result):"",v=m.verdict||{},good=!!v.ok1x2||!!v.scoreHit;
  let badge="",mid='<span class="pc-vs">vs</span>',tag="";
  if(st==="done"){const o=m.final_home>m.final_away?"h":m.final_home<m.final_away?"a":"d";
    badge=(m.verdict?'<b class="'+(good?"ok":"ko")+'">'+(good?"✓":"✗")+'</b>':"")+'<span class="pc-bd">FT</span>';
    mid='<span class="pc-sc">'+m.final_home+' – '+m.final_away+'</span>';tag='<span class="pc-or '+o+'">'+PCN[o]+'</span>'}
  else if(st==="live"){const has=m.live_home!=null&&m.live_away!=null;
    badge='<span class="pc-bd lv"><i></i>'+(m.live_status==="HT"?"MI-TEMPS":m.live_minute?m.live_minute+"’":"LIVE")+'</span>';
    mid=has?'<span class="pc-sc live">'+m.live_home+' – '+m.live_away+'</span>':'<span class="pc-vs">–</span>'}
  else if(st==="wait")badge='<span class="pc-bd">…</span>';
  else if(st==="void")badge='<span class="pc-bd">'+esc(m.final_status||"Annulé")+'</span>';
  const side=x=>(k===x&&st!=="done"?" pk "+x:"");
  const vd=st==="done"&&m.verdict?'<div class="pc-vd">Prévu : '+(LB[v.predicted]||"?")+(v.scoreHit?' · 🎯 Score exact':"")+(v.btts&&v.over25?' · Les deux marquent '+yn(v.btts.ok)+' · +2,5 buts '+yn(v.over25.ok):"")+'</div>':"";
  const why=open?pcWhy(d):"";
  return '<div class="pc '+st+'" data-id="'+m.fixture_id+'" role="link" tabindex="0">'
  +'<div class="pc-top"><span>'+when(m)+'</span><span class="pc-badge">'+badge+'</span></div>'
  +'<div class="pc-lg">'+lgo(me.league_logo,"sm")+'<span>'+esc(m.league||"")+'</span>'+tagOf(m)+'</div>'
  +'<div class="pc-teams"><div class="pc-t l'+side("h")+'">'+lgo(me.home_logo)+'<b>'+esc(m.home)+'</b></div><div class="pc-m">'+mid+tag+'</div><div class="pc-t r'+side("a")+'"><b>'+esc(m.away)+'</b>'+lgo(me.away_logo)+'</div></div>'
  +(open?(drift(m)?origBox(m):probs(d,true)):lockBox(m))+vd
  +'<div class="pc-act">'+(why?'<button type="button" class="pc-b" data-why aria-expanded="false">pourquoi ▾</button>':'<span></span>')+'<a class="pc-b go" href="match.html?id='+m.fixture_id+'">Voir le match ↗</a></div>'
  +(why?'<div class="pc-why" hidden>'+why+'</div>':"")+'</div>'};
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-why]");if(!b)return;
  const w=b.closest(".pc").querySelector(".pc-why");if(!w)return;const o=w.hidden;w.hidden=!o;b.setAttribute("aria-expanded",o?"true":"false");b.textContent=o?"masquer ▴":"pourquoi ▾"});
// ---- Carte « Historique » (style clair : barre bleu / gris / rouge, résultat vert ou rouge) ----
const histCard=m=>{m=FULL[m.fixture_id]||m;PBROW[m.fixture_id]=m;const d=m.data,me=META[m.fixture_id]||{},open=isOpen(m);
  let body;
  if(open&&drift(m))body=origBox(m,true)+frm(d);
  else if(open){const p=d.result,sg=(k,c)=>'<span class="'+c+'" style="flex:'+Math.max(p[k],1)+'">'+(p[k]>=8?p[k]+"%":"")+'</span>';
    body='<div class="bar">'+sg("home","h")+sg("draw","d")+sg("away","a")+'</div>'
    +'<div class="lg"><span>Domicile</span><span>Nul</span><span>Extérieur</span></div>'
    +'<div class="stats"><div>Les deux marquent<b>'+d.btts+'%</b></div><div>Plus de 2,5 buts<b>'+d.over["2.5"]+'%</b></div><div>Score probable<b>'+esc(d.likelyScore)+'</b></div>'
    +(d.expectedTotal!=null?'<div>Buts attendus<b>'+fr(d.expectedTotal)+'</b></div>':"")+(d.over&&d.over["4.5"]!=null?'<div>Plus de 4,5 buts<b>'+d.over["4.5"]+'%</b></div>':"")+'</div>'
    +tops(d)+frm(d)+fx(d)}
  else body=lockBox(m);
  return '<div class="hc" data-id="'+m.fixture_id+'" role="link" tabindex="0">'
  +'<div class="tm"><b class="tn">'+lgo(me.home_logo)+esc(m.home)+'</b><span>contre</span><b class="tn">'+lgo(me.away_logo)+esc(m.away)+'</b></div>'
  +'<p class="sub">'+esc(m.league||"")+' · '+when(m)+'</p>'
  +'<div class="hc-tag">'+tagOf(m)+'</div>'
  +body+result(m)
  +'<div class="chk go">Voir le détail et les statistiques ›</div></div>'};
// Un clic sur une carte ouvre la page du match
const openCard=e=>{const c=e.target.closest&&e.target.closest(".card[data-id],.pc[data-id],.hc[data-id]");if(!c||e.target.closest("a,button"))return;
  if(String(getSelection()).length)return;pbStash(c.dataset.id);location.href="match.html?id="+c.dataset.id};
// Lien « Voir le match ↗ » : même mémorisation
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a.pc-b.go");if(!a)return;const c=a.closest(".pc[data-id]");if(c)pbStash(c.dataset.id)},true);
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
    if(data&&data.error==="quota")return fail("Quota du jour atteint ("+data.limit+" "+(data.kind==="solid"?"pronostics solides":"matchs incertains")+"). <a href=\"abonnement.html\">Voir les offres VIP</a>");
    return fail("Déblocage impossible. Réessaie dans un instant.")}
  let row=data.row&&isOpen(data.row)?data.row:null; // unlock_pick peut renvoyer la ligne complète : un seul appel au lieu de deux
  if(!row){const r=await sb.from("predictions_safe").select("*").eq("fixture_id",id).maybeSingle();row=r.data}
  if(!row||!isOpen(row))return fail("Déblocage impossible. Réessaie dans un instant.");
  FULL[id]=row;pbStash(id);
  document.querySelectorAll('.card[data-id="'+id+'"],.pc[data-id="'+id+'"],.hc[data-id="'+id+'"]').forEach(c=>{c.outerHTML=(c.classList.contains("hc")?histCard:card)(row)});
  if(window.afterUnlock)window.afterUnlock(row)});
