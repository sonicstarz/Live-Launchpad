// Netlify Function: resolve a YouTube channel reference to its UC… id + name.
// Used by Studio → Videos so editors can add a channel by pasting an @handle,
// a channel URL, or a UC id. Only ever fetches youtube.com (no SSRF).
//
//   /.netlify/functions/resolve-channel?q=@scottmanley
//   /.netlify/functions/resolve-channel?q=https://www.youtube.com/@MarcusHouse

const json = (s, b) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
const idIn = (s) => (String(s).match(/(UC[\w-]{22})/) || [])[1] || null;

export default async (req) => {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (!q) return json(400, { error: 'Pass ?q=@handle, a channel URL, or a UC… id' });

  // 1) already a UC id (or a URL containing one)
  let id = idIn(q), name = '';
  // 2) otherwise derive a handle and look it up on youtube.com only
  if (!id) {
    let handle = null, m;
    if ((m = q.match(/@([\w.\-]+)/))) handle = m[1];
    else if ((m = q.match(/youtube\.com\/(?:c|user)\/([\w.\-]+)/i))) handle = m[1];
    else if (/^[\w.\-]+$/.test(q)) handle = q;
    if (!handle) return json(400, { error: 'Could not read a handle from that input' });
    try {
      const r = await fetch('https://www.youtube.com/@' + encodeURIComponent(handle), { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' } });
      if (r.ok) {
        const html = await r.text();
        id = (html.match(/"externalId":"(UC[\w-]{22})"/) || [])[1] || idIn(html);
        const nm = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (nm) name = nm[1];
      }
    } catch (e) { /* falls through to 404 */ }
  }
  if (!id) return json(404, { error: 'Channel not found — try the full channel URL or its UC… id' });

  // verify it has a real uploads feed (and grab the name if we still need it)
  try {
    const rss = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + id);
    if (rss.ok) { const x = await rss.text(); if (!name) { const t = x.match(/<title>([^<]+)<\/title>/); if (t) name = t[1]; } }
    else return json(404, { error: 'That id has no public video feed' });
  } catch (e) { /* keep id; name may be blank */ }

  return json(200, { channel_id: id, name: name || id });
};
