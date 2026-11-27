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
// Distribution finale du match sachant le score actuel et le temps restant
function ppLive(d,h0,a0,min){
  const f=ppFit(d),left=Math.max(.03,(90-Math.min(+min||0,90))/90),g=ppGrid(f.lh*left,f.la*left,8);
  let S=0;g.forEach(r=>r.forEach(p=>S+=p));
  const o={home:0,draw:0,away:0,btts:0,over:{"2.5":0,"3.5":0,"4.5":0},sc:[]};
  g.forEach((r,i)=>r.forEach((p0,j)=>{const p=p0/S*100,H=h0+i,A=a0+j;
    if(H>A)o.home+=p;else if(H===A)o.draw+=p;else o.away+=p;
    if(H>0&&A>0)o.btts+=p;
    ["2.5","3.5","4.5"].forEach(k=>{if(H+A>+k)o.over[k]+=p});
    o.sc.push({s:H+"-"+A,p})}));
  o.sc.sort((x,y)=>y.p-x.p);
  return o}
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

function ppRender(pr,c){
  const d=pr.data;if(!d||!d.result)return"";
  const r=d.result,st=c.st,pre=pcPick(r),KEY={h:"home",d:"draw",a:"away"};
  const name={home:pr.home,draw:"Match nul",away:pr.away};
  const preScores=Array.isArray(d.topScores)&&d.topScores.length?d.topScores.slice(0,3).map(t=>({s:t.s,p:+t.p})):(()=>{const f=ppFit(d),g=ppGrid(f.lh,f.la),a=[];g.forEach((row,i)=>row.forEach((p,j)=>a.push({s:i+"-"+j,p:p*100})));return a.sort((x,y)=>y.p-x.p).slice(0,3)})();
  const over=d.over||{},yes=+d.btts;
  let h='<div class="pp">';

  // ===== EN DIRECT : probabilités recalculées avec le score et le temps restant =====
  if(st==="live"&&c.h!=null&&c.a!=null){
    const L=ppLive(d,+c.h,+c.a,c.ht?45:c.min),cur=+c.h+ +c.a,both=+c.h>0&&+c.a>0;
    const lead=L.home>=L.draw&&L.home>=L.away?"home":L.away>=L.draw?"away":"draw";
    h+='<div class="pp-k"><span class="pp-lv"><i></i>En direct</span> · probabilités mises à jour</div>'
     +'<div class="pp-tiles">'+["home","draw","away"].map(k=>ppTile(name[k],L[k],{fav:k===lead,sub:'avant-match '+fr(r[k])+' % '+ppDelta(L[k],r[k])})).join("")+'</div>'
     +ppSec("Les deux équipes marquent",
        ppRow("Oui",both?100:L.btts,{done:both,tag:both?"✔ validé":""})+ppRow("Non",both?0:100-L.btts))
     +ppSec("Total de buts",
        ppRow("Plus de 2,5",cur>2?100:L.over["2.5"],{done:cur>2,tag:cur>2?"✔ validé":""})+ppRow("Moins de 2,5",cur>2?0:100-L.over["2.5"],{tag:cur>2?"✘ perdu":""}))
     +ppSec("Scores finaux les plus probables",L.sc.slice(0,3).map(x=>ppRow(ppSc(x.s),x.p)).join(""))
     +'<p class="pp-n">Estimation à partir du pronostic d’avant-match, du score ('+esc(c.h)+'–'+esc(c.a)+') et du temps restant. Elle ne tient pas compte des cartons rouges ni des changements, et se met à jour pendant le match.</p></div>';
    return h}

  // ===== TERMINÉ : le pronostic d’avant-match comparé à ce qui s’est passé =====
  if(st==="done"&&c.h!=null&&c.a!=null){
    const H=+c.h,A=+c.a,tot=H+A,out=H>A?"home":H<A?"away":"draw",fav=KEY[pre],bt=H>0&&A>0,o25=tot>2;
    const key=H+"-"+A,rank=preScores.findIndex(x=>ppNorm(x.s)===key)+1,exact=ppNorm(d.likelyScore||"")===key;
    h+='<div class="pp-k">Avant-match · résultat final</div>'
     +'<div class="pp-tiles">'+["home","draw","away"].map(k=>ppTile(name[k],r[k],{fav:k===fav,hit:k===out})).join("")+'</div>'
     +ppSec("Les deux équipes marquent",ppRow("Oui",yes,{hit:bt})+ppRow("Non",100-yes,{hit:!bt}))
     +ppSec("Total de buts",ppRow("Plus de 2,5",over["2.5"],{hit:o25})+ppRow("Moins de 2,5",100-over["2.5"],{hit:!o25}))
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
    // Prévu vs réel
    const x=c.xg,cells=[];
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
   +ppSec("Scores exacts les plus probables",preScores.map(x=>ppRow(ppSc(x.s),x.p)).join(""))
   +'<p class="pp-n">Une probabilité n’est pas une promesse : même un favori à 60 % perd environ 4 matchs sur 10.</p></div>';
  return h}
