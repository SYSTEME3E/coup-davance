// PronostBet : bloc « 6 pubs = niveau supérieur pour la journée » (Gratuit => Basic, Basic => Gold).
// - L'éligibilité est décidée côté serveur (rpc ad_progress) : Gold / essai => le bloc n'apparaît pas et AUCUNE pub n'est chargée.
// - Les pubs sont des « rewarded ads » AdSense (pub plein écran, choisie par l'utilisateur, fermable).
// - Chaque pub vue est enregistrée côté serveur (rpc ad_reward_claim) ; à la 6e, Basic est actif jusqu'à la fin de la journée.
// Réglage : renseigne CFG.adsRewardedSlot (config.js) avec l'identifiant du bloc « Annonces avec récompense » créé dans AdSense.
(function(){
const GOAL=6,CLIENT="ca-pub-2617146871223427";
const css='.adg{background:rgba(108,92,255,.12);border:1px solid rgba(108,92,255,.45);border-radius:14px;padding:16px;margin:14px 0}'
+'.adg h2{margin:0 0 4px;font-size:18px}.adg p{margin:4px 0 10px;font-size:14px;line-height:1.4}'
+'.adg .dots{display:flex;gap:6px;margin:10px 0}.adg .dots i{flex:1;height:8px;border-radius:99px;background:rgba(127,127,160,.35)}.adg .dots i.on{background:#22C55E}'
+'.adg .btn{margin-top:4px}.adg .btn[disabled]{opacity:.55;cursor:default}.adg .msg{font-size:13px;margin-top:8px;min-height:1em}'
+'.adg.ok{background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.55)}';
const css2='.adb{margin:18px 0;text-align:center;min-height:50px}.adb small{display:block;font-size:11px;opacity:.6;margin-bottom:4px}';
const st=document.createElement("style");st.textContent=css+css2;document.head.appendChild(st);

function mount(el,opts){
  opts=opts||{};
  const slot=window.CFG&&CFG.adsRewardedSlot;
  let ad=null,busy=false,prog={count:0,goal:GOAL,unlocked:false,target:"basic"};
  const NM=()=>prog.target==="gold"?"Gold":"Basic";
  const box=el;
  const dots=n=>'<div class="dots" aria-hidden="true">'+Array.from({length:GOAL},(_,i)=>'<i class="'+(i<n?'on':'')+'"></i>').join("")+'</div>';
  const say=t=>{const m=box.querySelector(".msg");if(m)m.textContent=t||""};
  function draw(){
    if(prog.unlocked){box.hidden=false;box.className="adg ok";
      box.innerHTML='<h2>✅ Plan '+NM()+' débloqué pour aujourd’hui</h2><p>Tu as regardé tes '+GOAL+' pubs. Tes avantages '+NM()+' sont actifs jusqu’à la fin de la journée (minuit UTC).</p>';return}
    box.hidden=false;box.className="adg";
    box.innerHTML='<h2>'+(opts.heading?opts.heading(NM()):'Passe en '+NM()+' aujourd’hui, gratuitement')+'</h2>'
     +'<p>Regarde <b>'+GOAL+' pubs</b> dans la journée pour avoir le plan '+NM()+' jusqu’à minuit (UTC). Tu choisis de regarder chaque pub ; si tu la fermes avant la fin, elle ne compte pas.</p>'
     +dots(prog.count)+'<button type="button" class="btn" id="adgBtn" disabled>Regarder une pub ('+prog.count+' / '+GOAL+')</button><div class="msg" role="status" aria-live="polite"></div>';
    const b=box.querySelector("#adgBtn");b.onclick=play;refreshBtn()}
  function refreshBtn(){const b=box.querySelector("#adgBtn");if(!b)return;
    b.disabled=busy||!ad;b.textContent=!slot?"Bientôt disponible":busy?"Chargement…":ad?"Regarder une pub ("+prog.count+" / "+GOAL+")":"Chargement de la pub…"}
  function preload(){
    ad=null;refreshBtn();
    if(!slot){say("Les pubs avec récompense seront bientôt disponibles. Tu peux déjà choisir un plan payant.");return}
    try{
      window.adsbygoogle=window.adsbygoogle||[];
      window.adsbygoogle.push({params:{google_ad_slot:slot,google_ad_format:"rewarded",
        google_ad_loaded_callback:r=>{ad=r||null;if(!ad)say("Aucune pub disponible pour le moment, réessaie dans un instant.");refreshBtn()}}});
    }catch(e){say("Les pubs ne peuvent pas se charger sur cet appareil.")}}
  function play(){
    if(!ad||busy)return;busy=true;const a=ad;ad=null;refreshBtn();say("");
    try{a.show(async res=>{
      if(res&&res.status==="viewed"){
        const{data,error}=await opts.sb.rpc("ad_reward_claim");
        if(error||!data||!data.ok){
          say(data&&data.error==="wait"?"Attends quelques secondes avant la pub suivante.":"Impossible d’enregistrer cette pub. Réessaie.")}
        else{prog=data;if(prog.unlocked){draw();busy=false;if(opts.onUnlock)opts.onUnlock();return}draw();say("Pub validée ✓")}
      }else say("Pub fermée avant la fin : elle n’est pas comptée.");
      busy=false;preload()})}
    catch(e){busy=false;say("Erreur d’affichage de la pub.");preload()}}
  (async()=>{
    box.hidden=true;
    try{
      const sess=await opts.sb.auth.getSession();if(!sess.data.session)return;
      // le serveur décide : gratuit => vise Basic ; Basic payant => vise Gold ; Gold, admin, essai => pas concerné
      const{data:p}=await opts.sb.rpc("ad_progress");
      if(!p||!p.eligible)return;
      prog=p;
      if(!prog.unlocked&&!slot&&!opts.showIfNoSlot)return;   // pas d'identifiant de bloc : rien (sauf si on veut montrer l'option grisée)
      if(!prog.unlocked&&slot&&!document.querySelector('script[src*="adsbygoogle.js"]')){
        const s=document.createElement("script");s.async=true;s.crossOrigin="anonymous";
        s.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+CLIENT;document.head.appendChild(s)}
      draw();if(!prog.unlocked)preload();
    }catch(e){box.hidden=true}})();
}

// Bannière AdSense « display » : uniquement pour le plan Gratuit (pas d'essai, pas de Basic/Gold). Le plan est lu côté serveur.
function display(el,opts){
  const slot=window.CFG&&CFG.adsDisplaySlot;if(!el||!slot)return;el.hidden=true;
  (async()=>{try{
    const sess=await opts.sb.auth.getSession();if(!sess.data.session)return;
    const{data:m}=await opts.sb.rpc("my_plan");
    if(!m||m.plan!=="free"||m.trial||m.level!=="free")return;
    el.className="adb";el.innerHTML='<small>Publicité</small>';
    const ins=document.createElement("ins");ins.className="adsbygoogle";ins.style.display="block";
    ins.setAttribute("data-ad-client",CLIENT);ins.setAttribute("data-ad-slot",slot);
    ins.setAttribute("data-ad-format","auto");ins.setAttribute("data-full-width-responsive","true");
    el.appendChild(ins);el.hidden=false;
    (window.adsbygoogle=window.adsbygoogle||[]).push({});
  }catch(e){el.hidden=true}})()}
window.PBAds={mount,display};
})();
