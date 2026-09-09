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
//
// link and quizScore are both optional (product review finding: a bare email address
// is a cold lead needing manual chase-down). link is free-text from the candidate
// (LinkedIn/portfolio/resume URL, whatever they typed after their email in
// `bash submit.sh <email> [link]`) — never validated as a URL, just length-capped and
// included as-is; quizScore is a same-session bash quiz.sh result (0-5) if they took
// it, previously computed and then thrown away with nothing carrying it to this email.
//
// soft (optional bool): set by `bash notify.sh <email>` — a deliberately lower-
// commitment path for someone who isn't ready to apply right now but still wants to
// be kept in mind (product review finding: a solver who didn't submit.sh right after
// CHALLENGE COMPLETE was gone for good, no path back). Same endpoint, different
// subject line, so Raghav/Sameer can tell a soft signal apart from an active
// application at a glance.
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
  const link = String((body && body.link) || "").trim().slice(0, 300);
  const quizScore = Number.isInteger(body && body.quizScore) ? body.quizScore : null;
  const soft = !!(body && body.soft);

  try {
    const upstream = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFY_EMAILS,
        subject: soft ? "Zuper Labs OS careers — notify-me signup" : "Zuper Labs OS careers challenge — new completion",
        text: (soft
          ? "Someone opted in to be kept posted about roles (didn't necessarily finish the challenge).\n\nEmail: " + email
          : "A candidate just completed both keys in the Zuper Labs OS careers challenge.\n\nEmail: " + email
            + (link ? "\nLink: " + link : "")
            + (quizScore != null ? "\nQuiz score: " + quizScore + "/5" : ""))
          + "\nSubmitted at: " + new Date().toISOString(),
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
