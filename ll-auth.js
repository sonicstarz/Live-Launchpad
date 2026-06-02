// ll-auth.js — Live Launchpad access gate (Supabase Auth).
//
// Drop on any page to put it behind a "Coming Soon" splash. Two modes via
// window.LL_GATE.require:
//   'editor' (default) — only users with profiles.role='editor' get in (e.g. studio.html)
//   'auth'             — any logged-in user gets in (e.g. the members preview of learn.html)
// Set window.LL_GATE.allowSignup = true to show a "Create free account" option.
//
// This is a soft "curtain": page content is hidden on the client. Fine for
// work-in-progress / members-preview; NOT for secrets (those must come from the
// database with their own RLS, not be placed in the page's HTML).
//
// On the page:
//   <div id="ll-gate-content" hidden> ...real page content... </div>
//   <script>window.LL_GATE = { title:'…', tagline:'…', require:'auth', allowSignup:true };</script>
//   <script type="module" src="ll-auth.js"></script>
//
// When a user passes the gate, ll-auth calls (if defined):
//   window.LL_ON_READY(sb, user, role)   — for ANY passing user
//   window.LL_ON_EDITOR(sb, user)        — only when role === 'editor'
// and sets window.LLAuth = { sb, user, role }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://oshizhnblnsrjutxyxxg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QMaIcq2mO6q5qbE-5gT14A_Q-2dKT5r';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const cfg = window.LL_GATE || {};
const TITLE = cfg.title || 'COMING SOON';
const TAGLINE = cfg.tagline || 'This page is under construction.';
const REQUIRE = cfg.require || 'editor';      // 'editor' | 'auth'
const ALLOW_SIGNUP = !!cfg.allowSignup;

const el = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const passes = (role) => REQUIRE === 'auth' ? true : role === 'editor';

