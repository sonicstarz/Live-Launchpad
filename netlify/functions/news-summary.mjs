// Netlify Scheduled Function — runs the daily AI news summary at 12:00 UTC.
// Core logic lives in ../lib/news-core.mjs (shared with the manual trigger news-run.mjs).
// Required env vars: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { generateAndStore } from '../lib/news-core.mjs';

export const config = { schedule: '0 12 * * *' };

export default async () => {
  const r = await generateAndStore();
  return new Response(r.msg, { status: 200 });
};
