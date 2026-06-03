/* ll-present.js — reusable "Present" pop-out (classroom / projector mode).
 *
 * Opens a piece of content in its own chromeless window the teacher can drag to a
 * second screen and fullscreen — PowerPoint-presenter style.
 *
 * Use either:
 *   window.LLPresent.open('present.html?type=video&id=…')      // imperative
 *   <a data-ll-present="explorer.html?present=1">⤢ Present</a>  // declarative
 *
 * Progressive enhancement: on browsers with the Window Management API + a second
 * display, the window opens positioned on the external screen; otherwise it opens
 * as a normal pop-up the teacher drags over and fullscreens.
 */
(function () {
  function popup(url, features) {
    var w = window.open(url, 'llpresent', features || 'popup,width=1280,height=800,menubar=no,toolbar=no,location=no,status=no');
    if (!w) { alert('Pop-up blocked — allow pop-ups for Live Launchpad, then click Present again.'); return null; }
    try { w.focus(); } catch (e) {}
    return w;
  }
  function open(url) {
    if (!url) return;
    if (window.getScreenDetails) {
      window.getScreenDetails().then(function (sd) {
        var ext = null, list = sd.screens || [];
        for (var i = 0; i < list.length; i++) { if (list[i] !== sd.currentScreen) { ext = list[i]; break; } }
        if (ext) {
          var L = ext.availLeft != null ? ext.availLeft : (ext.left || 0);
          var T = ext.availTop != null ? ext.availTop : (ext.top || 0);
          var W = ext.availWidth || ext.width || 1280;
          var H = ext.availHeight || ext.height || 800;
          popup(url, 'popup,left=' + L + ',top=' + T + ',width=' + W + ',height=' + H);
        } else { popup(url); }
      }).catch(function () { popup(url); });
    } else { popup(url); }
  }
  function wire(root) {
    (root || document).querySelectorAll('[data-ll-present]').forEach(function (el) {
      if (el._llp) return; el._llp = 1;
      el.addEventListener('click', function (e) { e.preventDefault(); open(el.getAttribute('data-ll-present')); });
    });
  }
  window.LLPresent = { open: open, wire: wire };
  if (document.readyState !== 'loading') wire(); else document.addEventListener('DOMContentLoaded', function () { wire(); });
})();
