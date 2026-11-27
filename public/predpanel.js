// Panneau « Pronostics » de match.html : 3 états (avant-match · en direct · terminé).
// Dépend de cards.js : esc, fr, pcPick, PCN, LB. Aucune requête réseau : tout est calculé à partir de pr.data (modèle) et du score.
// ppRender(pr, ctx) -> HTML.  ctx = { st:"next"|"live"|"done", h, a, min, ht, xg:[home,away]|null }

// ---- Maths : Poisson ----
const ppP=(l,k)=>{let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p};
const ppGrid=(lh,la,n)=>{n=n||9;const g=[];for(let i=0;i<=n;i++){g[i]=[];for(let j=0;j<=n;j++)g[i][j]=ppP(lh,i)*ppP(la,j)}return g};
// Retrouve les buts attendus de chaque équipe à partir du pronostic stocké (total attendu + probabilités 1X2)
function ppFit(d){
  const r=d.result;let T=+d.expectedTotal;
  if(!(T>0)){const t=((d.over&&d.over["2.5"])!=null?d.over["2.5"]:56)/100;let lo=.5,hi=6;
    for(let k=0;k<40;k++){const m=(lo+hi)/2,p=1-Math.exp(-m)*(1+m+m*m/2);if(p>t)hi=m;else lo=m}T=(lo+hi)/2}
  let best=null;
  for(let s=.05;s<=.95;s+=.005){const lh=T*s,la=T-lh,g=ppGrid(lh,la);let H=0,D=0,A=0;
    g.forEach((row,i)=>row.forEach((p,j)=>{if(i>j)H+=p;else if(i===j)D+=p;else A+=p}));
    const e=Math.pow(H*100-r.home,2)+Math.pow(D*100-r.draw,2)+Math.pow(A*100-r.away,2);
    if(!best||e<best.e)best={e,lh,la}}
  return best}
// Ajustement en direct des buts attendus : xG réels (léger) et cartons rouges (approximation)
const ppFitC=(()=>{const m=new WeakMap();return d=>{let f=m.get(d);if(!f){f=ppFit(d);m.set(d,f)}return f}})();
function ppRates(d,min,o){
  const f=ppFitC(d);let kh=1,ka=1;const t=Math.min(+min||0,90);
  if(o&&o.xg&&t>=20){const e=t/90,fx=(x,l)=>1+.35*(Math.max(.7,Math.min(1.4,((+x||0)+.3)/(l*e+.3)))-1);kh=fx(o.xg[0],f.lh);ka=fx(o.xg[1],f.la)}
  if(o&&o.red){const rh=+o.red[0]||0,ra=+o.red[1]||0;kh*=Math.pow(.7,rh)*Math.pow(1.2,ra);ka*=Math.pow(.7,ra)*Math.pow(1.2,rh)}
  return{lh:f.lh*kh,la:f.la*ka}}
// Distribution finale du match sachant le score actuel et le temps restant
function ppLive(d,h0,a0,min,o){
  const f=ppRates(d,min,o),left=Math.max(.03,(90-Math.min(+min||0,90))/90),rh=f.lh*left,ra=f.la*left,g=ppGrid(rh,ra,8);
  let S=0;g.forEach(r=>r.forEach(p=>S+=p));
  const q={home:0,draw:0,away:0,btts:0,over:{"1.5":0,"2.5":0,"3.5":0,"4.5":0},sc:[],left:rh+ra};
  g.forEach((r,i)=>r.forEach((p0,j)=>{const p=p0/S*100,H=h0+i,A=a0+j;
    if(H>A)q.home+=p;else if(H===A)q.draw+=p;else q.away+=p;
    if(H>0&&A>0)q.btts+=p;
    ["1.5","2.5","3.5","4.5"].forEach(k=>{if(H+A>+k)q.over[k]+=p});
    q.sc.push({s:H+"-"+A,p})}));
  q.sc.sort((x,y)=>y.p-x.p);
  // prochain but : au moins un but d'ici la fin, réparti selon le rythme de chaque équipe
  const tot=rh+ra,any=1-Math.exp(-tot);
  q.next={home:tot?any*rh/tot*100:0,away:tot?any*ra/tot*100:0,none:(1-any)*100};
  q.dc={x1:q.home+q.draw,x2:q.draw+q.away,x12:q.home+q.away};
  return q}
