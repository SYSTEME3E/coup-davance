// Page match « façon SportScore » (utilisée par sport.html#match/…)
// Dépend de : esc, ssPick, ssName, ssArr (cards.js / sportscore.js), lg, trkBox, hm (sport.html) et du client Supabase `sb`.
const MV_LAB=[[/possess/,"Possession"],[/danger/,"Attaques dangereuses"],[/attack/,"Attaques"],[/on (target|goal)/,"Tirs cadrés"],[/off (target|goal)/,"Tirs non cadrés"],[/block/,"Tirs contrés"],[/total shots|^shots$/,"Tirs"],[/corner/,"Corners"],[/yellow/,"Cartons jaunes"],[/red/,"Cartons rouges"],[/foul/,"Fautes"],[/offside/,"Hors-jeu"],[/save/,"Arrêts"],[/pass/,"Passes"],[/throw/,"Touches"],[/expected|xg/,"Buts attendus (xG)"]];
const mvNum=v=>{const n=parseFloat(String(v==null?"":v).replace("%","").replace(",","."));return isNaN(n)?0:n};
const mvLab=n=>{const k=String(n||"").toLowerCase();for(const[re,l]of MV_LAB)if(re.test(k))return l;return String(n||"")};
const mvIc=e=>{const t=String(e.type||"").toLowerCase();
  return e.is_sub||/subst/.test(t)?"🔄":/red/.test(t)?"🟥":e.is_card||/yellow|card/.test(t)?"🟨":/goal|penalty/.test(t)?"⚽":/var/.test(t)?"📺":""};
