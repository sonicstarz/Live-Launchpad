// Netlify Scheduled Function — daily AI news summary for the News page.
//
// Once a day: fetch today's space-news from SNAPI -> ask Claude Haiku for a short
// briefing where EVERY bullet links to one of the supplied source articles ->
// validate that every link was really in the input -> store the result in Supabase.
// The News page reads it and renders it with a clear "AI-generated" label.
//
// Required Netlify env vars:
//   ANTHROPIC_API_KEY          (server-side only — never reaches the browser)
//   SUPABASE_SERVICE_ROLE_KEY  (server-side only — bypasses RLS to write the cache)
//
// To run it immediately the first time, trigger it from the Netlify dashboard
// (Functions -> news-summary -> run) — otherwise it fires on the daily schedule.

export const config = { schedule: '0 12 * * *' }; // 12:00 UTC daily

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
  // keep a single latest row: delete all, then insert
  await fetch(SUPABASE_URL + '/rest/v1/news_summary?id=not.is.null', { method: 'DELETE', headers: H });
  const r = await fetch(SUPABASE_URL + '/rest/v1/news_summary', { method: 'POST', headers: H, body: JSON.stringify(row) });
  if (!r.ok) throw new Error('supabase write ' + r.status);
}

export default async () => {
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ANTHROPIC || !SERVICE) return new Response('Missing ANTHROPIC_API_KEY or SUPABASE_SERVICE_ROLE_KEY', { status: 500 });

  try {
    const startUTC = new Date(); startUTC.setUTCHours(0, 0, 0, 0);
    let arts = await snapi('limit=25&ordering=-published_at&published_at_gte=' + startUTC.toISOString());
    if (!arts.length) arts = await snapi('limit=25&ordering=-published_at'); // fallback: newest
    if (!arts.length) return new Response('No articles', { status: 200 });

    const compact = arts.slice(0, 25).map(a => ({
      title: a.title, summary: (a.summary || '').slice(0, 400), news_site: a.news_site, url: a.url
    }));

    let out;
    try { out = await callClaude(ANTHROPIC, compact); }
    catch (e) { return new Response('Model/parse failed, keeping prior: ' + e, { status: 200 }); }

    // Link integrity: drop any item whose link wasn't in the input. This is the guarantee.
    const allowed = new Set(compact.map(a => a.url));
    const items = (out.items || []).filter(it => it && allowed.has(it.source_url));
    if (!items.length) return new Response('No valid items, keeping prior', { status: 200 });

    await sbWrite(SERVICE, { headline: (out.headline || 'Today in Space').slice(0, 120), items, article_count: compact.length });
    return new Response('OK — ' + items.length + ' items', { status: 200 });
  } catch (e) {
    return new Response('Error (cache untouched): ' + e, { status: 200 });
  }
};
