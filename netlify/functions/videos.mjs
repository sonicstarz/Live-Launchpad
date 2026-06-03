// Netlify Function: latest space videos.
// Aggregates the UPLOADS RSS feed of a curated set of space YouTube channels
// (https://www.youtube.com/feeds/videos.xml?channel_id=…) — no API key, no quota.
// Curation = quality: only hand-picked space channels, merged + sorted by date.
//
// To add a channel: find its channel_id (UC…) and add a line below.

const CHANNELS = [
  { id: 'UCtI0Hodo5o5dUb67FeUjDeA', name: 'SpaceX' },
  { id: 'UCLA_DiR1FfKNvjuUpBHmylQ', name: 'NASA' },
  { id: 'UC6uKrU_WqJ1R2HMTY3LIx5Q', name: 'Everyday Astronaut' },
  { id: 'UCSUu1lih2RifWkKtDOJdsBA', name: 'NASASpaceflight' },
  { id: 'UCoLdERT4-TJ82PJOHSrsZLQ', name: 'Spaceflight Now' }
];
const FEED = (id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

function unesc(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&');
}
function parseFeed(xml, channel) {
  const out = [];
  const entries = String(xml).split('<entry>').slice(1); // first chunk is the channel header
  for (const e of entries) {
    const vid = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
    if (!vid) continue;
    const title = unesc((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
    const pub = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || null;
    out.push({
      videoId: vid, title, channel, published: pub,
      thumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${vid}`
    });
  }
  return out;
}

export default async (req) => {
  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '48', 10), 96);
  try {
    const settled = await Promise.allSettled(CHANNELS.map(async (c) => {
      const r = await fetch(FEED(c.id), { headers: { 'User-Agent': 'live-launchpad' } });
      if (!r.ok) throw new Error('feed ' + r.status);
      return parseFeed(await r.text(), c.name);
    }));
    let vids = [];
    settled.forEach((s) => { if (s.status === 'fulfilled') vids = vids.concat(s.value); });
    vids.sort((a, b) => new Date(b.published) - new Date(a.published));
    const seen = {};
    vids = vids.filter((v) => (seen[v.videoId] ? false : (seen[v.videoId] = 1))).slice(0, limit);
    if (!vids.length) throw new Error('no videos parsed');
    return new Response(JSON.stringify({ count: vids.length, results: vids }), {
      headers: {
        'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900, s-maxage=1800'   // edge-cache 30 min
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), results: [] }), {
      status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
