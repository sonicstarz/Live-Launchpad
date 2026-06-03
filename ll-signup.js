/* ll-signup.js — reusable launch-alerts signup → Supabase.
 *
 * Mark up any form like:
 *   <form data-ll-signup="home">
 *     <input type="text" name="hp" tabindex="-1" autocomplete="off" style="display:none">  (honeypot)
 *     <input type="email" name="email" required>
 *     <button type="submit">Subscribe</button>
 *   </form>
 *   <div data-ll-signup-msg></div>
 *   <script src="ll-signup.js" defer></script>
 *
 * Inserts {email, source} into the Supabase `subscribers` table with the public
 * anon key (insert-only RLS — the list isn't readable from the browser).
 */
(function () {
  var REST = 'https://oshizhnblnsrjutxyxxg.supabase.co/rest/v1/subscribers';
  var KEY = 'sb_publishable_QMaIcq2mO6q5qbE-5gT14A_Q-2dKT5r';
  var forms = [].slice.call(document.querySelectorAll('form[data-ll-signup]'));
  forms.forEach(function (f) {
    var msg = (f.parentNode && f.parentNode.querySelector('[data-ll-signup-msg]')) || document.querySelector('[data-ll-signup-msg]');
    function setMsg(t, c) { if (msg) { msg.textContent = t; msg.style.color = c; } }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = f.querySelector('input[name="hp"]');
      if (hp && hp.value) { setMsg('✓ You’re on the list — see you at the next launch.', 'var(--green,#3ddc84)'); return; } // bot
      var input = f.querySelector('input[type="email"]');
      var email = (input && input.value || '').trim();
      if (!email || email.indexOf('@') < 1) { setMsg('Enter a valid email.', '#ff5d5d'); return; }
      setMsg('Sending…', 'var(--txt3,#586780)');
      fetch(REST + '?on_conflict=email', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'content-type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify([{ email: email, source: f.getAttribute('data-ll-signup') || 'site' }])
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        f.reset();
        setMsg('✓ You’re on the list — see you at the next launch.', 'var(--green,#3ddc84)');
      }).catch(function () {
        setMsg('That didn’t send — please try again in a moment.', '#ff5d5d');
      });
    });
  });
})();
