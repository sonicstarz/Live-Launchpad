// Netlify Function: list a YouTube playlist's videos (id + title) — no API key.
// Parses the public playlist page (ytInitialData). Used by Studio to bulk-import
// a playlist into a course. Restricted to youtube.com (no SSRF).
//
//   /.netlify/functions/playlist?id=PLxxxx   (or a full youtube.com/playlist?list=… URL)

const json = (s, b) => new Response(JSON.stringify(b), {
  status: s, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300, s-maxage=600' }
});
const decode = (s) => { try { return JSON.parse('"' + s + '"'); } catch (e) { return s; } };

export default async (req) => {
  const raw = (new URL(req.url).searchParams.get('id') || '').trim();
  const m = raw.match(/[?&]list=([\w-]+)/);
  const pid = m ? m[1] : raw;
  if (!/^[\w-]{12,}$/.test(pid)) return json(400, { error: 'Pass a playlist id or a youtube.com/playlist?list=… URL' });
  try {
    const r = await fetch('https://www.youtube.com/playlist?list=' + pid, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' } });
    if (!r.ok) throw new Error('http ' + r.status);
    const html = await r.text();
    const parts = html.split('"playlistVideoRenderer"').slice(1);
    const seen = {}, out = [];
    for (const p of parts) {
      const vid = (p.match(/"videoId":"([\w-]{11})"/) || [])[1];
      if (!vid || seen[vid]) continue;
      let t = (p.match(/"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/) || [])[1];
      if (!t) t = (p.match(/"title":\{[^}]*?"simpleText":"((?:\\.|[^"\\])*)"/) || [])[1];
      seen[vid] = 1;
      out.push({ youtube_id: vid, title: decode(t || '') });
      if (out.length >= 200) break;
    }
    if (!out.length) throw new Error('no videos parsed');
    return json(200, { count: out.length, results: out });
  } catch (e) {
    return json(502, { error: String(e), results: [] });
  }
};
