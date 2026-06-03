// Quiz question generator for Studio (editor-only).
// Drafts multiple-choice questions on a space topic, each with a real source URL,
// for the editor to review/verify before saving (content policy: cited + vetted,
// never auto-published). Same auth/AI pattern as rocket-assist.
//
// Env: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY.

const SB_URL = 'https://oshizhnblnsrjutxyxxg.supabase.co';
const MODEL  = 'claude-haiku-4-5';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function isEditor(token) {
  const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SR || !token) return false;
  try {
    const u = await fetch(SB_URL + '/auth/v1/user', { headers: { Authorization: 'Bearer ' + token, apikey: SR } });
    if (!u.ok) return false;
    const user = await u.json(); if (!user || !user.id) return false;
    const p = await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + user.id + '&select=role', { headers: { apikey: SR, Authorization: 'Bearer ' + SR } });
    if (!p.ok) return false;
    const rows = await p.json();
    return !!(rows[0] && rows[0].role === 'editor');
  } catch { return false; }
}

function buildPrompt(b) {
  const topic = String(b.topic || 'spaceflight').slice(0, 160);
  const count = Math.min(Math.max(parseInt(b.count, 10) || 6, 1), 12);
  const diff = ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'mixed';
  return [
    `Write ${count} multiple-choice quiz questions about: "${topic}". Difficulty: ${diff}. Audience: a classroom / space fans.`,
    `Return ONLY valid JSON, no prose, exactly:`,
    `{"questions":[{"prompt":"...","choices":["A","B","C","D"],"correct_index":0,"source_url":"https://..."}]}`,
    `Rules:`,
    `- Exactly 4 choices; exactly one correct; correct_index is its 0-based position.`,
    `- Use ONLY well-established, verifiable facts. If you are not confident a fact is correct, don't ask it.`,
    `- Distractors must be plausible and clearly wrong (not trick/ambiguous).`,
    `- Every question needs a real source_url where the fact can be checked (nasa.gov, esa.int, spacex.com, Wikipedia, etc.).`,
    `- Keep prompts and answers short. No opinions, no "which is best".`
  ].join('\n');
}
function extractJSON(t) { if (!t) return null; const a = t.indexOf('{'), z = t.lastIndexOf('}'); if (a < 0 || z < 0) return null; try { return JSON.parse(t.slice(a, z + 1)); } catch { return null; } }

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return json(500, { error: 'Missing ANTHROPIC_API_KEY' });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!await isEditor(token)) return json(403, { error: 'Editor access required' });
  const body = await req.json().catch(() => ({}));

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000,
        system: 'You are a careful space educator who writes accurate, verifiable quiz questions and always answers with strict JSON only. You never invent facts.',
        messages: [{ role: 'user', content: buildPrompt(body) }]
      })
    });
  } catch (e) { return json(502, { error: 'Could not reach the AI service' }); }
  if (!r.ok) return json(502, { error: 'AI service error ' + r.status });

  const data = await r.json();
  const parsed = extractJSON((data.content || []).map(c => c.text || '').join(''));
  if (!parsed || !Array.isArray(parsed.questions)) return json(502, { error: 'AI returned an unexpected format — try again.' });

  const questions = parsed.questions.map(q => {
    const choices = Array.isArray(q.choices) ? q.choices.map(c => String(c).slice(0, 120)).filter(Boolean).slice(0, 4) : [];
    let ci = parseInt(q.correct_index, 10); if (!(ci >= 0 && ci < choices.length)) ci = 0;
    return { prompt: String(q.prompt || '').slice(0, 400), choices, correct_index: ci, source_url: /^https?:\/\//.test(q.source_url) ? q.source_url : '' };
  }).filter(q => q.prompt && q.choices.length >= 2).slice(0, 12);

  if (!questions.length) return json(502, { error: 'No usable questions came back — try a more specific topic.' });
  return json(200, { questions, model: MODEL, note: 'AI drafts — verify each fact and source before saving.' });
};
