// Bande « matchs en direct » : lit SportScore (ssLive) toutes les 60 s et fait défiler les scores. Nécessite sportscore.js.
// v2 : si la lecture est vide ou refusée (SportScore limite le débit pendant le chargement de la page), nouvelle tentative
//   après 22 s, 45 s et 70 s au lieu d'attendre le cycle suivant. Ajoute ?debug=1 à l'adresse du dashboard pour afficher un diagnostic dans la bande.
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
    var a=[],err="";
    try{a=await ssLive()}catch(e){err=String((e&&e.message)||e)}
    var recus=a.length;
    a=a.filter(function(x){return x.live}).slice(0,60);
    if(!a.length){
      bar.hidden=DEBUG?false:true;sig="";
      diag("0 match en direct (reçus : "+recus+(err?", erreur : "+err:"")+", tentative "+(tries+1)+")");
      var d=[22000,45000,70000][tries++];  // sportscore.js garde le résultat 20 s : on attend davantage avant de redemander
      if(d){clearTimeout(retry);retry=setTimeout(load,d)}
      return}
    tries=0;
    var s=JSON.stringify(a.map(function(x){return[x.id,x.hs,x.as,x.status]}));
    if(s===sig)return;sig=s;
    var h=a.map(item).join("");
    bar.innerHTML='<div class="tk-b"><i></i>EN DIRECT</div><div class="tk-w"><div class="tk-t">'+h+h+'</div></div>';
    bar.querySelector(".tk-t").style.setProperty("--tkd",Math.max(30,a.length*5)+"s");
    bar.hidden=false}
  load();setInterval(function(){if(!document.hidden)load()},window.LITE?90000:60000);
})();
