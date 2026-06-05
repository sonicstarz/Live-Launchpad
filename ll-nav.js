/* Live Launchpad — shared header + footer + nav (single source of truth).
 *
 * Replaces the old per-page inline nav builders, which had drifted into ~5
 * variants. This is INFORMATION ARCHITECTURE ONLY: it reuses the existing
 * .nav / .nav-links / .brand / .theme-btn classes and CSS variables already
 * defined on every page. The only CSS this injects is the minimal positioning
 * needed for the submenu dropdowns — and that mirrors the existing mobile
 * .nav-links panel (same --panel background, --line border, radius, shadow),
 * so it matches the current look rather than introducing a new style.
 *
 * Each page keeps its <div id="site-header">, <div id="site-footer"> and
 * (optional) <div id="stars"> mounts; this script fills them.
 */
(function(){
  var root=document.documentElement;
  function setTheme(t){ root.setAttribute('data-theme',t); var b=document.querySelector('.theme-btn'); if(b)b.textContent=(t==='light'?'☀':'☾'); }
  window.__toggleTheme=function(){ setTheme(root.getAttribute('data-theme')==='light'?'dark':'light'); };
  window.__toggleNav=function(){ var n=document.querySelector('.nav-links'); if(n)n.classList.toggle('open'); };
  if(!root.getAttribute('data-theme')) setTheme('dark');

  /* ---- 5 top-level destinations, with children ---- */
  var NAV=[
    {href:'schedule.html', label:'Schedule', kids:[
      {href:'calendar.html',  label:'Calendar'},
      {href:'watch.html',     label:'Watch Live'}
    ]},
    {href:'news.html', label:'News', kids:[
      {href:'news.html',         label:'Articles'},
      {href:'news.html#videos',  label:'Videos'}
    ]},
    {href:'games.html', label:'Arcade', kids:[
      {href:'play.html', label:'Quiz'}
    ]},
    {href:'learn-hub.html', label:'Learn', kids:[
      {href:'learn.html',             label:'Learning Center'},
      {href:'explorer.html',          label:'Rockets'},
      {href:'rocket-db.html',         label:'Rocket Database (soon)'},
      {href:'index-reliability.html', label:'The Index'},
      {href:'development.html',       label:'In Development'}
    ]},
    {href:'about.html', label:'About'}
  ];
  /* which top-level a page belongs to, for the active highlight */
  var SECTION={
    'schedule.html':'schedule.html','calendar.html':'schedule.html','watch.html':'schedule.html',
    'news.html':'news.html',
    'games.html':'games.html','play.html':'games.html',
    'learn-hub.html':'learn-hub.html','learn.html':'learn-hub.html','explorer.html':'learn-hub.html',
    'rocket-db.html':'learn-hub.html','index-reliability.html':'learn-hub.html','development.html':'learn-hub.html',
    'about.html':'about.html'
  };

  var page=(location.pathname.split('/').pop()||'index.html'); if(!page) page='index.html';
  var activeTop=SECTION[page]||'';

  function childActive(it){
    var p=it.href.split('#')[0]; if(p!==page) return false;
    var hash=it.href.indexOf('#')>=0 ? '#'+it.href.split('#')[1] : '';
    return hash ? (location.hash===hash) : !location.hash;
  }

  var navlinks=NAV.map(function(top){
    if(!top.kids){
      var a=(top.href===page)?' class="active"':'';
      return '<a href="'+top.href+'"'+a+'>'+top.label+'</a>';
    }
    var topCls='nav-top'+(top.href===activeTop?' active':'');
    var kids=top.kids.map(function(k){
      var kc=childActive(k)?' class="active"':'';
      return '<a href="'+k.href+'"'+kc+'>'+k.label+'</a>';
    }).join('');
    return '<span class="nav-group">'
      +'<a href="'+top.href+'" class="'+topCls+'">'+top.label+' ▾</a>'
      +'<span class="nav-sub">'+kids+'</span>'
      +'</span>';
  }).join('');

  var header=''
    +'<nav class="nav"><div class="nav-inner">'
    +'<a class="brand" href="index.html">🚀 <span class="blink"></span> LIVE LAUNCHPAD</a>'
    +'<div class="nav-links">'+navlinks+'</div>'
    +'<button class="nav-toggle" onclick="__toggleNav()" aria-label="Menu">☰</button>'
    +'<button class="theme-btn" onclick="__toggleTheme()" aria-label="Toggle theme">☾</button>'
    +'</div></nav>';

  var footer=''
    +'<footer><div class="wrap">'
    +'<b>LIVE LAUNCHPAD</b> — mission control for the orbital era.<br>'
    +'An independent project · <a href="studio.html">Studio</a> · <a href="quiz-host.html">Quiz Host</a> · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a>'
    +'</div></footer>';

  /* minimal submenu CSS — mirrors the existing mobile .nav-links panel, using existing vars */
  if(!document.getElementById('ll-nav-css')){
    var st=document.createElement('style'); st.id='ll-nav-css';
    st.textContent=
      '.nav-group{position:relative;display:inline-flex;align-items:center}'
      +'.nav-sub{display:none;position:absolute;top:calc(100% + 8px);left:0;min-width:184px;flex-direction:column;gap:2px;'
        +'background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px;box-shadow:0 16px 40px rgba(0,0,0,.45);z-index:70}'
      +'.nav-group:hover>.nav-sub,.nav-group:focus-within>.nav-sub{display:flex}'
      +'.nav-sub a{white-space:nowrap}'
      +'@media(max-width:860px){'
        +'.nav-group{display:block}'
        +'.nav-sub{display:flex;position:static;box-shadow:none;border:0;background:none;border-radius:0;padding:2px 0 6px 14px;min-width:0}'
      +'}';
    (document.head||document.documentElement).appendChild(st);
  }

  var mh=document.getElementById('site-header'); if(mh) mh.outerHTML=header;
  var mf=document.getElementById('site-footer'); if(mf) mf.outerHTML=footer;

  var t=root.getAttribute('data-theme')||'dark';
  var tb=document.querySelector('.theme-btn'); if(tb) tb.textContent=(t==='light'?'☀':'☾');

  /* decorative starfield, only if a #stars mount exists and is empty */
  var c=document.getElementById('stars');
  if(c && !c.childNodes.length){
    var h=''; for(var i=0;i<80;i++){ var s=(Math.random()*2+.5).toFixed(1),d=(Math.random()*3+2).toFixed(1),dl=(Math.random()*4).toFixed(1);
      h+='<div class="star" style="left:'+(Math.random()*100).toFixed(2)+'%;top:'+(Math.random()*100).toFixed(2)+'%;width:'+s+'px;height:'+s+'px;animation-duration:'+d+'s;animation-delay:'+dl+'s"></div>'; }
    c.innerHTML=h;
  }
})();
