// Menu à 3 barres (en haut à droite) : informations du compte modifiables, navigation, déconnexion.
// Nécessite la variable globale `sb` (client Supabase) et un <header class="top"> dans la page.
(function(){
  const hdr=document.querySelector("header.top");
  if(!hdr||typeof sb==="undefined")return;
  const g=id=>document.getElementById(id);

  const btn=document.createElement("button");
  btn.type="button";btn.className="burger";btn.setAttribute("aria-label","Ouvrir le menu");btn.setAttribute("aria-expanded","false");
  btn.innerHTML="<i></i><i></i><i></i>";
  hdr.appendChild(btn);

  const ov=document.createElement("div");ov.className="ov";
  const dr=document.createElement("aside");dr.className="drw";dr.setAttribute("role","dialog");dr.setAttribute("aria-modal","true");dr.setAttribute("aria-label","Mon compte");
  dr.innerHTML=''
    +'<div class="dtop"><b>Mon compte</b><button type="button" class="dx" aria-label="Fermer le menu">✕</button></div>'
    +'<nav class="mn"><a href="dashboard.html">Matchs du jour</a><a href="historique.html">Historique</a><a href="admin.html" id="mAdmin" hidden>Espace administrateur</a></nav>'
    +'<form id="pf" novalidate><h3>Mes informations</h3>'
    +'<label for="pfn">Nom complet</label><input id="pfn" type="text" autocomplete="name" maxlength="100">'
    +'<label for="pfe">Adresse e-mail</label><input id="pfe" type="email" autocomplete="email">'
    +'<label for="pfp">Nouveau mot de passe</label><input id="pfp" type="password" autocomplete="new-password" placeholder="Laisse vide pour ne pas le changer">'
    +'<label for="pfc">Confirmer le mot de passe</label><input id="pfc" type="password" autocomplete="new-password">'
    +'<div id="pfm" class="pfm" role="status"></div>'
    +'<button class="btn" type="submit" id="pfs">Enregistrer</button></form>'
    +'<button type="button" class="out2" id="mOut">Quitter</button>';
  document.body.appendChild(ov);document.body.appendChild(dr);

  let profile={full_name:""},curEmail="",ready=false;
  const say=(t,ok)=>{const m=g("pfm");m.textContent=t||"";m.className="pfm"+(t?(ok?" ok":" ko"):"")};
  const open=()=>{dr.classList.add("on");ov.classList.add("on");btn.setAttribute("aria-expanded","true");document.body.style.overflow="hidden";dr.querySelector(".dx").focus()};
  const close=()=>{dr.classList.remove("on");ov.classList.remove("on");btn.setAttribute("aria-expanded","false");document.body.style.overflow="";btn.focus()};
  btn.onclick=open;ov.onclick=close;dr.querySelector(".dx").onclick=close;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&dr.classList.contains("on"))close()});

  g("mOut").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};

  // Chargement du compte
  (async()=>{
    const{data:{session}}=await sb.auth.getSession();
    if(!session)return;
    curEmail=session.user.email||"";g("pfe").value=curEmail;
    const{data}=await sb.from("profiles").select("full_name,is_admin,blocked").eq("id",session.user.id).maybeSingle();
    if(data){
      if(data.blocked){await sb.auth.signOut();location.href="auth.html#login";return}
      profile=data;g("pfn").value=data.full_name||"";
      if(data.is_admin)g("mAdmin").hidden=false;
    }
    ready=true;
  })();

  // Messages d'erreur en français
  const frErr=m=>/different from the old|same password/i.test(m)?"Le nouveau mot de passe doit être différent de l’ancien."
    :/reauthenticat|recent login|re-authenticat/i.test(m)?"Pour des raisons de sécurité, déconnecte-toi puis reconnecte-toi avant de réessayer."
    :/weak|pwned|easy to guess|should contain/i.test(m)?"Mot de passe trop faible ou trop courant. Choisis-en un autre."
    :/already|registered|exists/i.test(m)?"Cette adresse e-mail est déjà utilisée."
    :/rate|seconds|limit/i.test(m)?"Trop de demandes pour le moment. Patiente quelques minutes puis réessaie."
    :"Action impossible : "+m;

  g("pf").onsubmit=async e=>{
    e.preventDefault();say("");
    if(!ready)return say("Chargement du compte… réessaie dans un instant.");
    const name=g("pfn").value.trim(),mail=g("pfe").value.trim(),pw=g("pfp").value,pc=g("pfc").value;
    if(!/^\S+@\S+\.\S+$/.test(mail))return say("Adresse e-mail invalide.");
    if(pw&&pw.length<8)return say("Le mot de passe doit contenir au moins 8 caractères.");
    if(pw!==pc)return say("Les deux mots de passe ne sont pas identiques.");
    const nameChanged=name!==(profile.full_name||""),mailChanged=mail!==curEmail;
    if(!nameChanged&&!mailChanged&&!pw)return say("Rien à enregistrer : tu n’as modifié aucune information.");
    const s=g("pfs");s.disabled=true;
    const notes=[];let fail="";
    if(nameChanged){const{error}=await sb.rpc("set_my_name",{n:name});if(error)fail="Nom non enregistré : "+error.message;else{profile.full_name=name;notes.push("Nom enregistré.")}}
    if(!fail&&mailChanged){const{error}=await sb.auth.updateUser({email:mail},{emailRedirectTo:location.origin+"/dashboard.html"});
      if(error)fail=frErr(error.message);else notes.push("Un e-mail de confirmation a été envoyé : ton adresse changera après avoir cliqué sur le lien.")}
    if(!fail&&pw){const{error}=await sb.auth.updateUser({password:pw});
      if(error)fail=frErr(error.message);else{notes.push("Mot de passe modifié.");g("pfp").value="";g("pfc").value=""}}
    s.disabled=false;
    if(fail)say((notes.length?notes.join(" ")+" ":"")+fail);else say(notes.join(" "),true);
  };
})();