/* ---------- styles ---------- */
const CSS = `
.llg-splash{position:fixed;inset:0;z-index:9000;background:#04060c;color:#e9eef6;display:flex;
  flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:'Space Mono',monospace}
.llg-brand{position:absolute;top:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;
  text-decoration:none;color:#8b9bb4;font-size:13px;letter-spacing:.04em;white-space:nowrap}
.llg-brand b{color:#e9eef6}
.llg-brand:hover{color:#ffb627}
.llg-pill{font-family:'Press Start 2P',monospace;font-size:9px;letter-spacing:1px;color:#ffb627;
  background:rgba(255,182,39,.12);border:1px solid rgba(255,182,39,.3);border-radius:6px;padding:7px 12px;margin-bottom:22px}
.llg-title{font-family:'Press Start 2P',monospace;font-size:clamp(17px,4vw,30px);color:#ffb627;line-height:1.45;
  text-shadow:0 0 18px rgba(255,182,39,.4);margin-bottom:18px}
.llg-tag{color:#8b9bb4;font-size:14px;max-width:460px;line-height:1.6;margin-bottom:26px}
.llg-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.llg-actionbtn{background:none;border:1px solid #2a3650;color:#e9eef6;border-radius:9px;
  font-family:'Space Mono',monospace;font-size:13px;padding:10px 16px;cursor:pointer}
.llg-actionbtn:hover{border-color:#ffb627;color:#ffb627}
.llg-actionbtn.primary{background:#ffb627;color:#1a1205;border-color:#ffb627;font-weight:700}
.llg-form{display:none;flex-direction:column;gap:10px;width:100%;max-width:300px;margin-top:18px}
.llg-form.show{display:flex}
.llg-formhead{font-family:'Press Start 2P',monospace;font-size:10px;color:#ffb627;margin-bottom:4px}
.llg-form input{background:#0a0f18;border:1px solid #2a3650;border-radius:9px;color:#e9eef6;
  font-family:'Space Mono',monospace;font-size:14px;padding:12px 14px;outline:none}
.llg-form input:focus{border-color:#ffb627}
.llg-form .submit{background:#ffb627;color:#1a1205;border:none;border-radius:9px;cursor:pointer;
  font-family:'Space Mono',monospace;font-weight:700;font-size:13px;padding:12px;text-transform:uppercase;letter-spacing:.05em}
.llg-form .submit:disabled{opacity:.5;cursor:default}
.llg-switch{background:none;border:none;color:#586780;font-family:'Space Mono',monospace;font-size:12px;
  cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.llg-switch:hover{color:#ffb627}
.llg-msg{font-size:12px;min-height:15px;color:#ff5d5d}
.llg-bar{position:fixed;bottom:0;left:0;right:0;z-index:8000;background:rgba(255,182,39,.1);
  border-top:1px solid rgba(255,182,39,.25);color:#ffb627;font-family:'Space Mono',monospace;font-size:12px;
  display:flex;align-items:center;justify-content:center;gap:14px;padding:8px 12px}
.llg-bar button{background:none;border:1px solid rgba(255,182,39,.4);color:#ffb627;border-radius:6px;
  padding:3px 10px;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer}
.llg-bar button:hover{background:rgba(255,182,39,.15)}
`;
function injectCSS() { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

/* ---------- splash + auth UI ---------- */
let splashNode = null;
let formMode = 'login'; // 'login' | 'signup'

function actionsHTML() {
  if (REQUIRE === 'editor' && !ALLOW_SIGNUP) {
    return `<button class="llg-actionbtn" data-mode="login">Editor login</button>`;
  }
  let h = `<button class="llg-actionbtn primary" data-mode="login">Log in</button>`;
  if (ALLOW_SIGNUP) h += `<button class="llg-actionbtn" data-mode="signup">Create free account</button>`;
  return h;
}

function showSplash() {
  if (splashNode) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="llg-splash">
    <a class="llg-brand" href="index.html">🚀 <b>LIVE LAUNCHPAD</b></a>
    <div class="llg-pill">● COMING SOON</div>
    <div class="llg-title">${esc(TITLE)}</div>
    <div class="llg-tag">${esc(TAGLINE)}</div>
    <div class="llg-actions">${actionsHTML()}</div>
    <form class="llg-form" id="llg-form" autocomplete="on">
      <div class="llg-formhead" id="llg-formhead">Log in</div>
      <input type="email" id="llg-email" placeholder="Email" autocomplete="username" required>
      <input type="password" id="llg-pass" placeholder="Password" autocomplete="current-password" required>
      <button type="submit" class="submit" id="llg-submit">Log in</button>
      <div class="llg-msg" id="llg-msg"></div>
      ${ALLOW_SIGNUP ? `<button type="button" class="llg-switch" id="llg-switch"></button>` : ''}
    </form>
  </div>`;
  splashNode = wrap.firstElementChild;
  document.body.appendChild(splashNode);
  splashNode.querySelectorAll('[data-mode]').forEach((b) => {
    b.onclick = () => showForm(b.dataset.mode);
  });
  el('llg-form').onsubmit = onSubmit;
  if (ALLOW_SIGNUP) el('llg-switch').onclick = () => showForm(formMode === 'login' ? 'signup' : 'login');
}
function showForm(mode) {
  formMode = mode;
  el('llg-form').classList.add('show');
  el('llg-formhead').textContent = mode === 'signup' ? 'Create your free account' : 'Log in';
  el('llg-submit').textContent = mode === 'signup' ? 'Sign up' : 'Log in';
  el('llg-pass').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
  el('llg-msg').textContent = '';
  if (ALLOW_SIGNUP) el('llg-switch').textContent = mode === 'signup' ? 'Have an account? Log in' : 'Need an account? Create one';
  el('llg-email').focus();
}
function removeSplash() { if (splashNode) { splashNode.remove(); splashNode = null; } }

function reveal(user, role) {
  removeSplash();
  const content = el('ll-gate-content');
  if (content) content.hidden = false;
  const bar = document.createElement('div');
  bar.className = 'llg-bar';
  const label = role === 'editor' ? `✎ Editor mode — ${esc(user.email || '')}` : `Signed in — ${esc(user.email || '')}`;
  bar.innerHTML = `<span>${label}</span><button id="llg-logout">Log out</button>`;
  document.body.appendChild(bar);
  el('llg-logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };

  window.LLAuth = { sb, user, role };
  if (typeof window.LL_ON_READY === 'function') { try { window.LL_ON_READY(sb, user, role); } catch (e) { console.error(e); } }
  if (role === 'editor' && typeof window.LL_ON_EDITOR === 'function') { try { window.LL_ON_EDITOR(sb, user); } catch (e) { console.error(e); } }
}

async function roleOf(userId) {
  const { data } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle();
  return (data && data.role) || 'viewer';
}

async function onSubmit(e) {
  e.preventDefault();
  const email = el('llg-email').value.trim();
  const password = el('llg-pass').value;
  const btn = el('llg-submit'), msg = el('llg-msg');
  btn.disabled = true; msg.style.color = '#8b9bb4';
  msg.textContent = formMode === 'signup' ? 'Creating account…' : 'Checking…';

  if (formMode === 'signup') {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) { msg.style.color = '#ff5d5d'; msg.textContent = error.message; btn.disabled = false; return; }
    if (data.session && data.user) {
      const role = await roleOf(data.user.id);
      reveal(data.user, role);
    } else {
      msg.style.color = '#3ddc84';
      msg.textContent = 'Account created — check your email to confirm, then log in.';
      btn.disabled = false;
      showForm('login');
    }
    return;
  }

  // login
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { msg.style.color = '#ff5d5d'; msg.textContent = error.message || 'Login failed'; btn.disabled = false; return; }
  const role = await roleOf(data.user.id);
  if (passes(role)) {
    reveal(data.user, role);
  } else {
    msg.style.color = '#ff5d5d';
    msg.textContent = 'This account does not have access.';
    await sb.auth.signOut();
    btn.disabled = false;
  }
}

async function init() {
  injectCSS();
  const content = el('ll-gate-content');
  if (content) content.hidden = true;
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    const role = await roleOf(session.user.id);
    if (passes(role)) { reveal(session.user, role); return; }
  }
  showSplash();
}
init();
