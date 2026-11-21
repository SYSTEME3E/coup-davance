// Service worker Pronos-bet : l'app s'ouvre sans internet (pages, styles, scripts et bibliothèque Supabase gardés en cache).
// Réseau d'abord ; si le réseau échoue, on sert la copie en cache. Les données (Supabase, SportScore) ne sont jamais mises en cache ici :
// le dashboard enregistre lui-même sa dernière liste de matchs sur le téléphone.
const V="pronos-bet-v10";
const SB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.js";
const FONTS="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Hanken+Grotesk:wght@400;500;700&display=swap";
const PAGES=["index.html","auth.html","dashboard.html","historique.html","match.html","sport.html","legal.html","reglages.html","balance.html","abonnement.html"];
const FILES=["config.js","menu.js","pwa.js","cards.js","sportscore.js","ticker.js","ticker.css","matchview.js","matchview.css","predview.css","style.css","theme.css","icon.svg","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
const EXT=[SB,FONTS];
self.addEventListener("install",e=>{e.waitUntil((async()=>{
  const c=await caches.open(V);
  // chaque fichier est ajouté séparément : un fichier absent ne bloque pas l'installation
  await Promise.all(PAGES.concat(FILES).map(u=>c.add(u).catch(()=>{})));
  await Promise.all(EXT.map(u=>fetch(u,{mode:"no-cors"}).then(r=>c.put(u,r)).catch(()=>{})));
  await self.skipWaiting()})())});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET")return;
  // Bibliothèque Supabase et polices : copie en cache d'abord (elles ne changent pas), mise à jour en arrière-plan
  if(u.origin!==location.origin){
    if(r.url===SB||u.hostname==="fonts.googleapis.com"||u.hostname==="fonts.gstatic.com"){
      e.respondWith(caches.match(r).then(m=>{
        const net=fetch(r).then(res=>{if(res.ok||res.type==="opaque"){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>m);
        return m||net}));
    }
    return; // Supabase (données), SportScore et autres API : jamais mis en cache
  }
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==="navigate"?caches.match("dashboard.html"):Response.error()))));
});