// Courbe des probabilités : on « rejoue » le match à partir des buts (minute + camp). null si les buts ne collent pas au score.
function ppSeries(d,c){
  const H=+c.h,A=+c.a,raw=c.ev;if(!raw)return null;
  const mk=flip=>raw.map(e=>({m:Math.max(1,Math.min(90,+e.m||1)),h:e.og&&flip?!e.h:e.h})).sort((x,y)=>x.m-y.m);
  let g=mk(false);const cnt=g=>[g.filter(e=>e.h).length,g.filter(e=>!e.h).length];
  if(cnt(g)[0]!==H||cnt(g)[1]!==A){g=mk(true);if(cnt(g)[0]!==H||cnt(g)[1]!==A)return null}
  const done=c.st==="done",end=done?90:Math.max(1,Math.min(90,+(c.ht?45:c.min)||1)),r=d.result,out=H>A?"home":H<A?"away":"draw";
  const at=t=>{let h=0,a=0;g.forEach(e=>{if(e.m<=t){e.h?h++:a++}});return[h,a]};
  const pts=[{t:0,home:r.home,draw:r.draw,away:r.away}],ts=new Set([end]);
  for(let t=3;t<end;t+=3)ts.add(t);g.forEach(e=>{if(e.m<=end){ts.add(e.m);ts.add(e.m-.01)}});
  [...ts].filter(t=>t>0&&t<=end).sort((x,y)=>x-y).forEach(t=>{
    if(done&&t>=90){pts.push({t,home:out==="home"?100:0,draw:out==="draw"?100:0,away:out==="away"?100:0});return}
    const[h,a]=at(t),L=ppLive(d,h,a,t);pts.push({t,home:L.home,draw:L.draw,away:L.away})});
  const fk=c.fk,sw=g.filter(e=>e.m<=end).map(e=>{
    const b=pts.find(p=>Math.abs(p.t-(e.m-.01))<1e-6),a=pts.find(p=>p.t===e.m);
    return b&&a?{m:e.m,h:e.h,d:a[fk]-b[fk]}:null}).filter(Boolean);
  return{pts,end,goals:g.filter(e=>e.m<=end),sw}}
const ppR=n=>Math.round(n*10)/10;
const ppF=n=>fr(ppR(n).toFixed(1));

// ---- Éléments d'affichage ----
const ppSc=s=>String(s).replace(/[–—-]/g,"–");
const ppNorm=s=>String(s).replace(/[–—]/g,"-").replace(/\s/g,"");
const ppTile=(lab,v,o)=>'<div class="pp-t'+(o.fav?" fav":"")+(o.hit?" hit":"")+'"><span class="pp-tn">'+esc(lab)+'</span><b>'+ppF(v)+' %</b>'
  +(o.sub?'<small>'+o.sub+'</small>':"")+(o.hit?'<em>résultat</em>':"")+'</div>';
const ppRow=(lab,v,o)=>{o=o||{};return'<div class="pp-r'+(o.hit?" hit":"")+(o.done?" done":"")+'"><span>'+esc(lab)+'</span><div class="pp-b"><i style="width:'+Math.max(2,Math.min(100,v))+'%"></i></div><b>'+ppF(v)+' %</b>'
  +(o.tag?'<small>'+o.tag+'</small>':"")+'</div>'};
const ppSec=(t,body)=>body?'<h3 class="pp-h">'+t+'</h3>'+body:"";
const ppDelta=(now,pre)=>{const x=now-pre;return Math.abs(x)<1?"":'<span class="'+(x>0?"up":"dn")+'">'+(x>0?"▲":"▼")+' '+fr(Math.abs(Math.round(x)))+'</span>'};
const ppOrd=n=>n===1?"le score le plus probable":n===2?"le deuxième score le plus probable":"le troisième score le plus probable";


