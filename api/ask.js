// Vercel serverless function — secure proxy to the Anthropic API.
// The API key lives only in this server-side environment variable (ANTHROPIC_API_KEY,
// set in the Vercel project's dashboard), never in client-side code. The frontend
// (AssistantWidget in app.jsx) POSTs { question } here and falls back to its own local
// keyword search over zuper-world-data.json if this call fails or the key isn't set.
const worldData = require("../zuper-world-data.json");

const MODEL = "claude-haiku-4-5-20251001";
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });
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
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      res.status(502).json({ error: "Upstream error", detail: detail.slice(0, 300) });
      return;
    }

    const data = await upstream.json();
    const answer = data && data.content && data.content[0] && data.content[0].text;
    if (!answer) {
      res.status(502).json({ error: "Empty response from model" });
      return;
    }
    res.status(200).json({ answer: answer });
  } catch (err) {
    res.status(500).json({ error: "Request failed", detail: String((err && err.message) || err) });
  }
};
