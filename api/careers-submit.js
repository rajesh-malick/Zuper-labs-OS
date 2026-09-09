// Vercel serverless function — optional last step of the terminal-native Zuper Careers
// challenge (app.jsx, TerminalWindow's careers* helpers). Both puzzle levels are
// generated and checked entirely client-side now (there's no fixed answer to protect —
// each solve is fresh random data), so this is the only server call left in the flow:
// once a candidate finishes, they can run `bash submit.sh <email>` and this sends a
// notification email to Raghav and Sameer with those details, via Resend
// (https://resend.com). RESEND_API_KEY lives only in this server-side env var,
// same pattern as ANTHROPIC_API_KEY in api/ask.js.
//
// zuper.co is now verified in Resend, so this sends from a real address instead of
// Resend's shared sandbox sender (which could only ever reach the Resend account's own
// verified email, never raghav@/sameer@zuper.co).
const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "Zuper Labs OS <careers@zuper.co>";
const NOTIFY_EMAILS = ["raghav@zuper.co", "sameer@zuper.co"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "RESEND_API_KEY not configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const email = String((body && body.email) || "").trim();
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  try {
    const upstream = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFY_EMAILS,
        subject: "Zuper Labs OS careers challenge — new completion",
        text: "A candidate just completed both keys in the Zuper Labs OS careers challenge.\n\nEmail: " + email + "\nCompleted at: " + new Date().toISOString(),
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      res.status(502).json({ error: "Upstream error", detail: detail.slice(0, 300) });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Request failed", detail: String((err && err.message) || err) });
  }
};
