// Netlify Function: latest space videos.
// Aggregates the UPLOADS RSS feed of curated space YouTube channels
// (https://www.youtube.com/feeds/videos.xml?channel_id=…) — no API key, no quota.
//
// Channels are editable in Studio (the `video_channels` Supabase table). If that
// table is empty/unreachable we fall back to the SEED list below, so the feed
// always works. Each channel may set comma-separated `keywords`; when present,
// only that channel's videos whose title matches a keyword are included (useful
// for broader channels). Dedicated space channels leave keywords blank.

const SB_URL = 'https://oshizhnblnsrjutxyxxg.supabase.co';
const SB_KEY = 'sb_publishable_QMaIcq2mO6q5qbE-5gT14A_Q-2dKT5r';

const SEED = [
  { channel_id: 'UCtI0Hodo5o5dUb67FeUjDeA', name: 'SpaceX', keywords: '' },
  { channel_id: 'UCLA_DiR1FfKNvjuUpBHmylQ', name: 'NASA', keywords: '' },
  { channel_id: 'UCryGec9PdUCLjpJW2mgCuLw', name: 'NASA JPL', keywords: '' },
  { channel_id: 'UCIBaDdAbGlFDeS33shmlD0A', name: 'ESA', keywords: '' },
  { channel_id: 'UCVxTHEKKLxNjGcvVaZindlg', name: 'Blue Origin', keywords: '' },
  { channel_id: 'UC6uKrU_WqJ1R2HMTY3LIx5Q', name: 'Everyday Astronaut', keywords: '' },
  { channel_id: 'UCSUu1lih2RifWkKtDOJdsBA', name: 'NASASpaceflight', keywords: '' },
  { channel_id: 'UCoLdERT4-TJ82PJOHSrsZLQ', name: 'Spaceflight Now', keywords: '' },
  { channel_id: 'UCxzC4EngIsMrPmbm6Nxvb-A', name: 'Scott Manley', keywords: '' },
  { channel_id: 'UCBNHHEoiSF8pcLgqLKVugOw', name: 'Marcus House', keywords: '' },
  { channel_id: 'UCczaM73yxttaZRh7ILYHnQg', name: 'Eager Space', keywords: '' },
  { channel_id: 'UCelXvXZDvx8_TdOOffevzGg', name: 'Ellie in Space', keywords: '' },
  { channel_id: 'UClZbmi9JzfnB2CEb0fG8iew', name: 'Primal Space', keywords: '' },
  { channel_id: 'UCeMcDx6-rOq_RlKSPehk2tQ', name: 'The Space Race', keywords: '' },
  { channel_id: 'UC-9b7aDP6ZN0coj9-xFnrtw', name: 'Astrum', keywords: '' },
  { channel_id: 'UCogrSQkBJn1KF0N9I4oM7eQ', name: 'Fraser Cain', keywords: '' }
];

const FEED = (id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

function unesc(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&');
}
function parseFeed(xml, channel, keywords) {
  const kw = String(keywords || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const out = [];
  const entries = String(xml).split('<entry>').slice(1);
  for (const e of entries) {
    const vid = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
    if (!vid) continue;
    const title = unesc((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
    if (kw.length && !kw.some((k) => title.toLowerCase().includes(k))) continue; // per-channel keyword filter
    const pub = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || null;
    out.push({
      videoId: vid, title, channel, published: pub,
      thumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${vid}`
    });
  }
  return out;
}
async function getChannels() {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/video_channels?select=channel_id,name,keywords&enabled=eq.true&order=sort_order`,
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if (r.ok) { const rows = await r.json(); if (Array.isArray(rows) && rows.length) return rows; }
  } catch (e) { /* fall back to seed */ }
  return SEED;
}

export default async (req) => {
  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '60', 10), 120);
  try {
    const channels = await getChannels();
    const settled = await Promise.allSettled(channels.map(async (c) => {
      const r = await fetch(FEED(c.channel_id), { headers: { 'User-Agent': 'live-launchpad' } });
      if (!r.ok) throw new Error('feed ' + r.status);
      return parseFeed(await r.text(), c.name, c.keywords);
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
        'Cache-Control': 'public, max-age=900, s-maxage=1800'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), results: [] }), {
      status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
