/* ll-countdown.js — reusable "next launch" countdown widget.
 *
 * Drop-in: put an empty element anywhere and load this script (defer):
 *     <div data-ll-countdown></div>
 *     <script src="ll-countdown.js" defer></script>
 *
 * It self-styles (using the site's CSS variables, with hard fallbacks so it
 * works on any page), pulls the soonest launch from the Launch Library 2 proxy
 * (/.netlify/functions/launches), ticks every second, flips T-minus → T+ at
 * liftoff, and RE-FETCHES every 60s so it tracks scrubs / Go → Hold → TBD.
 *
 * Optional attributes:
 *   data-label="Next launch"      eyebrow text
 *   data-watch="watch.html"       Watch-live link target
 */
(function () {
  var MOUNTS = [].slice.call(document.querySelectorAll('[data-ll-countdown]'));
  if (!MOUNTS.length) return;

  var state = { launch: null, status: null, err: false, loaded: false };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]); }); };

  /* ---------- styles (scoped, var-driven, with fallbacks) ---------- */
  function injectCSS() {
    if (document.getElementById('llc-style')) return;
    var s = document.createElement('style'); s.id = 'llc-style';
    s.textContent = [
      '.llc-card{position:relative;background:var(--panel,#111827);border:1px solid var(--line,#1e2738);border-radius:16px;padding:24px 26px;overflow:hidden}',
      '.llc-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--amber,#ffb627);opacity:.85}',
      '.llc-go::before{background:var(--green,#3ddc84)}',
      '.llc-bad::before{background:#ff5d5d}',
      '.llc-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px}',
      '.llc-eyebrow{font-family:var(--mono,"Space Mono",monospace);font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--txt3,#586780)}',
      '.llc-pill{font-family:var(--mono,"Space Mono",monospace);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:6px;background:rgba(255,182,39,.14);color:var(--amber,#ffb627)}',
      '.llc-pill.go{background:rgba(61,220,132,.16);color:var(--green,#3ddc84)}',
      '.llc-pill.bad{background:rgba(255,93,93,.16);color:#ff7a7a}',
      '.llc-name{font-size:22px;font-weight:700;line-height:1.15;color:var(--txt,#e9eef6)}',
      '.llc-meta{font-size:13px;color:var(--txt2,#8b9bb4);margin:4px 0 18px}',
      '.llc-clock{display:flex;gap:18px;flex-wrap:wrap}',
      '.llc-u{text-align:center;min-width:52px}',
      '.llc-num{font-family:var(--mono,"Space Mono",monospace);font-size:clamp(30px,6vw,40px);font-weight:700;line-height:1;color:var(--amber,#ffb627);font-variant-numeric:tabular-nums}',
      '.llc-tplus .llc-num{color:var(--green,#3ddc84)}',
      '.llc-cap{font-family:var(--mono,"Space Mono",monospace);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--txt3,#586780);margin-top:7px}',
      '.llc-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:18px}',
      '.llc-watch{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono,"Space Mono",monospace);font-size:12px;font-weight:700;text-decoration:none;background:var(--amber,#ffb627);color:#1a1205;padding:8px 14px;border-radius:9px}',
      '.llc-watch.live{background:var(--green,#3ddc84);color:#04130a}',
      '.llc-link{font-family:var(--mono,"Space Mono",monospace);font-size:12px;color:var(--txt2,#8b9bb4);text-decoration:none}',
      '.llc-link:hover{color:var(--amber,#ffb627)}',
      '.llc-src{font-family:var(--mono,"Space Mono",monospace);font-size:10px;color:var(--txt3,#586780);margin-left:auto}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ---------- status → label/colour ---------- */
  function statusInfo(s) {
    var t = (s || '').toLowerCase();
    if (/fail/.test(t)) return { cls: 'bad', label: 'Failure' };
    if (/hold/.test(t)) return { cls: 'bad', label: 'Hold' };
    if (/flight/.test(t)) return { cls: 'go', label: 'In Flight' };
    if (/success|deployed/.test(t)) return { cls: 'go', label: 'Success' };
    if (/\bgo\b|go for/.test(t)) return { cls: 'go', label: 'Go' };
    if (/confirm|tbc/.test(t)) return { cls: 'wait', label: 'TBC' };
    if (/determin|tbd|^$/.test(t)) return { cls: 'wait', label: 'TBD' };
    return { cls: 'wait', label: s };
  }

  function pickLaunch(results) {
    var now = Date.now();
    var sorted = (results || []).filter(function (l) { return l && l.net; })
      .sort(function (a, b) { return new Date(a.net) - new Date(b.net); });
    for (var i = 0; i < sorted.length; i++) {
      if (new Date(sorted[i].net).getTime() > now - 3 * 3600 * 1000) return sorted[i]; // upcoming, or just-launched (<3h)
    }
    return sorted[sorted.length - 1] || null;
  }

  /* ---------- render ---------- */
  function render() {
    MOUNTS.forEach(function (el) {
      if (!state.loaded) {
        el.innerHTML = '<div class="llc-card"><div class="llc-eyebrow">◉ Next launch</div><div class="llc-name" style="margin-top:8px">Loading next launch…</div></div>';
        return;
      }
      if (state.err || !state.launch) {
        el.innerHTML = '<div class="llc-card"><div class="llc-eyebrow">◉ Next launch</div><div class="llc-name" style="margin-top:8px">Schedule unavailable</div><div class="llc-meta">Couldn’t reach the live feed — retrying.</div></div>';
        return;
      }
      var L = state.launch, st = state.status;
      var watch = (L.webcastLive || (L.vidURLs && L.vidURLs.length)) ? el.getAttribute('data-watch') || 'watch.html' : null;
      var label = el.getAttribute('data-label') || 'Next launch';
      var meta = [L.provider, L.pad, L.location].filter(Boolean).map(esc).join(' · ') || '—';
      el.innerHTML =
        '<div class="llc-card llc-' + st.cls + '">' +
        '<div class="llc-top"><span class="llc-eyebrow">◉ ' + esc(label) + ' — <span class="llc-when">T-minus</span></span>' +
        '<span class="llc-pill ' + st.cls + '">' + esc(st.label) + '</span></div>' +
        '<div class="llc-name">' + esc(L.name || L.mission || 'Upcoming launch') + '</div>' +
        '<div class="llc-meta">' + meta + '</div>' +
        '<div class="llc-clock">' +
        '<div class="llc-u"><div class="llc-num llc-d">--</div><div class="llc-cap">days</div></div>' +
        '<div class="llc-u"><div class="llc-num llc-h">--</div><div class="llc-cap">hrs</div></div>' +
        '<div class="llc-u"><div class="llc-num llc-m">--</div><div class="llc-cap">min</div></div>' +
        '<div class="llc-u"><div class="llc-num llc-s">--</div><div class="llc-cap">sec</div></div>' +
        '</div>' +
        '<div class="llc-foot">' +
        (watch ? '<a class="llc-watch' + (L.webcastLive ? ' live' : '') + '" href="' + esc(watch) + '">▶ Watch live</a>' : '') +
        '<a class="llc-link" href="schedule.html">Full schedule →</a>' +
        '<span class="llc-src">Live · Launch Library 2</span>' +
        '</div></div>';
    });
    tick();
  }

  function tick() {
    if (!state.launch || !state.launch.net) return;
    var diff = new Date(state.launch.net).getTime() - Date.now();
    var tplus = diff <= 0;
    var s = Math.floor(Math.abs(diff) / 1000);
    var d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, ss = s % 60;
    MOUNTS.forEach(function (el) {
      var card = el.querySelector('.llc-card'); if (!card) return;
      var q = function (c) { return el.querySelector('.' + c); };
      if (q('llc-d')) { q('llc-d').textContent = pad(d); q('llc-h').textContent = pad(h); q('llc-m').textContent = pad(m); q('llc-s').textContent = pad(ss); }
      var when = el.querySelector('.llc-when'); if (when) when.textContent = tplus ? 'T-plus' : 'T-minus';
      card.classList.toggle('llc-tplus', tplus);
    });
  }

  function fetchLaunch() {
    return fetch('/.netlify/functions/launches?kind=upcoming&limit=16')
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (data) {
        var L = pickLaunch(data.results);
        state.launch = L; state.status = statusInfo(L && L.status); state.err = !L; state.loaded = true;
        render();
      })
      .catch(function () { state.err = !state.launch; state.loaded = true; render(); });
  }

  injectCSS();
  render();            // skeleton
  fetchLaunch();       // first data
  setInterval(tick, 1000);
  setInterval(fetchLaunch, 60000);   // track scrubs / status changes
})();