// Graphique : probabilité de chaque issue au fil des minutes (aires empilées) + buts
function ppChart(S,name,live){
  const W=320,Hh=104,X=t=>(t/90*W).toFixed(1),Y=v=>(Hh*(1-v/100)).toFixed(1);
  const area=(lo,hi)=>{const up=S.pts.map(p=>X(p.t)+","+Y(hi(p))).join(" "),dn=S.pts.slice().reverse().map(p=>X(p.t)+","+Y(lo(p))).join(" ");return'<polygon points="'+up+" "+dn+'" '};
  let svg='<svg class="pp-svg" viewBox="0 0 '+W+' '+(Hh+18)+'" role="img" aria-label="Évolution des probabilités pendant le match">'
   +area(p=>0,p=>p.home)+'fill="#FF2D6A" fill-opacity=".85"/>'
   +area(p=>p.home,p=>p.home+p.draw)+'fill="#6F69B5" fill-opacity=".7"/>'
   +area(p=>p.home+p.draw,p=>100)+'fill="#8B6CFF" fill-opacity=".85"/>';
  [25,50,75].forEach(v=>svg+='<line x1="0" x2="'+W+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="#0B0828" stroke-opacity=".35" stroke-width=".6"/>');
  svg+='<line x1="'+X(45)+'" x2="'+X(45)+'" y1="0" y2="'+Hh+'" stroke="#fff" stroke-opacity=".25" stroke-dasharray="2 3"/>';
  if(live)svg+='<rect x="'+X(S.end)+'" y="0" width="'+(W-X(S.end))+'" height="'+Hh+'" fill="#0B0828" fill-opacity=".72"/><line x1="'+X(S.end)+'" x2="'+X(S.end)+'" y1="0" y2="'+Hh+'" stroke="#fff" stroke-width="1.5"/>';
  S.goals.forEach(e=>svg+='<line x1="'+X(e.m)+'" x2="'+X(e.m)+'" y1="0" y2="'+Hh+'" stroke="#fff" stroke-opacity=".55"/><circle cx="'+X(e.m)+'" cy="'+(Hh+7)+'" r="4.5" fill="'+(e.h?"#FF2D6A":"#8B6CFF")+'" stroke="#fff" stroke-width="1.2"/>');
  svg+=[0,45,90].map(t=>'<text x="'+(t===0?1:t===90?W-1:X(t))+'" y="'+(Hh+16)+'" text-anchor="'+(t===0?"start":t===90?"end":"middle")+'" fill="#8E89C4" font-size="8">'+t+'’</text>').join("")+'</svg>';
  return'<div class="pp-ch">'+svg+'<div class="pp-lg"><span><i style="background:#FF2D6A"></i>'+esc(name.home)+'</span><span><i style="background:#6F69B5"></i>Nul</span><span><i style="background:#8B6CFF"></i>'+esc(name.away)+'</span></div></div>'}
const ppIns=a=>a.length?'<ul class="pp-ins">'+a.map(x=>'<li><b>'+x[0]+'</b><span>'+x[1]+'</span></li>').join("")+'</ul>':"";
const ppNx=(L,name)=>ppRow(name.home,L.next.home)+ppRow(name.away,L.next.away)+ppRow("Aucun but",L.next.none);
const ppDC=(v,name,o)=>{o=o||{};return ppRow("Dom. ou nul",v.x1,{hit:o.hit&&o.hit.x1})+ppRow("Ext. ou nul",v.x2,{hit:o.hit&&o.hit.x2})+ppRow("Pas de nul",v.x12,{hit:o.hit&&o.hit.x12})};

function ppRender(pr,c){
  const d=pr.data;if(!d||!d.result)return"";
  const r=d.result,st=c.st,pre=pcPick(r),KEY={h:"home",d:"draw",a:"away"};
  const name={home:pr.home,draw:"Match nul",away:pr.away};
  const preScores=Array.isArray(d.topScores)&&d.topScores.length?d.topScores.slice(0,3).map(t=>({s:t.s,p:+t.p})):(()=>{const f=ppFit(d),g=ppGrid(f.lh,f.la),a=[];g.forEach((row,i)=>row.forEach((p,j)=>a.push({s:i+"-"+j,p:p*100})));return a.sort((x,y)=>y.p-x.p).slice(0,3)})();
  const over=d.over||{},yes=+d.btts;
  let h='<div class="pp">';

  // ===== EN DIRECT : probabilités recalculées avec le score, le temps restant, le xG et les cartons rouges =====
  if(st==="live"&&c.h!=null&&c.a!=null){
    const H=+c.h,A=+c.a,cur=H+A,both=H>0&&A>0,mn=c.ht?45:(+c.min||0);
    const L=ppLive(d,H,A,mn,{xg:c.xg,red:c.red}),lead=L.home>=L.draw&&L.home>=L.away?"home":L.away>=L.draw?"away":"draw";
    const fk=KEY[pre],S=ppSeries(d,Object.assign({},c,{fk})),left=Math.max(0,90-mn);
    h+='<div class="pp-k"><span class="pp-lv"><i></i>En direct</span> · '+(c.ht?"mi-temps":mn?mn+"’":"probabilités mises à jour")+' · '+esc(H)+'–'+esc(A)+'</div>'
     +'<div class="pp-tiles">'+["home","draw","away"].map(k=>ppTile(name[k],L[k],{fav:k===lead,sub:'avant-match '+fr(r[k])+' % '+ppDelta(L[k],r[k])})).join("")+'</div>';
    if(S&&S.pts.length>2)h+=ppSec("Évolution depuis le coup d’envoi",ppChart(S,name,true));
    // Lecture du match : phrases générées à partir des vrais chiffres
    const ins=[],nowF=L[fk],preF=r[fk],mv=Math.round(nowF-preF);
    if(H!==A){const ld=H>A?"home":"away";ins.push(["⚽",esc(name[ld])+" mène "+H+"–"+A+(mn?" à la "+mn+"e minute":"")+" : "+(fk===ld?"le favori du modèle reprend la main":fk==="draw"?"le scénario du nul s’éloigne":"le favori du modèle est mené")+"."])}
    else ins.push(["⚖️","Score de parité ("+H+"–"+A+")"+(mn?" à la "+mn+"e minute":"")+" : le nul est à "+fr(ppR(L.draw))+" %."]);
    ins.push(["📈",(fk==="draw"?"Le nul":esc(name[fk]))+" passe de "+fr(ppR(preF))+" % à "+fr(ppR(nowF))+" %"+(Math.abs(mv)>=1?" ("+(mv>0?"+":"−")+Math.abs(mv)+" points)":" (inchangé)")+"."]);
    if(left>0)ins.push(["⏱️","Il reste environ "+left+" min : le modèle attend encore "+fr(ppR(L.left))+" but"+(L.left>=1.5?"s":"")+"."]);
    if(c.xg&&mn>=20){const xh=+c.xg[0]||0,xa=+c.xg[1]||0;ins.push(["🎯","xG actuels : "+fr(ppR(xh))+" – "+fr(ppR(xa))+(Math.abs(xh-xa)>=.4?" · "+(()=>{const xl=xh>xa?"home":"away",sl=H>A?"home":H<A?"away":"";return esc(name[xl])+(xl===sl?" domine les occasions":" est plus dangereux que le score ne le dit")})():" · jeu équilibré")+"."])}
    if(c.red&&(c.red[0]||c.red[1]))ins.push(["🟥","Carton rouge pris en compte (approximation) : le rythme des deux équipes est ajusté."]);
    h+=ppSec("Lecture du match",ppIns(ins))
     +ppSec("Prochain but",ppNx(L,name))
     +ppSec("Les deux équipes marquent",
        ppRow("Oui",both?100:L.btts,{done:both,tag:both?"✔ validé":""})+ppRow("Non",both?0:100-L.btts,{tag:both?"✘ perdu":""}))
     +ppSec("Total de buts",
        [["1.5","Plus de 1,5"],["2.5","Plus de 2,5"]].map(x=>ppRow(x[1],cur>+x[0]?100:L.over[x[0]],{done:cur>+x[0],tag:cur>+x[0]?"✔ validé":""})).join("")
        +ppRow("Moins de 2,5",cur>2?0:100-L.over["2.5"],{tag:cur>2?"✘ perdu":""})
        +ppRow("Plus de 3,5",cur>3?100:L.over["3.5"],{done:cur>3,tag:cur>3?"✔ validé":""}))
     +ppSec("Double chance",ppDC(L.dc,name))
     +ppSec("Scores finaux les plus probables",L.sc.slice(0,3).map(x=>ppRow(ppSc(x.s),x.p)).join(""))
     +'<p class="pp-n">Estimation recalculée à partir du pronostic d’avant-match, du score ('+esc(H)+'–'+esc(A)+'), du temps restant'+(c.xg?', du xG':'')+' et des cartons rouges. Elle ne connaît ni les blessures ni les changements tactiques, et se met à jour pendant le match.</p></div>';
    return h}

  // ===== TERMINÉ : le pronostic d’avant-match comparé à ce qui s’est passé =====
  if(st==="done"&&c.h!=null&&c.a!=null){
    const H=+c.h,A=+c.a,tot=H+A,out=H>A?"home":H<A?"away":"draw",fav=KEY[pre],bt=H>0&&A>0,o25=tot>2;
    const key=H+"-"+A,rank=preScores.findIndex(x=>ppNorm(x.s)===key)+1,exact=ppNorm(d.likelyScore||"")===key;
    const dcPre={x1:r.home+r.draw,x2:r.draw+r.away,x12:r.home+r.away},dcHit={x1:out!=="away",x2:out!=="home",x12:out!=="draw"};
    const S=ppSeries(d,Object.assign({},c,{fk:fav}));
    h+='<div class="pp-k">Avant-match · résultat final</div>'
     +'<div class="pp-tiles">'+["home","draw","away"].map(k=>ppTile(name[k],r[k],{fav:k===fav,hit:k===out})).join("")+'</div>';
    if(S&&S.pts.length>2)h+=ppSec("Comment le match a basculé",ppChart(S,name,false));
    h+=ppSec("Les deux équipes marquent",ppRow("Oui",yes,{hit:bt})+ppRow("Non",100-yes,{hit:!bt}))
     +ppSec("Total de buts",ppRow("Plus de 2,5",over["2.5"],{hit:o25})+ppRow("Moins de 2,5",100-over["2.5"],{hit:!o25}))
     +ppSec("Double chance",ppDC(dcPre,name,{hit:dcHit}))
     +ppSec("Scores exacts les plus probables",preScores.map(x=>ppRow(ppSc(x.s),x.p,{hit:ppNorm(x.s)===key})).join(""));
    // Bilan : ✔ / ✘ par marché
    const ok=(b,l)=>'<span class="'+(b?"ok":"ko")+'">'+(b?"✔":"✘")+' '+l+'</span>';
    h+='<div class="pp-bilan">'+ok(out===fav,"Résultat 1X2")+ok((yes>=50)===bt,"Les deux marquent")+ok((over["2.5"]>=50)===o25,"+2,5 buts")+'<span class="'+(exact?"ok":"ko")+'">'+(exact?"🎯":"✘")+' Score exact</span></div>';
    // Texte d’explication généré à partir des vrais chiffres
    const pf=r[fav],po=r[out],s=[];
    if(out===fav)s.push("Le modèle donnait "+esc(name[fav])+" à "+fr(ppR(pf))+" % et "+(fav==="draw"?"le match nul s’est produit.":esc(name[fav])+" a gagné."));
    else s.push("Le modèle donnait "+esc(name[fav])+" favori à "+fr(ppR(pf))+" %, mais "+(out==="draw"?"le match s’est terminé sur un nul":esc(name[out])+" l’a emporté")+" ("+fr(ppR(po))+" % pour ce scénario).");
    const gap=Math.abs(yes-50);
    s.push("Le marché « les deux équipes marquent » était à "+Math.round(yes)+" / "+Math.round(100-yes)+(gap<=6?" : c’est exactement à ça que ressemble un match à pile ou face, et il est tombé sur « "+(bt?"oui":"non")+" ».":" et il est tombé sur « "+(bt?"oui":"non")+" »."));
    s.push(rank?"Le "+H+"–"+A+" final était "+ppOrd(rank)+" du modèle ("+fr(ppR(preScores[rank-1].p))+" %).":"Le score final ("+H+"–"+A+") ne figurait pas parmi les trois scores les plus probables du modèle.");
    h+='<div class="pp-why"><b>Une probabilité n’est pas une promesse.</b> '+s.join(" ")+'</div>';
    // Lecture du match : moment clé, mérité ou non, degré de surprise
    const ins=[],x=c.xg;
    if(S&&S.sw.length){const k=S.sw.slice().sort((p,q)=>Math.abs(q.d)-Math.abs(p.d))[0];
      if(Math.abs(k.d)>=3)ins.push(["⚡","Moment clé : le but de la "+k.m+"e minute ("+esc(name[k.h?"home":"away"])+") fait "+(k.d>0?"monter":"chuter")+" "+(fav==="draw"?"le nul":esc(name[fav]))+" de "+Math.round(Math.abs(k.d))+" points."])}
    ins.push([po<20?"😮":"✅","Ce résultat avait "+fr(ppR(po))+" % de chances avant le coup d’envoi"+(po<20?" : c’est une vraie surprise.":po>=50?" : le scénario le plus attendu.":".")]);
    if(x&&x[0]!=null&&x[1]!=null){const xh=+x[0],xa=+x[1],df=xh-xa,w=H>A?1:H<A?-1:0;
      ins.push(["🎯","xG : "+fr(ppR(xh))+" – "+fr(ppR(xa))+" · "+(Math.abs(df)<.4?(w===0?"un nul logique, match équilibré.":"match très équilibré, le score a tourné d’un détail."):((df>0&&w>0)||(df<0&&w<0)?"le score reflète la domination de "+esc(name[df>0?"home":"away"])+".":w===0?esc(name[df>0?"home":"away"])+" créait plus de danger mais n’a pas su le concrétiser.":esc(name[df>0?"home":"away"])+" a créé les meilleures occasions, mais "+esc(name[w>0?"home":"away"])+" a été plus efficace."))])}
    h+=ppSec("Lecture du match",ppIns(ins));
    // Prévu vs réel
    const cells=[];
    if(d.expectedTotal!=null)cells.push(["Buts prévus",fr(d.expectedTotal)]);
    cells.push(["Buts réels",String(tot)]);
    if(x&&x[0]!=null&&x[1]!=null)cells.push(["xG réels",fr(ppR((+x[0])+(+x[1])))]);
    if(cells.length>1)h+='<div class="pp-cmp">'+cells.map(z=>'<div><small>'+z[0]+'</small><b>'+z[1]+'</b></div>').join("")+'</div>';
    return h+'</div>'}

  // ===== AVANT-MATCH =====
  h+='<div class="pp-k">Avant-match · résultat final</div>'
   +'<div class="pp-tiles">'+["home","draw","away"].map(k=>ppTile(name[k],r[k],{fav:k===KEY[pre]})).join("")+'</div>'
   +ppSec("Les deux équipes marquent",ppRow("Oui",yes)+ppRow("Non",100-yes))
   +ppSec("Total de buts",ppRow("Plus de 2,5",over["2.5"])+ppRow("Moins de 2,5",100-over["2.5"])
     +(over["3.5"]!=null?ppRow("Plus de 3,5",over["3.5"]):""))
   +ppSec("Double chance",ppDC({x1:r.home+r.draw,x2:r.draw+r.away,x12:r.home+r.away},name))
   +ppSec("Scores exacts les plus probables",preScores.map(x=>ppRow(ppSc(x.s),x.p)).join(""))
   +(()=>{const f=ppFitC(d);return'<div class="pp-cmp"><div><small>Buts attendus '+esc(name.home)+'</small><b>'+fr(ppR(f.lh))+'</b></div><div><small>Buts attendus '+esc(name.away)+'</small><b>'+fr(ppR(f.la))+'</b></div></div>'})()
   +'<p class="pp-n">Une probabilité n’est pas une promesse : même un favori à 60 % perd environ 4 matchs sur 10.</p></div>';
  return h}