const mvMin=e=>{const v=ssPick(e,["time","minute","min"]);return v==null?"":String(v).replace(/[’']/g,"")};
const mvWho=e=>{const sub=e.is_sub||/subst/i.test(e.type||"");
  if(sub)return esc(e.player_in||"")+'<small>remplace '+esc(e.player_out||"")+'</small>';
  const n=esc(ssName(ssPick(e,["player","player_name","name"]))||""),ty=/var/i.test(e.type||"")?"Contrôle VAR":"";
  return n||ty||esc(e.type||"")};
const mvStats=r=>{const a=ssPick(r,["statistics","stats"]);if(!Array.isArray(a))return[];
  return a.map(s=>{const raw=ssPick(s,["name","type","label"])||"";return{k:String(raw).toLowerCase(),l:mvLab(raw),h:ssPick(s,["home","home_value"]),a:ssPick(s,["away","away_value"])}})};
const mvEvents=r=>ssArr(r,["incidents","events","timeline"]).filter(e=>mvIc(e)||e.type);
const mvCorner='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v2A16 16 0 0 1 5 21H3z"/></svg>';

function mvHero(m,r){
  const sc=m.hs!=null&&m.as!=null,when=m.start?new Date(typeof m.start==="number"&&m.start<1e12?m.start*1000:m.start):null;
  const ds=when&&!isNaN(when)?when.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})+" · "+when.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"";
  const sub=m.live?'<small><i></i>'+(m.minute?esc(m.minute)+"’":"EN DIRECT")+'</small>':m.done?'<small>Terminé</small>':'<small>À venir</small>';
  const mid=sc?'<div class="sc">'+esc(m.hs)+'<em>–</em>'+esc(m.as)+sub+'</div>':'<div class="sc" style="font-size:30px">'+esc(hm(m.start)||"vs")+sub+'</div>';
  const tid=ssPick(r,["tracker.id"])||m.mid;
  return'<div class="ms-hero"><div class="ms-comp">'+lg(m.cl)+'<div>'+esc(m.comp||"")+(ds?'<small>'+esc(ds)+'</small>':"")+'</div></div>'
   +'<div class="ms-sb"><div class="t">'+lg(m.hl)+'<b>'+esc(m.home)+'</b></div>'+mid+'<div class="t">'+lg(m.al)+'<b>'+esc(m.away)+'</b></div></div>'
   +(tid&&m.live?'<div class="ms-pitch-live">'+trkBox(tid)+'</div>':"")+'</div>'
   +(tid&&!m.live&&!m.done?'<p style="margin:0 0 12px"><a class="ms-btn" style="text-decoration:none" href="#tracker/'+esc(tid)+'">▶ Suivre en direct</a></p>':"")}

// Ligne « valeur | barre | LIBELLÉ | barre | valeur » de l'onglet Aperçu
function mvRow(s){const a=mvNum(s.h),b=mvNum(s.a),mx=Math.max(a,b),pct=/%/.test(String(s.h)+String(s.a));
  const w=v=>Math.min(100,pct?v:(mx?v/mx*100:0));
  return'<div class="ms-r"><b>'+esc(s.h==null?0:s.h)+'</b><div class="ms-t l"><i style="width:'+w(a)+'%"></i></div><span>'+esc(s.l)+'</span><div class="ms-t r"><i style="width:'+w(b)+'%"></i></div><b>'+esc(s.a==null?0:s.a)+'</b></div>'}

function mvOverview(m,r,st,ev){
  const f=re=>st.find(s=>re.test(s.k)),pos=f(/possess/),cor=f(/corner/);
  const ph=pos?Math.round(mvNum(pos.h)):null,pa=pos?Math.round(mvNum(pos.a)):null;
  let h='<div class="ms-card"><div class="ms-body"><div class="ms-pos"><div class="ms-cr">'+mvCorner+(cor?esc(cor.h==null?0:cor.h):"–")+'</div>'
   +'<div class="ms-pv">'+(pos?'<div class="tt"><b>'+ph+'%</b><span>POSSESSION</span><b>'+pa+'%</b></div><div class="ms-pb"><i class="l" style="width:'+ph+'%"></i><i class="r" style="width:'+pa+'%"></i></div>':'<div class="tt"><span>STATISTIQUES</span></div>')+'</div>'
   +'<div class="ms-cr r">'+mvCorner+(cor?esc(cor.a==null?0:cor.a):"–")+'</div></div>';
  // ordre voulu : Attaques, Tirs cadrés, Attaques dangereuses, Tirs non cadrés
  const pick=(re,not)=>st.find(x=>re.test(x.k)&&!(not&&not.test(x.k)));
  const ord=[pick(/attack/,/danger/),pick(/on (target|goal)/),pick(/danger/),pick(/off (target|goal)/)].filter(Boolean);
  const rest=!ord.length?st.filter(s=>!/possess|corner/.test(s.k)).slice(0,6):[];
  h+='<div class="ms-rs">'+ord.concat(rest).map(mvRow).join("")+'</div>';
  if(!st.length)h+='<p class="ms-empty">Les statistiques apparaîtront pendant le match.</p>';
  h+='</div></div>';
  // chronologie
  const evs=ev.slice().reverse();
  h+='<div class="ms-card"><h2>Chronologie du match</h2><div class="ms-body">';
  if(evs.length){h+='<div class="ms-tl">'+evs.map(e=>{const c=(mvIc(e)?mvIc(e)+" ":"")+mvWho(e),side=e.side==="away"?"a":"h";
    return'<div class="ms-ev"><div class="b h">'+(side==="h"?c:"")+'</div><div class="m">'+esc(mvMin(e))+'’</div><div class="b a">'+(side==="a"?c:"")+'</div></div>'}).join("")+'</div>'}
  else h+='<p class="ms-empty">Aucun évènement pour le moment.</p>';
  h+='<div class="ms-lg"><h3>Légende</h3><div><span>⚽ But / Penalty</span><span>🔄 Remplacement</span><span>🟨 Carton jaune</span><span>🟥 Carton rouge</span><span>📺 Contrôle VAR</span></div></div>';
  return h+'</div></div>'}

function mvStatsTab(m,st){
  if(!st.length)return'<div class="ms-card"><h2>Statistiques du match</h2><div class="ms-body"><p class="ms-empty">Pas encore de statistiques pour ce match.</p></div></div>';
  return'<div class="ms-card"><h2>Statistiques du match</h2><div class="ms-body"><div class="ms-tm"><div>'+lg(m.hl)+'<span>'+esc(m.home)+'</span></div><div>'+lg(m.al)+'<span>'+esc(m.away)+'</span></div></div>'
   +'<div class="ms-pills"><span class="on">Match</span></div>'
   +st.map(s=>{const a=mvNum(s.h),b=mvNum(s.a),t=a+b,pl=t?a/t*100:50;
     return'<div class="ms-sr"><h4>'+esc(s.l)+'</h4><div><b>'+esc(s.h==null?0:s.h)+'</b><div class="ms-sp"><i class="l" style="width:'+pl+'%"></i><i class="r" style="width:'+(100-pl)+'%"></i></div><b>'+esc(s.a==null?0:s.a)+'</b></div></div>'}).join("")+'</div></div>'}

// Terrain : les lignes de la formation (ex. 4-2-3-1) sont posées dans l'ordre de la liste (gardien d'abord)
function mvField(xi,form,side){
  const nums=String(form||"").split("-").map(Number).filter(n=>n>0),lines=[1].concat(nums);
  if(!xi.length||lines.reduce((a,b)=>a+b,0)!==xi.length)return"";
  let i=0,h="";const n=lines.length;
  lines.forEach((cnt,li)=>{const x0=7+li*(33/(n-1)),x=side==="h"?x0:100-x0;
    for(let j=0;j<cnt;j++){const p=xi[i++],y=(j+1)/(cnt+1)*100,nm=String(ssName(p.name)||"").split(/\s+/).pop();
      h+='<div class="ms-pl '+side+'" style="left:'+x+'%;top:'+y+'%"><i>'+esc(p.number??"")+'</i><span>'+esc(nm)+'</span></div>'}});
  return h}
function mvLineups(m,r){
  const L=r.lineups;
  if(!(L&&((L.home_xi||[]).length||(L.away_xi||[]).length)))return'<div class="ms-card"><h2>Compositions</h2><div class="ms-body"><p class="ms-empty">Les compositions ne sont pas encore disponibles.</p></div></div>';
  const hx=L.home_xi||[],ax=L.away_xi||[],fh=L.home_formation||"",fa=L.away_formation||"";
  const pitch=mvField(hx,fh,"h")+mvField(ax,fa,"a");
  const list=(n,xs,subs)=>'<h3>'+esc(n)+'</h3>'+xs.map(p=>'<div class="ms-xr"><em>'+esc(p.number??"")+'</em>'+(p.position?'<u class="'+esc(String(p.position)[0].toUpperCase())+'">'+esc(String(p.position)[0].toUpperCase())+'</u>':'<u></u>')+'<span>'+esc(p.name)+(p.captain?' <small>(C)</small>':"")+'</span></div>').join("")
    +((subs||[]).length?'<h3>Remplaçants</h3>'+subs.map(p=>'<div class="ms-xr"><em>'+esc(p.number??"")+'</em><u></u><span>'+esc(p.name)+'</span></div>').join(""):"");
  return'<div class="ms-card"><h2>Compositions</h2><div class="ms-fm"><div><b>'+esc(m.home)+'</b><small>Formation '+esc(fh||"–")+'</small></div><span class="ms-ok'+(L.confirmed?"":" p")+'">'+(L.confirmed?"CONFIRMÉE":"PROBABLE")+'</span><div><b>'+esc(m.away)+'</b><small>Formation '+esc(fa||"–")+'</small></div></div>'
   +(pitch?'<div class="ms-field"><div class="ms-bx l"></div><div class="ms-bx r"></div><div class="ms-cc"></div>'+pitch+'</div>':"")
   +'<div class="ms-xi">'+list(m.home,hx,L.home_subs)+list(m.away,ax,L.away_subs)+'</div></div>'}

function mvComments(m,ev){
  const evs=ev.slice().reverse();
  return'<div class="ms-card"><h2>Commentaires</h2><div class="ms-body">'+(evs.length?evs.map(e=>'<div class="ms-cm"><b>'+esc(mvMin(e))+'’</b><span>'+(mvIc(e)||"•")+'</span><div>'+(mvIc(e)==="📺"?"Contrôle VAR":mvWho(e))+'</div><em>'+esc(e.side==="away"?m.away:m.home)+'</em></div>').join(""):'<p class="ms-empty">Aucun commentaire pour le moment.</p>')+'</div></div>'}

// ---- H2H : lu dans notre archive Supabase (match_archive) ----
const mvKey=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[.']/g,"").replace(/\s+/g," ").trim();
const mvKeys=n=>{const k=mvKey(n),v=new Set([k,k.replace(/^(fc|cf|ac|as|sc) /,"").replace(/ (fc|cf|sc|afc)$/,"")]);
  const p=k.split(" ");if(p.length>1&&["united","town","city","county","rovers","athletic","wanderers","albion","fc"].includes(p[p.length-1]))v.add(p.slice(0,-1).join(" "));return[...v].filter(Boolean)};
async function mvH2H(box,m){
  try{const H=mvKeys(m.home),A=mvKeys(m.away),q=a=>a.map(x=>'"'+x+'"').join(",");
    const{data,error}=await sb.from("match_archive").select("kickoff,home_key,away_key,home_goals,away_goals").or("and(home_key.in.("+q(H)+"),away_key.in.("+q(A)+")),and(home_key.in.("+q(A)+"),away_key.in.("+q(H)+"))").order("kickoff",{ascending:false}).limit(60);
    if(error)throw error;const rows=(data||[]).filter(x=>x.home_goals!=null&&x.away_goals!=null);
    if(!rows.length){box.innerHTML='<p class="ms-empty">Aucune confrontation enregistrée entre ces deux équipes.</p>';return}
    let w=0,d=0,l=0;
    const res=x=>{const hh=H.includes(x.home_key),gf=hh?x.home_goals:x.away_goals,ga=hh?x.away_goals:x.home_goals;return gf>ga?"V":gf<ga?"D":"N"};
    rows.forEach(x=>{const k=res(x);if(k==="V")w++;else if(k==="D")l++;else d++});
    const t=rows.length,p=n=>Math.round(n/t*100);
    const li=rows.slice(0,5).map(x=>{const hh=H.includes(x.home_key),dt=new Date(x.kickoff).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
      return'<div class="ms-hr"><span>'+esc(dt)+'</span><span class="lw">'+lg(hh?m.hl:m.al)+'</span><span class="s">'+x.home_goals+' - '+x.away_goals+'</span><span class="lw">'+lg(hh?m.al:m.hl)+'</span><span class="w '+res(x)+'">'+res(x)+'</span></div>'}).join("");
    box.innerHTML='<div class="ms-hh"><div>'+lg(m.hl)+'<div class="n l">'+w+'</div><small>Victoires<br>'+esc(m.home)+'</small></div><div class="c"><b>'+t+'</b><small>Rencontres</small></div><div>'+lg(m.al)+'<div class="n r">'+l+'</div><small>Victoires<br>'+esc(m.away)+'</small></div></div>'
     +'<div class="ms-hb"><i class="l" style="width:'+p(w)+'%"></i><i class="d" style="width:'+p(d)+'%"></i><i class="r" style="width:'+p(l)+'%"></i></div><div class="ms-hp"><span>'+p(w)+'%</span><span>'+d+' nul'+(d>1?"s":"")+'</span><span>'+p(l)+'%</span></div><div class="ms-hl">'+li+'</div>'}
  catch(e){box.innerHTML='<p class="ms-empty">Historique indisponible pour le moment.</p>'}}

const MV_TABS=[["overview","Aperçu"],["stats","Stats"],["lineups","Compos"],["standings","Classement"],["h2h","H2H"],["comments","Commentaires"]];
let MV_M=null;
function mvRender(r,m){
  MV_M=m;const st=mvStats(r),ev=mvEvents(r);
  const pn={overview:mvOverview(m,r,st,ev),stats:mvStatsTab(m,st),lineups:mvLineups(m,r),
    standings:'<div class="ms-card"><h2>Classement</h2><div class="ms-body"><button type="button" class="ms-btn" data-mvstand="'+esc(m.cid||"")+'">Voir le classement de '+esc(m.comp||"la compétition")+'</button></div></div>',
    h2h:'<div class="ms-card"><h2>Face à face</h2><div class="ms-body" id="ms-h2h"><p class="ms-empty">Chargement…</p></div></div>',
    comments:mvComments(m,ev)};
  return'<div class="ms"><a class="ms-back" href="#matches">← Retour aux matchs</a>'+mvHero(m,r)
   +'<div class="ms-tabs" role="tablist">'+MV_TABS.map(([k,l],i)=>'<button type="button" role="tab" data-mvtab="'+k+'" class="'+(i?"":"on")+'">'+l+'</button>').join("")+'</div>'
   +MV_TABS.map(([k],i)=>'<div class="ms-pn'+(i?"":" on")+'" data-mvpn="'+k+'">'+pn[k]+'</div>').join("")
   +'<p class="ms-links">'+(m.hid?'<a href="#team/'+esc(m.hid)+'">Matchs de '+esc(m.home)+' ›</a>':'')+(m.hid&&m.aid?' · ':'')+(m.aid?'<a href="#team/'+esc(m.aid)+'">Matchs de '+esc(m.away)+' ›</a>':'')+'</p></div>'}

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-mvtab]");if(!b)return;
  const root=b.closest(".ms"),k=b.dataset.mvtab;
  root.querySelectorAll("[data-mvtab]").forEach(x=>x.classList.toggle("on",x===b));
  root.querySelectorAll("[data-mvpn]").forEach(x=>x.classList.toggle("on",x.dataset.mvpn===k));
  if(k==="h2h"){const box=document.getElementById("ms-h2h");if(box&&!box.dataset.done&&MV_M){box.dataset.done=1;mvH2H(box,MV_M)}}
  b.scrollIntoView&&b.scrollIntoView({block:"nearest",inline:"center"})});

