// Vercel serverless function — secure proxy to OpenRouter (openrouter.ai).
// The API key lives only in this server-side environment variable (OPENROUTER_API_KEY,
// set in the Vercel project's dashboard), never in client-side code. The frontend
// (AssistantWidget in app.jsx) POSTs { question } here and falls back to its own local
// keyword search over zuper-world-data.json if this call fails or the key isn't set.
//
// Direct request: no per-query cost, so this routes to one of OpenRouter's genuinely
// free-tier models (":free" suffix — $0, no charge against the account's credit
// balance) rather than a paid model like Claude. Verified against OpenRouter's own
// public /api/v1/models listing (pricing.prompt === "0") at the time this was wired
// up, not assumed from memory — that catalog changes over time, so if this model ID
// ever gets retired the fallback to local search below just kicks in until it's
// swapped for a current one.
const worldData = require("../zuper-world-data.json");

const MODEL = "qwen/qwen3.8-27b:free";
const MAX_QUESTION_LENGTH = 500;

function buildContext() {
  return JSON.stringify(
    worldData.map((c) => ({
      id: c.id,
      name: c.name,
      entities: c.entities.map((e) => ({
        name: e.name, type: e.type, category: e.category, description: e.description, details: e.details,
      })),
      flows: c.flows.map((f) => ({ from: f.from, to: f.to, signalType: f.signalType })),
    }))
  );
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OPENROUTER_API_KEY not configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const question = String((body && body.question) || "").trim().slice(0, MAX_QUESTION_LENGTH);
  if (!question) {
    res.status(400).json({ error: "Missing question" });
    return;
  }

  const systemPrompt =
    "You are the desktop assistant inside \"Zuper Labs OS\", a retro CRT-styled concept " +
    "prototype that reimagines labs.zuper.co's real product-cluster map as a desktop OS. " +
    "Answer questions ONLY using the real platform data provided below (Zuper's actual " +
    "clusters, entities, and data-flows). Be concise and friendly — 1 to 4 sentences unless " +
    "a list is genuinely needed. If a question isn't covered by this data, say so plainly " +
    "rather than guessing or inventing details. Never claim to be a general-purpose AI " +
    "assistant or claim capabilities outside this platform data.\n\n" +
    "REAL PLATFORM DATA (JSON):\n" + buildContext();

  try {
    // OpenRouter's API is OpenAI-compatible (POST /chat/completions, system+user
    // messages array, response at choices[0].message.content) — a different shape
    // from Anthropic's native /v1/messages this originally called. HTTP-Referer/
    // X-Title are OpenRouter's own recommended (not required) attribution headers,
    // shown on their dashboard/leaderboards — harmless to include, no secret in them.
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": "Bearer " + apiKey,
        "HTTP-Referer": "https://zuper-labs-os.vercel.app",
        "X-Title": "Zuper Labs OS - Zee",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      res.status(502).json({ error: "Upstream error", detail: detail.slice(0, 300) });
      return;
    }

    const data = await upstream.json();
    const answer = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!answer) {
      res.status(502).json({ error: "Empty response from model" });
      return;
    }
    res.status(200).json({ answer: answer });
  } catch (err) {
    res.status(500).json({ error: "Request failed", detail: String((err && err.message) || err) });
  }
};
