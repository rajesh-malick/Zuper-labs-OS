// Vercel serverless function — final step of the Zuper_Careers.exe puzzle flow
// (CareersWindow in app.jsx). Once a candidate has solved both keys (validated
// separately by careers-validate.js), the frontend POSTs their email here; this
// sends a notification email to Raghav and Sameer with those details, via Resend
// (https://resend.com). RESEND_API_KEY lives only in this server-side env var,
// same pattern as ANTHROPIC_API_KEY in api/ask.js.
//
// FROM_EMAIL below uses Resend's shared sandbox sender, which can only deliver to
// the Resend account's OWN verified email address — fine for initial testing, but
// to actually reach raghav@zuper.co / sameer@zuper.co in production, a real sending
// domain must be verified in the Resend dashboard and FROM_EMAIL updated to use it
// (e.g. "careers@zuper.co" once zuper.co or a subdomain is verified there).
const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "Zuper Labs OS <onboarding@resend.dev>";
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
