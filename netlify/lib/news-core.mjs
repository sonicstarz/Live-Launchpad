// Shared core for the daily AI news summary.
// Used by the scheduled function (news-summary.mjs) and the manual trigger (news-run.mjs).
// Fetch today's SNAPI articles -> Claude Haiku briefing -> validate every link was a
// real source -> store the latest summary in Supabase. Keys come from env vars.

const SUPABASE_URL = 'https://oshizhnblnsrjutxyxxg.supabase.co';
const SNAPI = 'https://api.spaceflightnewsapi.net/v4/articles/';

const PROMPT = `You are the daily news editor for Live Launchpad, a space-launch site.
You will receive a JSON array of space-news articles from today, each with a title,
summary, news_site, and url.

Write a SHORT daily briefing of 3 to 5 bullet points covering the most important
developments. Rules:
- Each bullet is ONE sentence, plain and factual, no hype.
- Each bullet must be based ONLY on the supplied articles. Do not add facts that
  are not present in the supplied titles/summaries.
- Each bullet must cite exactly one source: the url of the article it came from.
- You may ONLY use urls that appear in the supplied articles. Never invent, guess,
  or modify a url. If you cannot support a point with a supplied url, omit it.
- Prefer covering distinct stories over multiple bullets on the same story.

Return ONLY valid JSON, no markdown, in this exact shape:
{"headline":"<= 8 word summary of the day","items":[{"text":"one factual sentence","source_site":"news_site value","source_url":"exact url from input"}]}`;

async function snapi(qs) {
  const r = await fetch(SNAPI + '?' + qs, { headers: { 'User-Agent': 'live-launchpad' } });
  if (!r.ok) return [];
  const d = await r.json();
  return d.results || [];
}

async function callClaude(key, articles) {
  const body = {
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    temperature: 0.3,
    messages: [{ role: 'user', content: PROMPT + "\n\nHere are today's articles:\n" + JSON.stringify(articles) }]
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('anthropic ' + r.status);
  const d = await r.json();
  const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const clean = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(clean);
}

async function sbWrite(serviceKey, row) {
  const H = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  await fetch(SUPABASE_URL + '/rest/v1/news_summary?id=not.is.null', { method: 'DELETE', headers: H }); // keep one latest row
  const r = await fetch(SUPABASE_URL + '/rest/v1/news_summary', { method: 'POST', headers: H, body: JSON.stringify(row) });
  if (!r.ok) throw new Error('supabase write ' + r.status);
}

export async function generateAndStore() {
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ANTHROPIC) return { ok: false, status: 500, msg: 'Missing ANTHROPIC_API_KEY env var' };
  if (!SERVICE) return { ok: false, status: 500, msg: 'Missing SUPABASE_SERVICE_ROLE_KEY env var' };

  try {
    const startUTC = new Date(); startUTC.setUTCHours(0, 0, 0, 0);
    let arts = await snapi('limit=25&ordering=-published_at&published_at_gte=' + startUTC.toISOString());
    if (!arts.length) arts = await snapi('limit=25&ordering=-published_at');
    if (!arts.length) return { ok: false, status: 200, msg: 'No articles from SNAPI' };

    const compact = arts.slice(0, 25).map(a => ({
      title: a.title, summary: (a.summary || '').slice(0, 400), news_site: a.news_site, url: a.url
    }));

    let out;
    try { out = await callClaude(ANTHROPIC, compact); }
    catch (e) { return { ok: false, status: 200, msg: 'Model/parse failed (kept prior): ' + e }; }

    const allowed = new Set(compact.map(a => a.url));
    const items = (out.items || []).filter(it => it && allowed.has(it.source_url));
    if (!items.length) return { ok: false, status: 200, msg: 'No valid items (kept prior)' };

    await sbWrite(SERVICE, { headline: (out.headline || 'Today in Space').slice(0, 120), items, article_count: compact.length });
    return { ok: true, status: 200, msg: 'OK — published ' + items.length + ' items from ' + compact.length + ' articles' };
  } catch (e) {
    return { ok: false, status: 200, msg: 'Error (cache untouched): ' + e };
  }
}
