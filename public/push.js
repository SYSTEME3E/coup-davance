// Notifications push (Firebase Cloud Messaging) côté appli : autorisation, jeton, liaison au compte connecté.
// Chargé par menu.js après firebase-config.js. API : window.PUSH
//   state() · enable(sb) · disable(sb) · sync(sb) · release(sb) · test(sb) · getPrefs(sb) · setPrefs(sb,p) · boot(sb)
// Le jeton de l'appareil est rattaché au compte à chaque connexion (sync) et détaché à la déconnexion (release) :
// un téléphone partagé ne reçoit donc jamais les notifications de l'ancien compte.
(function(){
  var FBV="10.14.1",BASE="https://www.gstatic.com/firebasejs/"+FBV+"/";
  var K_TOK="pb_push_token",K_USER="pb_push_u",K_OFF="pb_push_off",K_T="pb_push_t",K_NO="pb_push_no";
  var ls={g:function(k){try{return localStorage.getItem(k)}catch(e){return null}},s:function(k,v){try{localStorage.setItem(k,v)}catch(e){}},d:function(k){try{localStorage.removeItem(k)}catch(e){}}};
  var ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  var standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  var cfg=function(){return window.FB||{}};
  // Dans l'appli Android (Capacitor), la WebView ne gère pas le Web Push : on passe par le plugin natif PushNotifications (FCM).
  var cap=window.Capacitor,native=!!(cap&&cap.isNativePlatform&&cap.isNativePlatform()),NP=native&&cap.Plugins&&cap.Plugins.PushNotifications,K_NP="pb_push_np";
  function configured(){if(native)return !!NP;var c=cfg();return !!(c.apiKey&&c.projectId&&c.messagingSenderId&&c.appId&&c.vapidKey)&&!/REMPLACE/.test(JSON.stringify(c))}
  function supported(){if(native)return !!NP;return "serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window}
  // unsupported · ios-install · unconfigured · denied · default (jamais demandé) · off (coupé dans l'appli) · granted (autorisé, jeton à enregistrer) · on
  function state(){
    if(!supported())return ios&&!standalone?"ios-install":"unsupported";
    if(!configured())return "unconfigured";
    var perm=native?(ls.g(K_NP)||"default"):Notification.permission;
    if(perm==="denied")return "denied";
    if(perm==="default")return "default";
    if(ls.g(K_OFF))return "off";
    return ls.g(K_TOK)?"on":"granted";
  }
  var errTxt=function(e){var m=String(e&&e.message||e||"");return /unsupported/.test(m)?"Ce navigateur ne gère pas les notifications.":/permission/i.test(m)?"Notifications refusées dans le navigateur.":"Activation impossible pour le moment : "+m.slice(0,120)};
  function reg(){return navigator.serviceWorker.register("sw.js").then(function(){return navigator.serviceWorker.ready})}
  function fbToken(r){
    var c=cfg();
    return Promise.all([import(BASE+"firebase-app.js"),import(BASE+"firebase-messaging.js")]).then(function(m){
      var app=m[0].getApps().length?m[0].getApp():m[0].initializeApp({apiKey:c.apiKey,authDomain:c.authDomain,projectId:c.projectId,messagingSenderId:c.messagingSenderId,appId:c.appId});
      return m[1].isSupported().then(function(ok){
        if(!ok)throw new Error("unsupported");
        var msg=m[1].getMessaging(app);
        return m[1].getToken(msg,{vapidKey:c.vapidKey,serviceWorkerRegistration:r}).then(function(t){if(!t)throw new Error("jeton vide");return{t:t,msg:msg,m:m[1]}});
      });
    });
  }
  // Enregistre (ou met à jour) le jeton de cet appareil pour le compte connecté
  function webRegister(sb){
    return sb.auth.getSession().then(function(r){
      var s=r.data&&r.data.session;if(!s)return{ok:false,error:"Connecte-toi pour activer les notifications."};
      return reg().then(fbToken).then(function(x){
        return sb.rpc("register_push_token",{p_token:x.t,p_ua:ua.slice(0,200),p_lang:(navigator.language||"fr").slice(0,10)}).then(function(r2){
          if(r2.error)throw r2.error;
          ls.s(K_TOK,x.t);ls.s(K_USER,s.user.id);ls.s(K_T,String(Date.now()));return{ok:true};
        });
      });
    }).catch(function(e){return{ok:false,error:errTxt(e)}});
  }

  function register(sb){return native?nativeRegister(sb):webRegister(sb)}
  // ---- Appli Android : jeton FCM via le plugin natif ----
  function nativeRefresh(){
    if(!NP)return Promise.resolve();
    return NP.checkPermissions().then(function(r){var p=r&&r.receive;ls.s(K_NP,p==="granted"?"granted":p==="denied"?"denied":"default")}).catch(function(){});
  }
  function nativeRegister(sb){
    return sb.auth.getSession().then(function(r){
      var s=r.data&&r.data.session;if(!s)return{ok:false,error:"Connecte-toi pour activer les notifications."};
      return new Promise(function(res){
        var hs=[],done=false;
        function fin(v){if(done)return;done=true;hs.forEach(function(h){Promise.resolve(h).then(function(x){x&&x.remove&&x.remove()}).catch(function(){})});res(v)}
        hs.push(NP.addListener("registration",function(t){
          sb.rpc("register_push_token",{p_token:t.value,p_ua:ua.slice(0,200),p_lang:(navigator.language||"fr").slice(0,10)}).then(function(r2){
            if(r2.error)return fin({ok:false,error:errTxt(r2.error)});
            ls.s(K_TOK,t.value);ls.s(K_USER,s.user.id);ls.s(K_T,String(Date.now()));fin({ok:true});
          },function(e){fin({ok:false,error:errTxt(e)})});
        }));
        hs.push(NP.addListener("registrationError",function(e){fin({ok:false,error:"Activation impossible : "+String(e&&e.error||e||"").slice(0,120)})}));
        NP.register().catch(function(e){fin({ok:false,error:errTxt(e)})});
        setTimeout(function(){fin({ok:false,error:"Activation trop longue, réessaie."})},15000);
      });
    }).catch(function(e){return{ok:false,error:errTxt(e)}});
  }
  function nativeEnable(sb){
    return NP.requestPermissions().then(function(r){
      var p=r&&r.receive;ls.s(K_NP,p==="granted"?"granted":p==="denied"?"denied":"default");
      if(p!=="granted")return{ok:false,denied:p==="denied",error:p==="denied"?"Notifications bloquées : ouvre Réglages du téléphone → Applis → PronostBet → Notifications, puis autorise.":"Autorisation refusée."};
      ls.d(K_OFF);return nativeRegister(sb);
    }).catch(function(e){return{ok:false,error:errTxt(e)}});
  }

  // À appeler depuis un clic : affiche la demande d'autorisation du navigateur
  function enable(sb){
    if(native)return NP?nativeEnable(sb):Promise.resolve({ok:false,error:"Mets à jour l’application pour activer les notifications."});
    var st=state();
    if(st==="unconfigured")return Promise.resolve({ok:false,error:"Notifications pas encore configurées (firebase-config.js)."});
    if(st==="ios-install")return Promise.resolve({ok:false,error:"Sur iPhone, ajoute d’abord l’app à l’écran d’accueil."});
    if(st==="unsupported")return Promise.resolve({ok:false,error:"Ce navigateur ne gère pas les notifications."});
    if(st==="denied")return Promise.resolve({ok:false,denied:true,error:"Les notifications sont bloquées. Autorise-les dans les réglages du site (cadenas à côté de l’adresse)."});
    return Notification.requestPermission().then(function(p){
      if(p!=="granted")return{ok:false,denied:p==="denied",error:"Autorisation refusée."};
      ls.d(K_OFF);return register(sb);
    });
  }
  function disable(sb){
    if(native){var nt=ls.g(K_TOK);ls.s(K_OFF,"1");ls.d(K_TOK);ls.d(K_USER);
      var np=nt?sb.rpc("unregister_push_token",{p_token:nt}).then(function(){},function(){}):Promise.resolve();
      return np.then(function(){return NP&&NP.unregister?NP.unregister().catch(function(){}):null}).then(function(){return{ok:true}},function(){return{ok:true}})}
    var t=ls.g(K_TOK);ls.s(K_OFF,"1");ls.d(K_TOK);ls.d(K_USER);
    var p=t?sb.rpc("unregister_push_token",{p_token:t}).then(function(){},function(){}):Promise.resolve();
    return p.then(function(){return configured()&&supported()?fbToken(null).catch(function(){return null}):null}).then(function(x){return x&&x.m.deleteToken(x.msg).catch(function(){})}).then(function(){return{ok:true}},function(){return{ok:true}});
  }
  // Connexion : rattache l'appareil au compte (silencieux, sans demande d'autorisation)
  function sync(sb){
    var st=state();if(st!=="on"&&st!=="granted")return Promise.resolve();
    return sb.auth.getSession().then(function(r){
      var s=r.data&&r.data.session;if(!s)return;
      var fresh=ls.g(K_USER)===s.user.id&&ls.g(K_TOK)&&Date.now()-Number(ls.g(K_T)||0)<12*36e5;
      if(!fresh)return register(sb);
    }).catch(function(){});
  }
  // Déconnexion : détache l'appareil du compte (n'attend jamais plus de 2,5 s)
  function release(sb){
    var t=ls.g(K_TOK);ls.d(K_USER);if(!t)return Promise.resolve();
    return Promise.race([sb.rpc("unregister_push_token",{p_token:t}).then(function(){},function(){}),new Promise(function(r){setTimeout(r,2500)})]);
  }
  function test(sb){return sb.rpc("push_test_me").then(function(r){return r.error?{ok:false,error:r.error.message}:{ok:true}})}
  function getPrefs(sb){return sb.rpc("get_my_push_prefs").then(function(r){return r.data||{matches:true,news:true,money:true,picks:true}})}
  function setPrefs(sb,p){return sb.rpc("set_my_push_prefs",{p_matches:!!p.matches,p_news:!!p.news,p_money:!!p.money,p_picks:!!p.picks}).then(function(r){return!r.error})}

  // Pop-up d'invitation sur le tableau de bord : s'affiche tant que les notifications ne sont pas activées (rappel au plus 1 fois par jour après « Plus tard »)
  function banner(sb){
    var st0=state();
    if(!(window.PUSH_PROMPT||/dashboard(\.html)?\/?$/.test(location.pathname))||(st0!=="default"&&st0!=="ios-install"))return;
    try{if(sessionStorage.getItem(K_NO))return}catch(e){}
    setTimeout(function(){
      var st1=state();if((st1!=="default"&&st1!=="ios-install")||document.getElementById("pushBn"))return;
      var o=document.createElement("div");o.id="pushBn";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label","Notifications");
      o.style.cssText="position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,5,40,.72);font:500 15px/1.4 'Hanken Grotesk',system-ui,sans-serif";
      o.innerHTML="<div style='width:100%;max-width:380px;background:#1E1760;color:#fff;border:1px solid #3A2F9A;border-radius:20px;padding:24px 20px 18px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,.5)'><div style='font-size:42px;line-height:1'>🔔</div><b id='pushT' style='display:block;font-size:19px;margin:12px 0 8px'>Active les notifications</b><p id='pushP' style='margin:0 0 18px;opacity:.9'>Buts, matchs qui démarrent, actualités, pronostics du jour, retraits et bonus : reçois tout directement sur ton téléphone.</p><button type='button' id='pushY' style='width:100%;min-height:48px;border:0;border-radius:14px;background:#1D6FD8;color:#fff;font:700 16px inherit;cursor:pointer'>Activer les notifications</button><button type='button' id='pushN' style='width:100%;min-height:44px;margin-top:8px;border:0;background:transparent;color:#C9C4F5;font:600 15px inherit;cursor:pointer'>Plus tard</button></div>";
      document.body.appendChild(o);
      function close(){try{sessionStorage.setItem(K_NO,"1")}catch(e){}o.remove()}
      document.getElementById("pushN").onclick=close;
      o.addEventListener("click",function(e){if(e.target===o)close()});
      document.getElementById("pushY").onclick=function(){var y=this;y.disabled=true;enable(sb).then(function(r){if(r.ok){o.remove();return}
        document.getElementById("pushT").textContent="⚠️ Notifications";document.getElementById("pushP").textContent=r.error||"Activation impossible.";y.remove();document.getElementById("pushN").textContent="Fermer"})};
    },1500);
  }
  function boot(sb){if(native){nativeRefresh().then(function(){sync(sb);banner(sb)});return}sync(sb);banner(sb)}
  // Appli Android : un toucher sur une notification ouvre la page prévue (même site uniquement)
  if(native&&NP){nativeRefresh();NP.addListener("pushNotificationActionPerformed",function(a){try{var d=(a&&a.notification&&a.notification.data)||{};var u=new URL(d.url||"dashboard.html",location.href);if(u.origin===location.origin)location.href=u.href}catch(e){}})}
  // Sur le tableau de bord, la pop-up se lance toute seule (sans dépendre du chargement du menu) dès que le client Supabase et la session sont prêts
  if(window.PUSH_PROMPT){var n=0,iv=setInterval(function(){
    if(++n>40){clearInterval(iv);return}
    if(typeof sb==="undefined"||!sb||!sb.auth)return;
    clearInterval(iv);
    sb.auth.getSession().then(function(r){if(r.data&&r.data.session)banner(sb)}).catch(function(){});
  },250)}
  window.PUSH={state:state,configured:configured,enable:enable,disable:disable,sync:sync,release:release,test:test,getPrefs:getPrefs,setPrefs:setPrefs,boot:boot};
})();
