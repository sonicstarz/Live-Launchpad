// Manual trigger for the AI news summary — visit this URL once to generate the
// first summary (instead of waiting for the daily schedule).
//
//   https://livelaunchpad.com/.netlify/functions/news-run?token=YOUR_NEWS_RUN_TOKEN
//
// Guarded by the NEWS_RUN_TOKEN env var (pick any passphrase) so randoms can't
// trigger Anthropic calls. Same logic as the scheduled function.
import { generateAndStore } from '../lib/news-core.mjs';

export default async (req) => {
  const token = new URL(req.url).searchParams.get('token');
  const expected = process.env.NEWS_RUN_TOKEN;
  if (!expected) return new Response('Set a NEWS_RUN_TOKEN env var first, then call this with ?token=that-value', { status: 500 });
  if (token !== expected) return new Response('Unauthorized — add ?token=<your NEWS_RUN_TOKEN> to the URL', { status: 401 });
  const r = await generateAndStore();
  return new Response(r.msg, { status: r.status });
};