// ---- Direct : mise à jour d'une fiche déjà affichée (score, minute, stats, chronologie), sans recharger le terrain ni changer d'onglet ----
// Renvoie true si l'état du match a changé (à venir → en direct → terminé) : l'appelant redessine alors toute la page.
async function mvRefresh(slug,mid){
  const root=document.querySelector(".ms");if(!root||!MV_M)return false;
  let d;try{d=await SS("match",{slug})}catch(e){if(!mid)return false;try{d=await SS("match",{slug:mid})}catch(e2){return false}}
  const r=d.match||d.data||d,m=ssMatch(r);if(!m.id)m.id=slug;if(!m.mid)m.mid=mid;
  const prev=MV_M;
  if(prev.live!==m.live||prev.done!==m.done){MV_M=m;return true}
  const tmp=document.createElement("div");tmp.innerHTML=mvRender(r,m);   // met aussi MV_M à jour
  const sb2=tmp.querySelector(".ms-sb"),sb1=root.querySelector(".ms-sb");
  if(sb1&&sb2)sb1.replaceWith(sb2);
  tmp.querySelectorAll("[data-mvpn]").forEach(n=>{const k=n.dataset.mvpn;if(k==="h2h"||k==="standings")return;
    const cur=root.querySelector('[data-mvpn="'+k+'"]');if(cur&&cur.innerHTML!==n.innerHTML)cur.innerHTML=n.innerHTML});
  return false}
