// Rocket Explorer — AI drafting helper for Studio.
//
// POST here from Studio (editor only) with a rocket's name + the node names from
// its uploaded .glb. Returns DRAFT parts (mesh_key mapping, names, descriptions,
// specs, and source URLs) compiled from well-known public facts. Nothing is saved
// here — the editor reviews/edits every field in Studio and saves manually, which
// is the human-vetting step required by the content policy.
//
// Env: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY.

const SB_URL = 'https://oshizhnblnsrjutxyxxg.supabase.co';
const MODEL  = 'claude-haiku-4-5';   // swap to a Sonnet for richer drafts if your key allows

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' }
});

// Confirm the caller is a signed-in editor (their Supabase access token + a
// service-role lookup of profiles.role) — keeps the AI endpoint editor-only.
async function isEditor(token) {
  const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SR || !token) return false;
  try {
    const u = await fetch(SB_URL + '/auth/v1/user', { headers: { Authorization: 'Bearer ' + token, apikey: SR } });
    if (!u.ok) return false;
    const user = await u.json();
    if (!user || !user.id) return false;
    const p = await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + user.id + '&select=role', { headers: { apikey: SR, Authorization: 'Bearer ' + SR } });
    if (!p.ok) return false;
    const rows = await p.json();
    return !!(rows[0] && rows[0].role === 'editor');
  } catch { return false; }
}

function buildPrompt(b) {
  const nodes = Array.isArray(b.nodeNames) ? b.nodeNames.filter(Boolean).slice(0, 120) : [];
  const existing = Array.isArray(b.existingParts) ? b.existingParts.slice(0, 60) : [];
  return [
    `Rocket: ${b.rocketName || '(unnamed)'}${b.operator ? ' — operator: ' + b.operator : ''}${b.subtitle ? ' (' + b.subtitle + ')' : ''}${b.height_m ? ', ~' + b.height_m + ' m tall' : ''}.`,
    nodes.length
      ? `\nThe uploaded 3D model contains these node/mesh names:\n${nodes.map(n => '- ' + n).join('\n')}\nMap the meaningful structural ones to real rocket parts. Set each part's "mesh_key" to the EXACT node name it corresponds to (so the viewer can highlight it). Ignore noise like "Cube", "Mesh", "Object_12", lights, cameras, or empties.`
      : `\nNo model node names were provided — propose the standard major parts for this vehicle and use a short lowercase token for each "mesh_key" (e.g. "stage1", "engines").`,
    existing.length ? `\nParts already in the database (reuse these mesh_keys where they match): ${existing.map(p => `${p.mesh_key}:${p.name}`).join(', ')}.` : '',
    `\nReturn ONLY valid JSON, no prose, in this exact shape:`,
    `{"parts":[{"mesh_key":"...","part_number":"01","name":"...","what_it_is":"1–2 plain sentences","how_it_works":"2–3 plain sentences","specs":[["Label","value"]],"sources":["https://..."]}]}`,
    `Rules: be factually accurate using well-known public information (operator site, nasa.gov, Wikipedia). If you are unsure of a number, omit that spec rather than guessing. Keep language plain and non-promotional. part_number is "01","02",... top to bottom. Provide 4–10 parts. Every part must include at least one real source URL.`
  ].filter(Boolean).join('\n');
}

function extractJSON(text) {
  if (!text) return null;
  const a = text.indexOf('{'), z = text.lastIndexOf('}');
  if (a < 0 || z < 0) return null;
  try { return JSON.parse(text.slice(a, z + 1)); } catch { return null; }
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return json(500, { error: 'Missing ANTHROPIC_API_KEY env var' });

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!await isEditor(token)) return json(403, { error: 'Editor access required — sign in to Studio as an editor.' });

  const body = await req.json().catch(() => ({}));
  if (!body.rocketName) return json(400, { error: 'rocketName is required' });

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3500,
        system: 'You are a careful aerospace technical writer. You compile accurate, plainly-worded summaries of launch-vehicle parts from public sources, and you never invent specifications. You always answer with strict JSON only.',
        messages: [{ role: 'user', content: buildPrompt(body) }]
      })
    });
  } catch (e) { return json(502, { error: 'Could not reach the AI service' }); }

  if (!r.ok) return json(502, { error: 'AI service error ' + r.status });
  const data = await r.json();
  const text = (data.content || []).map(c => c.text || '').join('');
  const parsed = extractJSON(text);
  if (!parsed || !Array.isArray(parsed.parts)) return json(502, { error: 'AI returned an unexpected format — try again.' });

  // light validation / normalisation
  const parts = parsed.parts.filter(p => p && p.mesh_key && p.name).slice(0, 12).map((p, i) => ({
    mesh_key: String(p.mesh_key).slice(0, 80),
    part_number: String(p.part_number || String(i + 1).padStart(2, '0')).slice(0, 8),
    name: String(p.name).slice(0, 120),
    what_it_is: String(p.what_it_is || '').slice(0, 1200),
    how_it_works: String(p.how_it_works || '').slice(0, 1200),
    specs: Array.isArray(p.specs) ? p.specs.filter(s => Array.isArray(s) && s[0]).slice(0, 12).map(s => [String(s[0]).slice(0, 60), String(s[1] == null ? '' : s[1]).slice(0, 80)]) : [],
    sources: Array.isArray(p.sources) ? p.sources.filter(u => /^https?:\/\//.test(u)).slice(0, 6) : []
  }));

  return json(200, { parts, model: MODEL, note: 'AI drafts — review, edit, and verify sources before saving.' });
};
