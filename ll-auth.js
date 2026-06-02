// ll-auth.js — Live Launchpad editor gate (Supabase Auth).
//
// Drop this on any page to put it behind a "Coming Soon" splash that only
// logged-in EDITORS can pass. This is a soft "curtain": the page's content is
// hidden on the client. Good for work-in-progress pages. NOT for secrets —
// anything truly private must be stored in the database and fetched after login,
// not placed in the page's HTML.
//
// How to use on a page:
//   <div id="ll-gate-content" hidden> ...the real page content... </div>
//   <script>window.LL_GATE = { title:'LEARNING CENTER', tagline:'Opening soon.' };</script>
//   <script type="module" src="ll-auth.js"></script>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://oshizhnblnsrjutxyxxg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QMaIcq2mO6q5qbE-5gT14A_Q-2dKT5r';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const cfg = window.LL_GATE || {};
const TITLE = cfg.title || 'COMING SOON';
const TAGLINE = cfg.tagline || 'This page is under construction.';

const el = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

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
.llg-tag{color:#8b9bb4;font-size:14px;max-width:460px;line-height:1.6;margin-bottom:28px}
.llg-loginlink{background:none;border:none;color:#586780;font-family:'Space Mono',monospace;font-size:12px;
  cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.llg-loginlink:hover{color:#ffb627}
.llg-form{display:none;flex-direction:column;gap:10px;width:100%;max-width:280px;margin-top:14px}
.llg-form.show{display:flex}
.llg-form input{background:#0a0f18;border:1px solid #2a3650;border-radius:9px;color:#e9eef6;
  font-family:'Space Mono',monospace;font-size:14px;padding:12px 14px;outline:none}
.llg-form input:focus{border-color:#ffb627}
.llg-form button{background:#ffb627;color:#1a1205;border:none;border-radius:9px;cursor:pointer;
  font-family:'Space Mono',monospace;font-weight:700;font-size:13px;padding:12px;text-transform:uppercase;letter-spacing:.05em}
.llg-form button:disabled{opacity:.5;cursor:default}
.llg-msg{font-size:12px;min-height:15px;color:#ff5d5d}
.llg-bar{position:fixed;bottom:0;left:0;right:0;z-index:8000;background:rgba(255,182,39,.1);
  border-top:1px solid rgba(255,182,39,.25);color:#ffb627;font-family:'Space Mono',monospace;font-size:12px;
  display:flex;align-items:center;justify-content:center;gap:14px;padding:8px 12px}
.llg-bar button{background:none;border:1px solid rgba(255,182,39,.4);color:#ffb627;border-radius:6px;
  padding:3px 10px;font-family:'Space Mono',monospace;font-size:11px;cursor:pointer}
.llg-bar button:hover{background:rgba(255,182,39,.15)}
`;

function injectCSS() {
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ---------- splash + login UI ---------- */
let splashNode = null;
function showSplash() {
  if (splashNode) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="llg-splash">
    <a class="llg-brand" href="index.html">🚀 <b>LIVE LAUNCHPAD</b></a>
    <div class="llg-pill">● COMING SOON</div>
    <div class="llg-title">${esc(TITLE)}</div>
    <div class="llg-tag">${esc(TAGLINE)}</div>
    <button class="llg-loginlink" id="llg-toggle">Editor login</button>
    <form class="llg-form" id="llg-form" autocomplete="on">
      <input type="email" id="llg-email" placeholder="Email" autocomplete="username" required>
      <input type="password" id="llg-pass" placeholder="Password" autocomplete="current-password" required>
      <button type="submit" id="llg-submit">Log in</button>
      <div class="llg-msg" id="llg-msg"></div>
    </form>
  </div>`;
  splashNode = wrap.firstElementChild;
  document.body.appendChild(splashNode);
  el('llg-toggle').onclick = () => { el('llg-form').classList.add('show'); el('llg-email').focus(); };
  el('llg-form').onsubmit = onLogin;
}
function removeSplash() { if (splashNode) { splashNode.remove(); splashNode = null; } }

function reveal(user) {
  removeSplash();
  const content = el('ll-gate-content');
  if (content) content.hidden = false;
  const bar = document.createElement('div');
  bar.className = 'llg-bar';
  bar.innerHTML = `<span>✎ Editor mode — ${esc(user.email || '')}</span><button id="llg-logout">Log out</button>`;
  document.body.appendChild(bar);
  el('llg-logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };

  // Expose the authenticated client so editor tools (e.g. studio.html) can reuse the session.
  window.LLAuth = { sb, user };
  if (typeof window.LL_ON_EDITOR === 'function') {
    try { window.LL_ON_EDITOR(sb, user); } catch (err) { console.error(err); }
  }
}

async function roleOf(userId) {
  const { data } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data && data.role;
}

async function onLogin(e) {
  e.preventDefault();
  const email = el('llg-email').value.trim();
  const password = el('llg-pass').value;
  const btn = el('llg-submit'), msg = el('llg-msg');
  btn.disabled = true; msg.style.color = '#8b9bb4'; msg.textContent = 'Checking…';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { msg.style.color = '#ff5d5d'; msg.textContent = error.message || 'Login failed'; btn.disabled = false; return; }
  const role = await roleOf(data.user.id);
  if (role === 'editor') {
    reveal(data.user);
  } else {
    msg.style.color = '#ff5d5d';
    msg.textContent = 'This account is not an editor.';
    await sb.auth.signOut();
    btn.disabled = false;
  }
}

async function init() {
  injectCSS();
  const content = el('ll-gate-content');
  if (content) content.hidden = true; // keep hidden until we confirm editor
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    const role = await roleOf(session.user.id);
    if (role === 'editor') { reveal(session.user); return; }
  }
  showSplash();
}
init();
