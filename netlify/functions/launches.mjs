// Netlify Function: proxies Launch Library 2 (which has CORS disabled).
// Caches at the edge for 5 min to respect LL2 rate limits.
export default async (req) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || 'upcoming'; // 'upcoming' | 'previous'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10), 40);

  const endpoint = kind === 'previous'
    ? `https://ll.thespacedevs.com/2.0.0/launch/previous/?limit=${limit}&mode=detailed`
    : `https://ll.thespacedevs.com/2.0.0/launch/upcoming/?limit=${limit}&mode=detailed`;

  try {
    const r = await fetch(endpoint, { headers: { 'User-Agent': 'space-age-dashboard' } });
    if (!r.ok) throw new Error('LL2 ' + r.status);
    const data = await r.json();

    // Trim to just what the frontend needs (smaller payload)
    const slim = (data.results || []).map(L => ({
      id: L.id,
      name: L.name,
      status: L.status && L.status.name,
      net: L.net,
      provider: L.launch_service_provider && L.launch_service_provider.name,
      rocket: L.rocket && L.rocket.configuration && L.rocket.configuration.full_name,
      mission: L.mission && L.mission.name,
      missionType: L.mission && L.mission.type,
      orbit: L.mission && L.mission.orbit && L.mission.orbit.abbrev,
      desc: L.mission && L.mission.description,
      pad: L.pad && L.pad.name,
      location: L.pad && L.pad.location && L.pad.location.name,
      image: L.image,
      infographic: L.infographic,
      webcastLive: L.webcast_live,
      vidURLs: L.vidURLs || [],
      infoURL: (L.infoURLs && L.infoURLs[0] && L.infoURLs[0].url) || null,
      mapURL: (L.pad && L.pad.map_url) || null,
      program: (L.program && L.program[0] && L.program[0].name) || null
    }));

    return new Response(JSON.stringify({ count: data.count, results: slim }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, s-maxage=300'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), results: [] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
