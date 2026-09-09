// Vercel serverless function — a real, shared "N people have solved this" counter for
// the terminal-native Zuper Careers challenge (app.jsx, TerminalWindow's careers*
// helpers). Nothing in this app has ever needed shared state across visitors before —
// careers progress lives in each browser's own localStorage — so this is genuinely new
// infrastructure, not just another env var. Backed by Upstash Redis's plain REST API
// (fetch calls with a bearer token) rather than the @upstash/redis SDK, on purpose: this
// repo has no package.json/npm install step at all (Babel-in-browser, no build), and
// every other serverless function here (api/ask.js, api/careers-submit.js) already
// talks to its upstream the same raw-fetch way. UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN come straight from an Upstash database's own "REST API"
// panel — same pattern as RESEND_API_KEY: set on the PROJECT itself in Vercel, not a
// team-level "Shared" variable (that's what silently broke RESEND_API_KEY the first
// time around).
//
// GET  -> current count only, never increments (safe to call anytime — the pre-solve
//         "N people have already cracked this" teaser calls this on load).
// POST -> atomically increments by 1 and returns the new count. The client calls this
//         exactly once, the instant careersProgress transitions to step 3 (see
//         careersSubmitAnswer in app.jsx) — not on every render/mount, so refreshing
//         the page or reopening Terminal after finishing doesn't double-count.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const COUNT_KEY = "zuper_careers_solved_count";

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    // Fails soft, not loud — this is a nice-to-have counter, not the careers funnel
    // itself. A visitor should never see an error over this; the frontend just hides
    // the teaser/count when count is null.
    res.status(503).json({ error: "counter not configured", count: null });
    return;
  }

  try {
    const command = req.method === "POST" ? ["INCR", COUNT_KEY] : ["GET", COUNT_KEY];
    const upstream = await fetch(UPSTASH_URL + "/" + command.map(encodeURIComponent).join("/"), {
      headers: { authorization: "Bearer " + UPSTASH_TOKEN },
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      res.status(502).json({ error: "Upstream error", detail: detail.slice(0, 300), count: null });
      return;
    }
    const data = await upstream.json();
    const count = Number(data && data.result) || 0;
    res.status(200).json({ count: count });
  } catch (err) {
    res.status(500).json({ error: "Request failed", detail: String((err && err.message) || err), count: null });
  }
};
