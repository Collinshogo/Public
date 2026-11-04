/**
 * Meta Conversions API relay for allfluencetrading.com — a Cloudflare Worker (free tier is enough).
 *
 * Why: the site is static (GitHub Pages), so browser Pixel events can be lost to ad blockers and iOS.
 * The page POSTs each event here with the same event_id it gave the Pixel; Meta deduplicates on
 * (event_name, event_id). No names, emails or phone numbers are collected anywhere on the site.
 *
 * Deploy (one time, ~5 min):
 *   1. npm i -g wrangler && wrangler login
 *   2. wrangler init aft-capi --yes   (or create a Worker in the Cloudflare dashboard and paste this file)
 *   3. wrangler secret put META_ACCESS_TOKEN   (Events Manager > Settings > Conversions API > Generate access token)
 *   4. wrangler secret put META_PIXEL_ID
 *   5. optional for testing: wrangler secret put META_TEST_EVENT_CODE   (Events Manager > Test events)
 *   6. wrangler deploy   → copy the URL into config.js  capiEndpoint: "https://aft-capi.<you>.workers.dev"
 *   Remove META_TEST_EVENT_CODE after the test event shows in Events Manager.
 */
const ALLOWED_ORIGINS = ["https://allfluencetrading.com", "https://www.allfluencetrading.com", "http://localhost:8080"];
const ALLOWED_EVENTS = new Set(["PageView", "ViewContent", "InitiateCheckout", "Lead"]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return new Response("method", { status: 405, headers: cors });
    if (!env.META_PIXEL_ID || !env.META_ACCESS_TOKEN) return new Response("not configured", { status: 500, headers: cors });

    let body;
    try { body = await request.json(); } catch (e) { return new Response("bad json", { status: 400, headers: cors }); }
    if (!ALLOWED_EVENTS.has(body.event_name) || !body.event_id) return new Response("bad event", { status: 400, headers: cors });

    const user_data = {
      client_ip_address: request.headers.get("CF-Connecting-IP") || undefined,
      client_user_agent: request.headers.get("User-Agent") || undefined,
      fbp: body.fbp || undefined,
      fbc: body.fbc || undefined
    };
    const event = {
      event_name: body.event_name,
      event_time: Number(body.event_time) || Math.floor(Date.now() / 1000),
      event_id: String(body.event_id).slice(0, 100),
      event_source_url: body.event_source_url,
      action_source: "website",
      user_data,
      custom_data: body.custom_data || {}
    };
    const payload = { data: [event] };
    if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

    const url = `https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const text = await res.text();
    return new Response(text, { status: res.ok ? 200 : 502, headers: { ...cors, "Content-Type": "application/json" } });
  }
};
