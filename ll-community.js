/* ll-community.js — reusable community-links block.
 *
 * Renders into any <div data-ll-community></div>. EDIT the CHANNELS list below as
 * you create each account: set its `url`. A null url shows a dimmed "soon" chip;
 * the moment a url is filled in, that chip becomes a real link. Single source of
 * truth, works on any page.
 */
(function () {
  var CHANNELS = [
    { name: 'Discord',   ico: '💬', url: null },
    { name: 'X',         ico: '𝕏',  url: null },
    { name: 'YouTube',   ico: '▶',  url: null },
    { name: 'Instagram', ico: '📷', url: null },
    { name: 'TikTok',    ico: '🎵', url: null },
    { name: 'Reddit',    ico: '👽', url: null }
  ];
  var mounts = [].slice.call(document.querySelectorAll('[data-ll-community]'));
  if (!mounts.length) return;
  var base = 'display:inline-flex;align-items:center;gap:7px;font-family:var(--mono,monospace);font-size:12px;padding:9px 13px;border-radius:9px;border:1px solid var(--line2,#2a3650);';
  var html = CHANNELS.map(function (c) {
    if (c.url) return '<a href="' + c.url + '" target="_blank" rel="noopener" style="' + base + 'color:var(--txt,#e9eef6);text-decoration:none">' + c.ico + ' ' + c.name + ' ↗</a>';
    return '<span title="Coming soon" style="' + base + 'color:var(--txt3,#586780)">' + c.ico + ' ' + c.name + ' · soon</span>';
  }).join('');
  mounts.forEach(function (m) { m.innerHTML = html; });
})();
