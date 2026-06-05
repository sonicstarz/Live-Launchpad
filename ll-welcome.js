/* Live Launchpad — first-visit welcome overlay.
 * Shows once per browser (localStorage), introduces what the site is, who it's
 * for, and the main sections. Reuses the existing CSS variables so it matches
 * the dark mission-control theme on every page. Skips focused/editor/legal
 * screens. Dismiss via the CTA, the ✕, the backdrop, or Esc.
 */
(function(){
  var KEY='ll_welcome_v1';
  try{ if(localStorage.getItem(KEY)) return; }catch(e){}

  var page=(location.pathname.split('/').pop()||'index.html');
  var SKIP=['studio.html','quiz-host.html','play.html','present.html','privacy.html','terms.html'];
  if(SKIP.indexOf(page)>=0) return;
  if(new URLSearchParams(location.search).get('present')) return; // never over a projector pop-out

  function seen(){ try{ localStorage.setItem(KEY,'1'); }catch(e){} }
  function dismiss(){ seen(); var o=document.getElementById('ll-welcome'); if(o){ o.classList.remove('show'); setTimeout(function(){ if(o.parentNode)o.parentNode.removeChild(o); },240); } document.removeEventListener('keydown',onKey); }
  function onKey(e){ if(e.key==='Escape')dismiss(); }

  var FEATS=[
    ['📅','Schedule','Next launches, countdowns & watch-live links.','schedule.html'],
    ['📰','News','Breaking headlines plus curated space videos.','news.html'],
    ['🎮','Arcade','Rocket mini-games and a live classroom quiz.','games.html'],
    ['🎓','Learn','Free courses, a 3D rocket explorer & the reliability Index.','learn-hub.html'],
    ['✉️','Launch alerts','Drop your email for a heads-up before liftoffs.','about.html']
  ];

  function build(){
    if(document.getElementById('ll-welcome')) return;
    if(!document.getElementById('ll-welcome-css')){
      var st=document.createElement('style'); st.id='ll-welcome-css';
      st.textContent=
        /* display:flex + overflow + card margin:auto = centred when it fits, but
           top-anchored and fully scrollable when taller than the screen (mobile). */
        '.ll-w-overlay{position:fixed;inset:0;z-index:500;display:flex;padding:20px;'
          +'background:rgba(4,6,12,.78);backdrop-filter:blur(6px);opacity:0;transition:opacity .24s;'
          +'overflow-y:auto;-webkit-overflow-scrolling:touch}'
        +'.ll-w-overlay.show{opacity:1}'
        +'.ll-w-card{position:relative;width:560px;max-width:100%;margin:auto;background:var(--panel,#111827);border:1px solid var(--line2,#2a3650);'
          +'border-radius:16px;padding:30px;box-shadow:0 30px 80px rgba(0,0,0,.6);font-family:var(--sans,sans-serif);'
          +'transform:translateY(14px) scale(.985);transition:transform .24s}'
        +'.ll-w-overlay.show .ll-w-card{transform:none}'
        +'.ll-w-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--amber,#ffb627);border-radius:16px 16px 0 0}'
        +'.ll-w-x{position:absolute;top:14px;right:14px;background:var(--panel2,#161f30);border:1px solid var(--line2,#2a3650);'
          +'color:var(--txt2,#8b9bb4);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:13px}'
        +'.ll-w-x:hover{color:var(--amber,#ffb627);border-color:var(--amber,#ffb627)}'
        +'.ll-w-eyebrow{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--amber,#ffb627)}'
        +'.ll-w-h{font-size:26px;font-weight:900;letter-spacing:-.02em;margin:6px 0 8px;color:var(--txt,#e9eef6)}'
        +'.ll-w-sub{color:var(--txt2,#8b9bb4);font-size:14.5px;line-height:1.6;margin-bottom:12px}'
        +'.ll-w-who{font-size:13.5px;color:var(--txt2,#8b9bb4);line-height:1.55;background:var(--panel2,#161f30);'
          +'border:1px solid var(--line,#1e2738);border-radius:10px;padding:11px 13px;margin-bottom:16px}'
        +'.ll-w-who b{color:var(--txt,#e9eef6)}'
        +'.ll-w-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}'
        +'.ll-w-feat{display:flex;gap:10px;align-items:flex-start;background:var(--panel2,#161f30);border:1px solid var(--line,#1e2738);'
          +'border-radius:10px;padding:11px 12px;text-decoration:none;transition:border-color .15s}'
        +'.ll-w-feat:hover{border-color:var(--amber,#ffb627)}'
        +'.ll-w-feat .ic{font-size:18px;line-height:1.2;flex-shrink:0}'
        +'.ll-w-feat b{display:block;font-size:13px;color:var(--txt,#e9eef6);font-weight:700}'
        +'.ll-w-feat span{font-size:11.5px;color:var(--txt3,#586780);line-height:1.4}'
        +'.ll-w-cta{width:100%;background:var(--amber,#ffb627);color:#1a1205;border:none;border-radius:11px;'
          +'font-family:var(--mono,monospace);font-weight:700;font-size:14px;letter-spacing:.03em;padding:14px;cursor:pointer}'
        +'.ll-w-cta:hover{box-shadow:0 0 0 3px rgba(255,182,39,.2)}'
        +'.ll-w-foot{text-align:center;font-family:var(--mono,monospace);font-size:10.5px;color:var(--txt3,#586780);margin-top:10px}'
        +'@media(max-width:560px){'
          +'.ll-w-overlay{padding:12px}'
          +'.ll-w-card{padding:20px 18px;border-radius:14px}'
          +'.ll-w-h{font-size:21px}'
          +'.ll-w-sub{font-size:13.5px}'
          +'.ll-w-who{font-size:12.5px;margin-bottom:14px}'
          +'.ll-w-grid{grid-template-columns:1fr;gap:8px;margin-bottom:16px}'
          +'.ll-w-feat{padding:10px 11px}'
          +'.ll-w-x{top:10px;right:10px;width:34px;height:34px}'
          +'.ll-w-cta{padding:15px}'
        +'}';
      (document.head||document.documentElement).appendChild(st);
    }

    var feats=FEATS.map(function(f){
      return '<a class="ll-w-feat" href="'+f[3]+'"><span class="ic">'+f[0]+'</span>'
        +'<span><b>'+f[1]+'</b><span>'+f[2]+'</span></span></a>';
    }).join('');

    var ov=document.createElement('div'); ov.id='ll-welcome'; ov.className='ll-w-overlay';
    ov.innerHTML=''
      +'<div class="ll-w-card" role="dialog" aria-modal="true" aria-label="Welcome to Live Launchpad">'
      +'<button class="ll-w-x" aria-label="Close">✕</button>'
      +'<div class="ll-w-eyebrow">🚀 First time here?</div>'
      +'<h2 class="ll-w-h">Welcome to Live Launchpad</h2>'
      +'<p class="ll-w-sub">Your mission control for the orbital era — live launch schedules, decades of reliability data, news as it breaks, a learning center, and a rocket-fueled arcade. The whole space age, in one dark, clutter-free dashboard.</p>'
      +'<div class="ll-w-who"><b>Who it’s for:</b> space fans, students &amp; classrooms, and anyone who wants to follow rockets without the noise. It’s free and independent — no account needed to explore.</div>'
      +'<div class="ll-w-grid">'+feats+'</div>'
      +'<button class="ll-w-cta">Start exploring →</button>'
      +'<div class="ll-w-foot">Everything is always one tap away in the top menu.</div>'
      +'</div>';
    document.body.appendChild(ov);

    ov.querySelector('.ll-w-x').onclick=dismiss;
    ov.querySelector('.ll-w-cta').onclick=dismiss;
    ov.addEventListener('click',function(e){ if(e.target===ov)dismiss(); });
    // clicking a feature navigates — mark as seen so it doesn't re-pop on the next page
    Array.prototype.forEach.call(ov.querySelectorAll('.ll-w-feat'),function(a){ a.addEventListener('click',seen); });
    document.addEventListener('keydown',onKey);
    requestAnimationFrame(function(){ ov.classList.add('show'); });
    var cta=ov.querySelector('.ll-w-cta'); if(cta) cta.focus();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
