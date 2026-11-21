// Bande « matchs en direct » : lit SportScore (ssLive) toutes les 60 s et fait défiler les scores. Nécessite sportscore.js.
// v3 : l'adresse « status=live » de SportScore peut renvoyer 0 match alors que les listes par date contiennent des matchs en cours.
//   Quand la lecture directe est vide, la bande utilise donc les matchs « en direct » de la liste du jour déjà chargée par la page
//   (aucune requête de plus). Nouvelles tentatives après 6 s, 15 s, 30 s et 60 s. Ajoute ?debug=1 à l'adresse du dashboard pour afficher un diagnostic.
(function(){
  var bar=document.getElementById("tick");if(!bar)return;
  var DEBUG=/[?&]debug=1/.test(location.search);
  var E=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
  var lg=function(u){return u&&!window.LITE?'<img src="'+E(u)+'" alt="" referrerpolicy="no-referrer" draggable="false" onerror="this.remove()">':""};
  var sig="",tries=0,retry=null;
  function item(x){
    var sc=x.hs!=null&&x.as!=null?'<span class="tk-s">'+E(x.hs)+' - '+E(x.as)+'</span>':'<span class="tk-s">vs</span>';
    var st=/half[- ]?time|\bht\b/i.test(x.status||"")?"MT":(x.minute?E(x.minute)+"’":"");
    var inner=E(x.home)+' '+sc+' '+lg(x.al||"")+' '+E(x.away)+(st?'<span class="tk-m">'+st+'</span>':"");
    inner=lg(x.hl||"")+' '+inner;
    return x.id?'<a class="tk-i" href="sport.html#match/'+encodeURIComponent(x.id)+(x.mid?"/"+encodeURIComponent(x.mid):"")+'">'+inner+'</a>':'<span class="tk-i">'+inner+'</span>'}
  // diagnostic (seulement avec ?debug=1) : combien de matchs reçus, combien en direct, et la dernière réponse de SportScore
  function diag(txt){if(!DEBUG)return;var l=(typeof SS!=="undefined"&&SS.last)||{};
    bar.hidden=false;bar.innerHTML='<div class="tk-b">DIAG</div><div class="tk-w" style="padding:0 10px;line-height:38px;overflow:auto">'+E(txt+" | SportScore : HTTP "+(l.status==null?"?":l.status)+" "+String(l.body||"").slice(0,80))+'</div>'}
  async function load(){
    var a=[],err="",src="direct";
    try{a=await ssLive()}catch(e){err=String((e&&e.message)||e)}
    var recus=a.length;
    a=a.filter(function(x){return x.live});
    if(!a.length){ // repli : matchs en cours de la liste du jour (gardée 5 min par sportscore.js, remplie par le dashboard)
      try{var today=new Date().toISOString().slice(0,10);
        if(typeof _ssDay!=="undefined"&&_ssDay&&_ssDay.d===today&&_ssDay.v){a=_ssDay.v.filter(function(x){return x.live&&!x.done});src="liste du jour"}}catch(e){}}
    a=a.slice(0,60);
    if(!a.length){
      bar.hidden=DEBUG?false:true;sig="";
      diag("0 match en direct (lecture directe : "+recus+(err?", erreur : "+err:"")+", liste du jour : "+(typeof _ssDay!=="undefined"&&_ssDay&&_ssDay.v?_ssDay.v.length+" matchs":"pas encore chargée")+", tentative "+(tries+1)+")");
      var d=[6000,15000,30000,60000][tries++];
      if(d){clearTimeout(retry);retry=setTimeout(load,d)}
      return}
    tries=0;if(DEBUG)diag(a.length+" match(s) en direct, source : "+src);
    var s=JSON.stringify(a.map(function(x){return[x.id,x.hs,x.as,x.status]}));
    if(s===sig)return;sig=s;
    var h=a.map(item).join("");
    bar.innerHTML='<div class="tk-b"><i></i>EN DIRECT</div><div class="tk-w"><div class="tk-t">'+h+h+'</div></div>';
    bar.querySelector(".tk-t").style.setProperty("--tkd",Math.max(30,a.length*5)+"s");
    bar.hidden=false}
  load();setInterval(function(){if(!document.hidden)load()},window.LITE?90000:60000);
})();
