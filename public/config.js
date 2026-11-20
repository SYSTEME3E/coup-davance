// Ces deux valeurs sont publiques par conception (la sécurité repose sur les règles RLS de Supabase).
window.CFG = { url: "https://edeoyscelvyrxpiaexhl.supabase.co", key: "sb_publishable_1_Qf92C6NAq6IG7eDkpQgQ_lnusfkIj",
  // SportScore : aucune clé dans le navigateur (le point de terminaison public n'en demande pas)
  src: "coup-davance" };

// Mode Lite (comme Facebook Lite) : pas d'images (logos des équipes), moins de requêtes ; les informations restent synchronisées.
// Activé par défaut ; se change dans le menu (« Mode Lite »). Le choix est gardé sur le téléphone.
window.LITE=(function(){try{var v=localStorage.getItem("pb_lite");if(v==="0")return false}catch(e){}return true})();
if(window.LITE)document.documentElement.classList.add("lite");
