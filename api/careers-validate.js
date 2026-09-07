// Vercel serverless function — validates a candidate's submitted 16-char key for the
// Zuper_Careers.exe puzzle flow (CareersWindow in app.jsx) against a server-side-only
// value. Deliberately never done client-side: if a valid key lived anywhere in the
// shipped JS, any candidate could just view-source the (public) repo and read the
// answer straight off. CAREER_KEY_1 / CAREER_KEY_2 are set as Vercel env vars, the same
// pattern as ANTHROPIC_API_KEY in api/ask.js — never committed to the repo.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const step = Number(body && body.step);
  const submitted = String((body && body.key) || "").trim();
  if (step !== 1 && step !== 2) {
    res.status(400).json({ error: "step must be 1 or 2" });
    return;
  }
  if (!submitted) {
    res.status(400).json({ error: "Missing key" });
    return;
  }

  const expected = step === 1 ? process.env.CAREER_KEY_1 : process.env.CAREER_KEY_2;
  if (!expected) {
    res.status(503).json({ error: "CAREER_KEY_" + step + " not configured" });
    return;
  }

  const valid = submitted.toLowerCase() === String(expected).trim().toLowerCase();
  res.status(200).json({ valid: valid });
};
