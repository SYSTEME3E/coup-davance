// Bande « matchs en direct » : lit SportScore (ssLive) toutes les 60 s et fait défiler les scores. Nécessite sportscore.js.
(function(){
  var bar=document.getElementById("tick");if(!bar)return;
  var E=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
  var lg=function(u){return u?'<img src="'+E(u)+'" alt="" referrerpolicy="no-referrer" draggable="false" onerror="this.remove()">':""};
  var sig="";
  function item(x){
    var sc=x.hs!=null&&x.as!=null?'<span class="tk-s">'+E(x.hs)+' - '+E(x.as)+'</span>':'<span class="tk-s">vs</span>';
    var st=/half[- ]?time|\bht\b/i.test(x.status||"")?"MT":(x.minute?E(x.minute)+"’":"");
    var inner=E(x.home)+' '+sc+' '+lg(x.al||"")+' '+E(x.away)+(st?'<span class="tk-m">'+st+'</span>':"");
    inner=lg(x.hl||"")+' '+inner;
    return x.id?'<a class="tk-i" href="sport.html#match/'+encodeURIComponent(x.id)+(x.mid?"/"+encodeURIComponent(x.mid):"")+'">'+inner+'</a>':'<span class="tk-i">'+inner+'</span>'}
  async function load(){
    var a=[];try{a=await ssLive()}catch(e){}
    a=a.filter(function(x){return x.live}).slice(0,60);
    if(!a.length){bar.hidden=true;sig="";return}
    var s=JSON.stringify(a.map(function(x){return[x.id,x.hs,x.as,x.status]}));
    if(s===sig)return;sig=s;
    var h=a.map(item).join("");
    bar.innerHTML='<div class="tk-b"><i></i>EN DIRECT</div><div class="tk-w"><div class="tk-t">'+h+h+'</div></div>';
    bar.querySelector(".tk-t").style.setProperty("--tkd",Math.max(30,a.length*5)+"s");
    bar.hidden=false}
  load();setInterval(function(){if(!document.hidden)load()},60000);
})();
