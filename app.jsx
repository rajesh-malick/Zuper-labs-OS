/**
 * Zuper Web OS — concept prototype (React + Tailwind), VFS build.
 *
 * REAL: cluster names, entity names/types/descriptions/details, and their
 * connection flows are fetched from ./zuper-world-data.json — a straight
 * regex extraction of labs.zuper.co's own /assets/js/zuper-world.js scene
 * data (verified directly against the live site this session; not invented).
 * CONCEPT: the desktop/OS/window-manager shell, the readme.md framing text
 * around the real data, the simulated status.sh boot-log lines, the app
 * file names (CorePlatform.app etc. — a UI convenience, not confirmed real
 * Zuper product names), and all four Arcade mini-games (illustrative
 * analogies only, never a simulation of real Zuper algorithm behavior).
 */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const ACCENT = "#ff4919";
const CONCEPT = "#7ecbff";
/* The OS shell's own mono-CRT accent — was green (#3fe676), now a classic amber-
   phosphor terminal color, per direct request. Kept as its own constant (distinct
   hex from ACCENT) rather than reusing ACCENT directly: ACCENT ties to Zuper's real
   brand orange, CRT_GREEN ties to the OS's internal chrome theme — two different
   concepts that happen to both be orange-family now, same as before when one was
   orange and the other was green. The variable name stays CRT_GREEN to avoid a
   much larger rename across every component that imports it. */
const CRT_GREEN = "#ffb000";

/* Product review finding: no analytics anywhere meant zero visibility into the funnel
   above the solve-count stat — who opens careers, who reaches Level 1/2, where people
   drop off. window.va is Vercel Web Analytics' queueing shim (see index.html) — a
   genuine no-op array-push until the script itself loads, so this is safe to call from
   anywhere immediately on mount with no readiness check, and stays a total no-op if
   Web Analytics is ever disabled for the project. */
function trackEvent(name, data) {
  try { if (window.va) window.va("event", { name: name, data: data || {} }); } catch (e) {}
}

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function shade(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const nr = Math.round((t - r) * p) + r;
  const ng = Math.round((t - g) * p) + g;
  const nb = Math.round((t - b) * p) + b;
  return "rgb(" + nr + "," + ng + "," + nb + ")";
}

/* ---------- Arcade/game sound effects — synthesized entirely from scratch with the Web
   Audio API, not a single sampled/recorded audio clip, so there's nothing to license.
   A lazily-created singleton AudioContext (browsers require a user gesture before audio
   can play — an arcade game's own click-to-start is always the first one). The
   assistant mascot used to have its own vibrato-chirp sounds built the same way —
   removed per direct request (no sound for the assistant). */
let sharedAudioCtx = null;
function getSharedAudioCtx() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
}
function synthBeep(ctx, freq, startTime, duration, gainPeak, type) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "square";
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}
/* Arcade game feedback sounds — same synthesis discipline (Web Audio only, nothing
   sampled), but square/sawtooth flat tones for a punchier 8-bit arcade feel. The
   assistant mascot used to have its own greet/bye/hover chirps here too — removed per
   direct request (no sound for the assistant); the mascot's visual reactions
   (greet/bye pose, hover glitch) are untouched, just silent now. */
function playArcadeSuccessSound() {
  const ctx = getSharedAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  synthBeep(ctx, 660, t0, 0.07, 0.05, "square");
  synthBeep(ctx, 990, t0 + 0.06, 0.11, 0.05, "square");
}
function playArcadeFailSound() {
  const ctx = getSharedAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  synthBeep(ctx, 220, t0, 0.16, 0.05, "sawtooth");
  synthBeep(ctx, 160, t0 + 0.09, 0.18, 0.045, "sawtooth");
}

/* ---------- Win9x-style bevel texture — technique inspired by 1j01/os-gui's
   .inset-deep/.outset-deep utility classes (MIT licensed), re-implemented here as
   original layered box-shadow CSS in our own CRT green/black palette — not that
   library's Windows-98 gray/blue skin, icons, or JS window engine. Two-tone light
   (top-left) / dark (bottom-right) edges fake a raised or sunken 3D edge; "deep" stacks
   two rings for chunkier chrome (windows), "shallow" is one ring for small controls. */
function bevel(kind, accentHex) {
  const hi2 = "#fff3e0", hi = shade(accentHex, 0.2), lo = shade(accentHex, -0.6), lo2 = "#040200";
  if (kind === "out-deep") return "inset 1px 1px 0 " + hi2 + ", inset -1px -1px 0 " + lo2 + ", inset 2px 2px 0 " + hi + ", inset -2px -2px 0 " + lo;
  if (kind === "in-deep") return "inset 1px 1px 0 " + lo2 + ", inset -1px -1px 0 " + hi2 + ", inset 2px 2px 0 " + lo + ", inset -2px -2px 0 " + hi;
  if (kind === "out-shallow") return "inset 1px 1px 0 " + hi2 + ", inset -1px -1px 0 " + lo2;
  if (kind === "in-shallow") return "inset 1px 1px 0 " + lo2 + ", inset -1px -1px 0 " + hi2;
  return "none";
}
function rand(n) { return Math.floor(Math.random() * n); }
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ---------- Arcade game persistence/scoring helpers — a per-game best score kept in
   localStorage (classic "beat your own high score" hook) and a simple letter-grade
   bucket for the end-of-run summary. ---------- */
function loadHighScore(key) {
  try { return parseInt(localStorage.getItem("zuper-os-arcade-hs-" + key), 10) || 0; } catch (e) { return 0; }
}
function saveHighScore(key, score) {
  try {
    const prev = loadHighScore(key);
    if (score > prev) { localStorage.setItem("zuper-os-arcade-hs-" + key, String(score)); return true; }
  } catch (e) {}
  return false;
}
function gradeForScore(score, sMin, aMin, bMin) {
  if (score >= sMin) return "S"; if (score >= aMin) return "A"; if (score >= bMin) return "B"; return "C";
}
/* Transient "+10" / "MISS"-style floating text feedback, shared across arcade games.
   Each game owns its own `pops` array in state and pushes {id,text,color[,x,y]}; this
   just renders and lets the CSS animation fade them out (game removes via setTimeout). */
function FloatPops({ pops }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pops.map((p) => (
        <span key={p.id} className="absolute font-mono font-bold text-[14px]"
          style={{ left: (p.x != null ? p.x : 50) + "%", top: (p.y != null ? p.y : 10) + "%", color: p.color, textShadow: "0 0 6px " + p.color, animation: "arcade-pop-fade .75s ease-out forwards" }}>
          {p.text}
        </span>
      ))}
    </div>
  );
}

/* ---------- Concept app file per real cluster (UI convenience naming — not confirmed real Zuper product names) ---------- */
const CLUSTER_APPS = {
  "command-center": "CommandConsole.app",
  "core-platform": "CorePlatform.app",
  "ai-intelligence": "ZuperAI.app",
  "workflows-cluster": "WorkflowBuilder.exe",
  "field-operations": "LiveDispatch.app",
  "security-compliance": "AuditLogs.exe",
  "customer-portal": "InvoicingPortal.app",
  "data-pipeline": "APIGateway.sys",
  "payment-processing": "InvoicingPortal.app",
  "inventory-management": "PartsTracker.app",
  "integration-hub": "APIGateway.sys",
  "predictive-analytics": "ZuperAI.app",
};
/* ---------- Vintage pixel-art icons — hand-authored original shapes (not traced or
   copied from any icon pack/marketplace/artist), rendered at native 24x24 canvas
   resolution and upscaled with crisp/pixelated edges to get a chunky "Win95 icon
   pack"-style beveled look — same construction convention as those references, but
   kept strictly mono CRT-accent (currently amber; no borrowed artwork, no new colors). ---------- */
function vintage(shape, fallback, img) { return { shape: shape, fallback: fallback, img: img }; }
function minimalIcon(key, fallback) { return { minimal: key, fallback: fallback }; }

/* Desktop/app icons — a fresh, hand-drawn minimalist single-stroke line-icon set, per
   direct reference (PostHog's app-launcher icons: plain single-color outlines, no
   fill, no detail, generous whitespace). This replaces the earlier full-color
   pixel-art PNG set entirely — not a simplification of those, a different rendering
   philosophy, so it's a new shape library (MINIMAL_ICON_SHAPES below) and a new flat
   SVG renderer (MinimalIcon), not a reuse of the older embossed/pixelated
   vintage/PixelIcon system (which stays wired up for ENTITY_ICONS and as the ultimate
   fallback). One bespoke shape per cluster, not a generic icon-pack glyph. */
const CLUSTER_ICONS = {
  "command-center": minimalIcon("command-center", "\u{1F5A5}️"),
  "core-platform": minimalIcon("core-platform", "\u{1F9E0}"),
  "ai-intelligence": minimalIcon("ai-intelligence", "\u{1F916}"),
  "workflows-cluster": minimalIcon("workflows-cluster", "\u{1F501}"),
  "field-operations": minimalIcon("field-operations", "\u{1F6F0}️"),
  "security-compliance": minimalIcon("security-compliance", "\u{1F512}"),
  "careers": minimalIcon("careers", "\u{1F4BC}"),
  "blog": minimalIcon("blog", "\u{1F4DD}"),
  "customer-portal": minimalIcon("customer-portal", "\u{1F464}"),
  "data-pipeline": minimalIcon("data-pipeline", "\u{1F4CA}"),
  "payment-processing": minimalIcon("payment-processing", "\u{1F4B3}"),
  "inventory-management": minimalIcon("inventory-management", "\u{1F4E6}"),
  "integration-hub": minimalIcon("integration-hub", "\u{1F517}"),
  "predictive-analytics": minimalIcon("predictive-analytics", "\u{1F52E}"),
  "zuper-arcade": minimalIcon("zuper-arcade", "\u{1F3AE}"),
  "terminal": minimalIcon("terminal", "⌨️"),
  "more-apps": minimalIcon("more-apps", "\u{2795}"),
};

/* One shape array per cluster, in the same [tag, attrs] tuple format PixelIcon already
   uses below — but rendered flat (MinimalIcon), not embossed/rasterized/pixelated.
   24x24 grid, generous margins, thin uniform stroke — matching a clean modern
   app-launcher icon set rather than a retro icon pack. */
const MINIMAL_ICON_SHAPES = {
  "command-center": [ // broadcast beacon
    ["path", { d: "M9 15a4.2 4.2 0 0 1 6 0" }],
    ["path", { d: "M6.5 12.5a7.8 7.8 0 0 1 11 0" }],
    ["circle", { cx: 12, cy: 18, r: 1.1, fill: "currentColor" }],
  ],
  "core-platform": [ // stacked layers
    ["rect", { x: 5, y: 4.5, width: 14, height: 3.2, rx: 1 }],
    ["rect", { x: 5, y: 10.4, width: 14, height: 3.2, rx: 1 }],
    ["rect", { x: 5, y: 16.3, width: 14, height: 3.2, rx: 1 }],
  ],
  "ai-intelligence": [ // sparkle
    ["path", { d: "M12 3.5l1.7 6.3 6.3 1.7-6.3 1.7-1.7 6.3-1.7-6.3-6.3-1.7 6.3-1.7z" }],
  ],
  "workflows-cluster": [ // cycle/automation arrows
    ["path", { d: "M4.5 12a7.5 7.5 0 0 1 13-5" }],
    ["polyline", { points: "16.5 3.5 17.5 7 14 7" }],
    ["path", { d: "M19.5 12a7.5 7.5 0 0 1-13 5" }],
    ["polyline", { points: "7.5 20.5 6.5 17 10 17" }],
  ],
  "field-operations": [ // map pin
    ["path", { d: "M12 21s-6.5-6.7-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.3-6.5 11-6.5 11z" }],
    ["circle", { cx: 12, cy: 9.7, r: 2.1 }],
  ],
  "security-compliance": [ // shield with check
    ["path", { d: "M12 3l7 3v5.5c0 4.6-3 8.2-7 9.5-4-1.3-7-4.9-7-9.5V6z" }],
    ["polyline", { points: "9 12.2 11 14.2 15.2 9.6" }],
  ],
  careers: [ // briefcase
    ["rect", { x: 3.5, y: 8, width: 17, height: 11, rx: 1.5 }],
    ["path", { d: "M8.5 8V6.3A1.8 1.8 0 0 1 10.3 4.5h3.4A1.8 1.8 0 0 1 15.5 6.3V8" }],
    ["line", { x1: 3.5, y1: 13, x2: 20.5, y2: 13 }],
  ],
  blog: [ // page with pen
    ["path", { d: "M6.5 3.5h8l3 3v14h-11z" }],
    ["polyline", { points: "14.5 3.5 14.5 6.5 17.5 6.5" }],
    ["line", { x1: 9, y1: 12.5, x2: 15, y2: 12.5 }],
    ["line", { x1: 9, y1: 16, x2: 15, y2: 16 }],
  ],
  "customer-portal": [ // person
    ["circle", { cx: 12, cy: 8, r: 3.4 }],
    ["path", { d: "M5.2 20c0-4 3-6.8 6.8-6.8s6.8 2.8 6.8 6.8" }],
  ],
  "data-pipeline": [ // flow with arrow
    ["path", { d: "M5 8h6.5A3.5 3.5 0 0 1 15 11.5V19" }],
    ["polyline", { points: "12 16 15 19 18 16" }],
    ["circle", { cx: 5, cy: 8, r: 1.3, fill: "currentColor" }],
  ],
  "payment-processing": [ // card
    ["rect", { x: 3, y: 6, width: 18, height: 12.5, rx: 2 }],
    ["line", { x1: 3, y1: 10.2, x2: 21, y2: 10.2 }],
    ["line", { x1: 6, y1: 15, x2: 10.5, y2: 15 }],
  ],
  "inventory-management": [ // box
    ["path", { d: "M3.5 8l8.5-4.5L20.5 8 12 12.5z" }],
    ["path", { d: "M3.5 8v9l8.5 4.5V12.5" }],
    ["path", { d: "M20.5 8v9L12 21.5V12.5" }],
  ],
  "integration-hub": [ // chain link
    ["path", { d: "M9.5 14.5l5-5" }],
    ["path", { d: "M7.3 11.8l-1.6 1.6a3.2 3.2 0 0 0 4.5 4.5l1.6-1.6" }],
    ["path", { d: "M16.7 12.2l1.6-1.6a3.2 3.2 0 0 0-4.5-4.5l-1.6 1.6" }],
  ],
  "predictive-analytics": [ // trend line with arrow
    ["line", { x1: 4, y1: 20, x2: 20, y2: 20 }],
    ["polyline", { points: "4.5 15.5 9.5 10.5 13 13.5 19.5 6.5" }],
    ["polyline", { points: "14.5 6.5 19.5 6.5 19.5 11.5" }],
  ],
  "zuper-arcade": [ // joystick — ball grip + stick rising from a wide base (previous
    // version, an arch over a two-button base, read as a padlock at small sizes)
    ["ellipse", { cx: 12, cy: 19, rx: 7, ry: 2 }],
    ["line", { x1: 12, y1: 17.5, x2: 12, y2: 9 }],
    ["circle", { cx: 12, cy: 6.3, r: 3.1, fill: "currentColor" }],
  ],
  terminal: [ // prompt
    ["rect", { x: 3, y: 4.5, width: 18, height: 15, rx: 1.8 }],
    ["polyline", { points: "7.5 10 10.5 12.5 7.5 15" }],
    ["line", { x1: 12.3, y1: 15, x2: 16, y2: 15 }],
  ],
  "more-apps": [ // dashed box with a plus — opens a drawer of every app not on the desktop
    ["rect", { x: 4, y: 4, width: 16, height: 16, rx: 2, strokeDasharray: "3 2.5" }],
    ["line", { x1: 12, y1: 9, x2: 12, y2: 15 }],
    ["line", { x1: 9, y1: 12, x2: 15, y2: 12 }],
  ],
};

/* Renders a MINIMAL_ICON_SHAPES entry as a plain flat SVG — thin uniform stroke, no
   canvas rasterization, no embossed shadow/highlight passes, no pixelation. This is
   the deliberate visual difference from PixelIcon below: crisp and minimal, not
   chunky and retro. */
function MinimalIcon({ shapeKey, size, className, color }) {
  const shapes = MINIMAL_ICON_SHAPES[shapeKey] || [];
  const c = color || CRT_GREEN;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      {shapes.map((s, i) => {
        const tag = s[0], a = s[1];
        const isDot = a.fill === "currentColor";
        const props = Object.assign({ key: i }, a, isDot ? { fill: c, stroke: "none" } : null);
        if (tag === "path") return <path {...props} />;
        if (tag === "rect") return <rect {...props} />;
        if (tag === "circle") return <circle {...props} />;
        if (tag === "ellipse") return <ellipse {...props} />;
        if (tag === "line") return <line {...props} />;
        if (tag === "polyline") return <polyline {...props} />;
        return null;
      })}
    </svg>
  );
}
const ENTITY_ICONS = {
  server: vintage("server", "\u{1F5A5}️"),
  database: vintage("database", "\u{1F5C4}️"),
  service: vintage("gear", "⚙️"),
  agent: vintage("robot", "\u{1F916}"),
  llm: vintage("spark", "✨"),
  report: vintage("bars", "\u{1F4CA}"),
  workflow: vintage("cycle", "\u{1F501}"),
  operations: vintage("wrench", "\u{1F6E0}️"),
};

const VINTAGE_ICON_SHAPES = {
  desktop: [["rect", { x: 3, y: 4, width: 18, height: 12, rx: 1 }], ["line", { x1: 8, y1: 20, x2: 16, y2: 20 }], ["line", { x1: 12, y1: 16, x2: 12, y2: 20 }]],
  chip: [["rect", { x: 7, y: 7, width: 10, height: 10, rx: 1 }], ["line", { x1: 9, y1: 2, x2: 9, y2: 7 }], ["line", { x1: 15, y1: 2, x2: 15, y2: 7 }], ["line", { x1: 9, y1: 17, x2: 9, y2: 22 }], ["line", { x1: 15, y1: 17, x2: 15, y2: 22 }], ["line", { x1: 2, y1: 9, x2: 7, y2: 9 }], ["line", { x1: 2, y1: 15, x2: 7, y2: 15 }], ["line", { x1: 17, y1: 9, x2: 22, y2: 9 }], ["line", { x1: 17, y1: 15, x2: 22, y2: 15 }]],
  robot: [["rect", { x: 5, y: 7, width: 14, height: 12, rx: 2 }], ["circle", { cx: 9.5, cy: 13, r: 1.3, fill: "currentColor" }], ["circle", { cx: 14.5, cy: 13, r: 1.3, fill: "currentColor" }], ["line", { x1: 12, y1: 7, x2: 12, y2: 3 }], ["circle", { cx: 12, cy: 2, r: 1, fill: "currentColor" }], ["line", { x1: 9, y1: 17, x2: 15, y2: 17 }]],
  cycle: [["path", { d: "M4 12a8 8 0 0 1 14-5" }], ["polyline", { points: "18 3 18 7 14 7" }], ["path", { d: "M20 12a8 8 0 0 1-14 5" }], ["polyline", { points: "6 21 6 17 10 17" }]],
  satellite: [["path", { d: "M4 15a9 9 0 0 1 9-9" }], ["path", { d: "M4 15l5 5" }], ["circle", { cx: 5, cy: 19, r: 1.3, fill: "currentColor" }], ["line", { x1: 13, y1: 6, x2: 19, y2: 12 }], ["line", { x1: 15, y1: 4, x2: 21, y2: 10 }]],
  lock: [["rect", { x: 5, y: 11, width: 14, height: 9, rx: 1.5 }], ["path", { d: "M8 11V7a4 4 0 0 1 8 0v4" }], ["circle", { cx: 12, cy: 15, r: 1.2, fill: "currentColor" }]],
  briefcase: [["rect", { x: 3, y: 8, width: 18, height: 11, rx: 1.5 }], ["path", { d: "M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }], ["line", { x1: 3, y1: 13, x2: 21, y2: 13 }]],
  memo: [["path", { d: "M6 3h9l3 3v15H6z" }], ["polyline", { points: "15 3 15 6 18 6" }], ["line", { x1: 9, y1: 12, x2: 15, y2: 12 }], ["line", { x1: 9, y1: 16, x2: 15, y2: 16 }]],
  person: [["circle", { cx: 12, cy: 8, r: 3.5 }], ["path", { d: "M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" }]],
  bars: [["line", { x1: 4, y1: 20, x2: 20, y2: 20 }], ["rect", { x: 6, y: 13, width: 3, height: 7 }], ["rect", { x: 11, y: 9, width: 3, height: 11 }], ["rect", { x: 16, y: 5, width: 3, height: 15 }]],
  card: [["rect", { x: 3, y: 6, width: 18, height: 12, rx: 1.5 }], ["line", { x1: 3, y1: 10, x2: 21, y2: 10 }], ["line", { x1: 6, y1: 15, x2: 10, y2: 15 }]],
  box: [["path", { d: "M3 8l9-5 9 5-9 5-9-5z" }], ["path", { d: "M3 8v9l9 5 9-5V8" }], ["line", { x1: 12, y1: 13, x2: 12, y2: 22 }]],
  link: [["path", { d: "M9 15l6-6" }], ["path", { d: "M7 12l-2 2a3.5 3.5 0 0 0 5 5l2-2" }], ["path", { d: "M17 12l2-2a3.5 3.5 0 0 0-5-5l-2 2" }]],
  orb: [["circle", { cx: 12, cy: 10, r: 7 }], ["line", { x1: 6, y1: 20, x2: 18, y2: 20 }], ["line", { x1: 9, y1: 20, x2: 10, y2: 17 }], ["line", { x1: 15, y1: 20, x2: 14, y2: 17 }], ["circle", { cx: 10, cy: 8, r: 1.3, fill: "currentColor" }]],
  joystick: [["rect", { x: 4, y: 10, width: 16, height: 9, rx: 3 }], ["circle", { cx: 9, cy: 14.5, r: 1.3, fill: "currentColor" }], ["circle", { cx: 15, cy: 14.5, r: 1.3, fill: "currentColor" }], ["path", { d: "M3 10a9 5 0 0 1 18 0" }]],
  prompt: [["rect", { x: 3, y: 5, width: 18, height: 14, rx: 1.5 }], ["polyline", { points: "7 10 10 12.5 7 15" }], ["line", { x1: 12, y1: 15, x2: 16, y2: 15 }]],
  server: [["rect", { x: 4, y: 4, width: 16, height: 5, rx: 1 }], ["rect", { x: 4, y: 10, width: 16, height: 5, rx: 1 }], ["rect", { x: 4, y: 16, width: 16, height: 4, rx: 1 }], ["circle", { cx: 7, cy: 6.5, r: 0.7, fill: "currentColor" }], ["circle", { cx: 7, cy: 12.5, r: 0.7, fill: "currentColor" }]],
  database: [["ellipse", { cx: 12, cy: 6, rx: 7, ry: 3 }], ["path", { d: "M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" }], ["path", { d: "M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" }]],
  gear: [["circle", { cx: 12, cy: 12, r: 3 }], ["path", { d: "M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" }]],
  spark: [["path", { d: "M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6z" }], ["path", { d: "M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" }]],
  wrench: [["path", { d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z" }]],
};

const PIXEL_GRID = 24;
const PIXEL_SHADOW = "#1a0f02";
const PIXEL_HIGHLIGHT = "#ffe3b3";

/* Traces one shape entry from VINTAGE_ICON_SHAPES onto a 2D canvas context, then
   strokes (or fills, for the small solid "dot" accents) it with whatever
   strokeStyle/fillStyle the caller already set. Rounded-rect corners are drawn as
   plain square corners on purpose — pixel-art icons read as chunky/blocky, not smooth. */
function paintVintageShape(ctx, shapeDef) {
  const tag = shapeDef[0], a = shapeDef[1];
  const isDot = a.fill === "currentColor";
  if (tag === "path") {
    const p = new Path2D(a.d);
    if (isDot) ctx.fill(p); else ctx.stroke(p);
    return;
  }
  ctx.beginPath();
  if (tag === "rect") ctx.rect(a.x, a.y, a.width, a.height);
  else if (tag === "circle") ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2);
  else if (tag === "ellipse") ctx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2);
  else if (tag === "line") { ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); }
  else if (tag === "polyline") {
    const pts = a.points.trim().split(/\s+/).map((p) => p.split(",").map(Number));
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  }
  if (isDot) ctx.fill(); else ctx.stroke();
}

/* Renders a vintage shape as a small native-resolution canvas, upscaled with
   image-rendering:pixelated — three offset passes (shadow / highlight / main) fake
   the classic embossed icon-pack bevel, all in the mono CRT accent color. */
function PixelIcon({ shape, size, className, color }) {
  const ref = useRef(null);
  const c = color || CRT_GREEN;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, PIXEL_GRID, PIXEL_GRID);
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    const shapes = VINTAGE_ICON_SHAPES[shape] || [];
    [
      { dx: 1.3, dy: 1.3, style: PIXEL_SHADOW, width: 3.4 },
      { dx: -0.9, dy: -0.9, style: PIXEL_HIGHLIGHT, width: 3 },
      { dx: 0, dy: 0, style: c, width: 2.2 },
    ].forEach(({ dx, dy, style, width }) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.strokeStyle = style;
      ctx.fillStyle = style;
      ctx.lineWidth = width;
      shapes.forEach((s) => paintVintageShape(ctx, s));
      ctx.restore();
    });
  }, [shape, c]);
  return (
    <canvas ref={ref} width={PIXEL_GRID} height={PIXEL_GRID} className={className}
      style={{ width: size, height: size, imageRendering: "pixelated", flexShrink: 0 }} />
  );
}

/* Renders a minimalist flat line icon if one's set (desktop/app icons), else a
   full-color pixel-art PNG (unused now, kept for anything not yet migrated), else a
   mono-CRT vintage embossed vector icon (ENTITY_ICONS), else a plain emoji fallback. */
function IconImg({ icon, size, className, color }) {
  if (!icon || typeof icon === "string") return <span className={className} style={{ fontSize: size }}>{icon}</span>;
  if (icon.minimal && MINIMAL_ICON_SHAPES[icon.minimal]) return <MinimalIcon shapeKey={icon.minimal} size={size} className={className} color={color} />;
  if (icon.img) return <img src={icon.img} alt="" draggable={false} className={className} style={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />;
  if (!icon.shape || !VINTAGE_ICON_SHAPES[icon.shape]) return <span className={className} style={{ fontSize: size, color: color || CRT_GREEN }}>{icon.fallback}</span>;
  return <PixelIcon shape={icon.shape} size={size} className={className} color={color} />;
}

/* ---------- Per-cluster accent color — purely cosmetic variety, not real Zuper branding ---------- */

/* ---------- Desktop display settings (icon/text size) — persisted, purely cosmetic ---------- */
/* "lg" bumped up further (was 70/1.75rem/15px/128) - direct follow-up after the desktop
   went from a dozen-plus icons down to 4 (see DESKTOP_VISIBLE_IDS): that much empty
   space read as unfinished rather than spacious, so Large is now a lot larger, and it's
   the new default (see iconSize's useState below) instead of Medium. */
const ICON_TILE_PX = { sm: 38, md: 52, lg: 96 };
const ICON_GLYPH_REM = { sm: "1.05rem", md: "1.35rem", lg: "2.4rem" };
const ICON_LABEL_REM = { sm: "11px", md: "13px", lg: "17px" };
const ICON_CELL_PX = { sm: 78, md: 100, lg: 168 };
const SIZE_OPTIONS = [{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }];

/* ---------- Mono CRT theme — the OS shell's only look. Reskins desktop bg, window
   chrome, taskbar, start menu, context menus, and icon tiles. Window CONTENT (readme/
   dashboard/game text) stays on a dark panel — full re-theming of every content pane
   was out of scope. Original amber/black CRT palette (was green/black — retinted per
   direct request), not copied from any specific trademarked terminal product. ---------- */
const THEME = {
  /* winBg is fully opaque (alpha 1, was .94) — direct feedback: the background
     watermark/logo was bleeding through open windows at 6% transparency, making text
     harder to read (worst inside Terminal, where CRT-green text sat right on top of
     the wordmark). Window content should never show the desktop behind it. */
  label: "Mono CRT", osBg: "#040200", winBg: "rgba(8,4,0,1)",
  winBorder: "#cc8400", winBorderFocused: "#ffd166",
  winRadius: "0px", winShadowFocused: () => "0 0 0 1px #ffd166, 0 0 24px rgba(255,209,102,.35)",
  winShadow: "0 0 0 1px rgba(204,132,0,.5)", winBlur: "none",
  titlebar: () => "linear-gradient(180deg, rgba(204,132,0,.18), transparent)",
  accent: CRT_GREEN, chromeText: "#ffd98a", chromeTextDim: "#c98a2e",
  taskbarBg: "#040200", panelBg: "rgba(8,4,0,.97)", panelBlur: "none",
  fontChrome: "'JetBrains Mono','Inconsolata',monospace",
};
/* ================= CRT desktop background: static scanlines + accent-color vignette ================= */
function ScanlineBackground({ color }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
      zIndex: 0,
      background: "repeating-linear-gradient(0deg, " + color + "12 0px, " + color + "12 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, " + color + "14, #000 75%)",
    }} />
  );
}

/* ================= Background watermark imprint — the real Zuper Labs logo
   mark (faint, behind) AND the real "Zuper Labs" wordmark image (the actual
   brand asset — white text in the same orange bracket-frame as the logo,
   not a recreated pixel-font approximation) on the same center point.
   Static, no glitch/breathe animation — the screen-glitch motion lives in
   ScreenGlitch instead, not here. ================= */
function GlitchWatermark() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
      <img src="./assets/zuper-logo.png" alt="" style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: "min(30vw, 380px)", height: "min(30vw, 380px)", objectFit: "contain", opacity: 0.08,
      }} />
      <img src="./assets/zuper-wordmark.png" alt="" style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: "min(58vw, 820px)", objectFit: "contain", opacity: 0.9,
      }} />
    </div>
  );
}

/* ================= Generic right-click context menu ================= */
function ContextMenu({ x, y, items, onClose, theme }) {
  useEffect(() => {
    function onDown() { onClose(); }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [onClose]);
  const t = theme || THEME;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(x, vw - 200);
  const top = Math.min(y, vh - items.length * 32 - 60);
  return (
    <div
      className="fixed z-[1900] min-w-[190px] py-1.5 font-mono font-medium text-[13px] overflow-hidden"
      style={{ left: left, top: top, background: t.panelBg, backdropFilter: t.panelBlur, borderRadius: t.winRadius === "0px" ? "0px" : "8px", boxShadow: bevel("out-deep", t.winBorder) + ", 0 20px 50px rgba(0,0,0,.6)", fontFamily: t.fontChrome || undefined }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((it, i) => it.divider ? (
        <div key={i} className="my-1.5 border-t" style={{ borderColor: t.winBorder }}></div>
      ) : (
        <button key={i} type="button" disabled={it.disabled}
          className="crt-item w-full text-left px-3.5 py-1.5 pl-5 flex items-center gap-2"
          style={{ color: it.disabled ? t.chromeTextDim + "80" : it.muted ? t.chromeTextDim : t.chromeText, opacity: it.disabled ? 0.55 : 1 }}
          onClick={() => { if (it.disabled) return; it.onSelect(); onClose(); }}>
          {it.icon && <span className="w-4 text-center">{it.icon}</span>}{it.label}
        </button>
      ))}
    </div>
  );
}

/* action (optional): {label, onClick} — used by trashIcon so a candidate who fat-
   fingers "Move to Trash" on a high-value icon (design review flagged the Careers
   icon specifically — one right-click + one click, no confirmation, gone from both
   the desktop and Start menu instantly) gets an immediate, low-friction undo right
   in the toast instead of having to hunt it down in the Recycle Bin. Stays up longer
   than a plain toast (4.5s vs 1.8s) since it's carrying an action, not just a status. */
function Toast({ text, action, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, action ? 4500 : 1800); return () => clearTimeout(t); }, [onDone, action]);
  return (
    <div className="fixed bottom-[64px] left-1/2 z-[1950] px-4 py-2 rounded-lg font-mono font-semibold text-[12px] text-white/92 flex items-center gap-3"
      style={{ transform: "translateX(-50%)", background: "rgba(20,21,28,.95)", border: "1px solid rgba(255,255,255,.15)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
      <span>{text}</span>
      {action && (
        <button type="button" onClick={() => { action.onClick(); onDone(); }}
          className="underline decoration-dotted underline-offset-2 hover:text-white flex-shrink-0" style={{ color: "#ffd98a" }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ================= Quick launcher (Find / Run) ================= */
function QuickLauncher({ title, placeholder, apps, onOpen, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  const matches = query.trim()
    ? apps.filter((a) => a.title.toLowerCase().includes(query.trim().toLowerCase()))
    : apps;

  function openAndClose(id) { onOpen(id); onClose(); }
  function onKeyDown(e) {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && matches.length > 0) openAndClose(matches[0].id);
  }

  return (
    <React.Fragment>
      <div className="fixed inset-0 z-[1940]" onClick={onClose}></div>
      <div className="fixed left-1/2 top-[22%] w-[380px] z-[1950] rounded-lg border border-white/10 overflow-hidden"
        style={{ transform: "translateX(-50%)", background: "rgba(16,17,23,.97)", backdropFilter: "blur(16px)", boxShadow: "0 24px 60px rgba(0,0,0,.6)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-white/10 font-mono font-semibold text-[13px] text-white/68">{title}</div>
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
          placeholder={placeholder} spellCheck={false} autoComplete="off"
          className="w-full px-4 py-3 bg-transparent outline-none text-white/92 font-mono font-medium text-[14px] placeholder-white/40 border-b border-white/10" />
        <div className="max-h-[260px] overflow-y-auto py-1.5">
          {matches.length === 0 && <div className="px-4 py-2 text-white/48 font-mono font-medium text-[11px]">No matching app.</div>}
          {matches.map((a) => (
            <button key={a.id} type="button" onClick={() => openAndClose(a.id)}
              className="crt-item w-full text-left px-4 py-2 pl-5 flex items-center gap-2.5 text-white/85 hover:text-white font-mono font-semibold text-[13px]">
              <IconImg icon={a.icon} size={20} className="w-5 text-center flex-shrink-0" />{a.title}
            </button>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

/* ================= Boot screen ================= */
function BootScreen({ onDone, extraLine }) {
  const linesRef = useRef(buildLines());
  const lines = linesRef.current;
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);

  /* Fixed for every visitor — direct request, after the first version read the real
     navigator/screen data (browser, core count, language, resolution), so the boot log
     looked different on every device and every visit. */
  function buildLines() {
    return [
      "ZUPER OS [concept build]",
      "────────────────────────────",
      "> checking runtime...",
      "  runtime OK",
      "> fetching real cluster data from labs.zuper.co/assets/js/zuper-world.js...",
      "  14 clusters · 39 entities · OK",
      "> mounting virtual file system...",
      "  /desktop  OK",
      "> ready.",
    ];
  }

  useEffect(() => {
    if (visibleCount >= lines.length) return;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), 130);
    return () => clearTimeout(t);
  }, [visibleCount, lines.length]);

  useEffect(() => {
    const safety = setTimeout(finish, 7000);
    function onKey() { finish(); }
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(safety); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line
  }, []);

  function finish() {
    setFading((f) => { if (f) return f; setTimeout(onDone, 250); return true; });
  }

  return (
    <div
      className={"fixed inset-0 z-[2000] p-6 font-terminal text-[1.25rem] leading-relaxed whitespace-pre-wrap cursor-pointer transition-opacity duration-300 " + (fading ? "opacity-0 pointer-events-none" : "opacity-100")}
      style={{ background: THEME.osBg, color: CRT_GREEN, textShadow: "0 0 8px " + CRT_GREEN + "70" }}
      onClick={finish}
    >
      {/* The real "Zuper Labs" wordmark image, once, above the boot log — direct
          request to use the real brand asset instead of a plain text line. */}
      <img src="./assets/zuper-wordmark.png" alt="Zuper Labs" className="mb-4" style={{ width: "min(60vw, 340px)" }} />
      {lines.slice(0, visibleCount).join("\n")}
      {visibleCount >= lines.length && extraLine && "\n" + extraLine}
      {visibleCount >= lines.length && (
        <div className="mt-5 text-white/48">[ click or press any key to continue ]</div>
      )}
    </div>
  );
}

/* ================= Window manager ================= */
function useWindowManager(defs) {
  const [state, setState] = useState(() => {
    const s = {};
    defs.forEach((d) => { s[d.id] = { open: false, minimized: false, maximized: false, x: d.rect.x, y: d.rect.y, w: d.rect.w, h: d.rect.h, z: 10, prevRect: null }; });
    return s;
  });
  const zRef = useRef(10);
  const [focusedId, setFocusedId] = useState(null);

  const focus = useCallback((id) => {
    zRef.current += 1;
    const z = zRef.current;
    setState((prev) => (prev[id] ? Object.assign({}, prev, { [id]: Object.assign({}, prev[id], { z: z }) }) : prev));
    setFocusedId(id);
  }, []);

  const open = useCallback((id) => {
    setState((prev) => (prev[id] ? Object.assign({}, prev, { [id]: Object.assign({}, prev[id], { open: true, minimized: false }) }) : prev));
    focus(id);
  }, [focus]);

  const close = useCallback((id) => {
    setState((prev) => Object.assign({}, prev, { [id]: Object.assign({}, prev[id], { open: false, minimized: false }) }));
    setFocusedId((f) => (f === id ? null : f));
  }, []);

  const minimize = useCallback((id) => {
    setState((prev) => Object.assign({}, prev, { [id]: Object.assign({}, prev[id], { minimized: true }) }));
    setFocusedId((f) => (f === id ? null : f));
  }, []);

  const move = useCallback((id, x, y) => {
    setState((prev) => Object.assign({}, prev, { [id]: Object.assign({}, prev[id], { x: x, y: y }) }));
  }, []);

  const resize = useCallback((id, w, h) => {
    setState((prev) => Object.assign({}, prev, { [id]: Object.assign({}, prev[id], { w: w, h: h }) }));
  }, []);

  const toggleMaximize = useCallback((id) => {
    setState((prev) => {
      const w = prev[id];
      if (w.maximized) return Object.assign({}, prev, { [id]: Object.assign({}, w, { maximized: false, x: w.prevRect.x, y: w.prevRect.y, w: w.prevRect.w, h: w.prevRect.h, prevRect: null }) });
      return Object.assign({}, prev, { [id]: Object.assign({}, w, { maximized: true, prevRect: { x: w.x, y: w.y, w: w.w, h: w.h } }) });
    });
    focus(id);
  }, [focus]);

  return { state, focus, open, close, minimize, move, resize, toggleMaximize, focusedId };
}

const MIN_W = 280, MIN_H = 200;

function Window({ id, title, x, y, w, h, z, color, theme, isFocused, isMaximized, minimized, onFocus, onMove, onResize, onClose, onMinimize, onToggleMaximize, stageRef, children }) {
  const headerRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const resizeRef = useRef(null);
  const [menu, setMenu] = useState(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(t); }, []);

  useEffect(() => {
    function onPointerMove(e) {
      const d = dragRef.current;
      const r = resizeRef.current;
      if (d.dragging) {
        const stage = stageRef.current;
        if (!stage) return;
        const stageRect = stage.getBoundingClientRect();
        const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
        const headerH = headerRef.current ? headerRef.current.offsetHeight : 36;
        const minVisibleW = Math.min(120, w);
        const nx = clamp(d.startLeft + dx, minVisibleW - w, stageRect.width - minVisibleW);
        const ny = clamp(d.startTop + dy, 0, Math.max(0, stageRect.height - headerH));
        onMove(id, nx, ny);
      } else if (r) {
        const stage = stageRef.current;
        const stageRect = stage ? stage.getBoundingClientRect() : { width: 4000, height: 4000 };
        const dx = e.clientX - r.startX, dy = e.clientY - r.startY;
        let nw = r.startW, nh = r.startH;
        if (r.dir.indexOf("e") !== -1) nw = clamp(r.startW + dx, MIN_W, stageRect.width - x);
        if (r.dir.indexOf("s") !== -1) nh = clamp(r.startH + dy, MIN_H, stageRect.height - y);
        onResize(id, nw, nh);
      }
    }
    function onPointerUp() { dragRef.current.dragging = false; resizeRef.current = null; }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
  }, [w, x, y, id, onMove, onResize, stageRef]);

  function handleHeaderPointerDown(e) {
    onFocus(id);
    if (isMaximized) return;
    if (e.target.closest("[data-winbtn]")) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startLeft: x, startTop: y };
  }
  function startResize(dir) {
    return function (e) {
      e.stopPropagation();
      onFocus(id);
      resizeRef.current = { dir: dir, startX: e.clientX, startY: e.clientY, startW: w, startH: h };
    };
  }

  if (minimized) return null;

  const t = theme || THEME;
  const c = color || t.accent;
  const style = Object.assign(
    isMaximized ? { left: 0, top: 0, width: "100%", height: "100%" } : { left: x, top: y, width: w, height: h },
    {
      zIndex: z,
      background: t.winBg,
      backdropFilter: t.winBlur,
      WebkitBackdropFilter: t.winBlur,
      border: "1px solid " + (isFocused ? t.winBorderFocused : t.winBorder),
      borderRadius: isMaximized ? 0 : t.winRadius,
      boxShadow: bevel("out-deep", isFocused ? t.winBorderFocused : t.winBorder) + ", " + (isFocused ? t.winShadowFocused(c) : t.winShadow),
      opacity: entered ? (isFocused ? undefined : 0.85) : 0,
      transform: entered ? "scale(1)" : "scale(.96)",
      transition: "transform .16s cubic-bezier(.16,.8,.24,1), opacity .16s, box-shadow .15s, filter .15s",
    }
  );

  return (
    <section
      className="absolute flex flex-col overflow-hidden"
      style={style}
      onPointerDown={() => onFocus(id)}
    >
      <div
        ref={headerRef}
        className="flex items-center gap-2.5 px-3 py-2 cursor-grab select-none flex-shrink-0"
        style={{ background: t.titlebar(c), borderBottom: "1px solid " + t.winBorder }}
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={(e) => { if (!e.target.closest("[data-winbtn]")) onToggleMaximize(id); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }}></span>
        <span className="flex-1 truncate font-mono font-semibold text-[13px] tracking-wide" style={{ color: t.chromeTextDim, fontFamily: t.fontChrome || undefined }}>{title}</span>
        <div className="flex gap-1">
          <button data-winbtn type="button" onClick={(e) => { e.stopPropagation(); onMinimize(id); }} className="w-[22px] h-[22px] flex items-center justify-center hover:scale-110 transition-transform" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>&#8211;</button>
          <button data-winbtn type="button" onClick={(e) => { e.stopPropagation(); onToggleMaximize(id); }} className="w-[22px] h-[22px] flex items-center justify-center hover:scale-110 transition-transform" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>&#9723;</button>
          <button data-winbtn type="button" onClick={(e) => { e.stopPropagation(); onClose(id); }} className="w-[22px] h-[22px] flex items-center justify-center hover:scale-110 transition-transform" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>&times;</button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 overflow-y-auto touch-pan-y bg-zinc-900/90">{children}</div>

      {!isMaximized && (
        <React.Fragment>
          <div className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize" onPointerDown={startResize("e")}></div>
          <div className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize" onPointerDown={startResize("s")}></div>
          <div className="absolute right-0 bottom-0 w-3.5 h-3.5 cursor-nwse-resize" onPointerDown={startResize("se")}></div>
        </React.Fragment>
      )}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} theme={t} items={[
          { label: isMaximized ? "Restore" : "Maximize", icon: "▢", onSelect: () => onToggleMaximize(id) },
          { label: "Minimize", icon: "—", onSelect: () => onMinimize(id) },
          { divider: true },
          { label: "Close", icon: "×", onSelect: () => onClose(id) },
        ]} />
      )}
    </section>
  );
}

/* ================= VFS-backed windows ================= */
function findCluster(worldData, id) { return worldData.find((c) => c.id === id); }

function FolderWindow({ clusterId, worldData, onOpenFile }) {
  const c = findCluster(worldData, clusterId);
  if (!c) return null;
  const appName = CLUSTER_APPS[clusterId];
  const files = [
    { key: "readme", label: "readme.md", glyph: "\u{1F4C4}" },
    { key: "status", label: "status.sh", glyph: "⚙️" },
    { key: "connections", label: "connections.sh", glyph: "\u{1F517}" },
  ];
  if (appName) files.push({ key: "app", label: appName, glyph: "\u{1F5A5}️" });

  return (
    <div className="p-4 font-mono">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/58 mb-1">/desktop/{clusterId}/</div>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {files.map((f) => (
          <button key={f.key} type="button" className="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-white/5" onDoubleClick={() => onOpenFile(clusterId, f.key)}>
            <span className="text-3xl">{f.glyph}</span>
            <span className="text-[13px] font-semibold text-white/85 text-center leading-tight break-words">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MarkdownWindow({ clusterId, worldData }) {
  const c = findCluster(worldData, clusterId);
  if (!c) return null;
  return (
    <div className="p-5">
      <h1 className="text-white text-[18px] font-bold mt-3 mb-1 font-mono">{c.name}</h1>
      <p className="text-white/58 text-[10px] font-medium font-mono mb-4">readme.md · {c.entities.length} entit{c.entities.length === 1 ? "y" : "ies"}</p>
      {c.entities.map((e) => (
        <div key={e.id} className="mb-4">
          <h2 className="text-white text-[16px] font-bold mb-1 flex items-center gap-2"><IconImg icon={ENTITY_ICONS[e.type] || "■"} size={22} className="inline-block" /> {e.name} <span className="text-white/48 text-[10px] font-semibold font-mono uppercase align-middle">{e.type}</span></h2>
          <p className="text-white/85 text-[14px] font-medium leading-relaxed mb-1.5">{e.description}</p>
          {e.details && (
            <ul className="text-white/72 text-[14px] font-medium leading-loose pl-5 list-disc">
              {e.details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      ))}
      <p className="text-white/40 text-[10px] font-medium italic mt-4 border-t border-white/10 pt-3">Source: labs.zuper.co /assets/js/zuper-world.js (fetched and verified this session). This reader's chrome is a concept UI; the entity names, types, descriptions, and details above are Zuper's real data, unedited.</p>
    </div>
  );
}

function ShellStatusWindow({ clusterId, worldData }) {
  const c = findCluster(worldData, clusterId);
  const [lines, setLines] = useState([]);
  const [running, setRunning] = useState(false);
  const logRef = useRef(null);

  const script = useMemo(() => {
    if (!c) return [];
    const out = ["$ bash status.sh"];
    c.entities.forEach((e) => {
      const port = 8000 + (e.id.length * 17) % 900;
      const ms = 30 + (e.id.length * 13) % 200;
      out.push("[OK] " + e.id + " (" + e.type + ") responding on port " + port + " — " + ms + "ms");
    });
    out.push("[OK] all " + c.entities.length + " node(s) nominal.");
    return out;
  }, [c]);

  function run() {
    setLines([]); setRunning(true);
    script.forEach((line, i) => {
      setTimeout(() => setLines((prev) => prev.concat(line)), i * 220);
    });
    setTimeout(() => setRunning(false), script.length * 220 + 100);
  }

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [clusterId]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines]);

  if (!c) return null;
  return (
    <div className="p-3 flex flex-col h-full font-terminal font-medium text-[14px]">
      <div ref={logRef} className="flex-1 overflow-y-auto space-y-0.5">
        {lines.map((l, i) => <div key={i} style={{ color: CRT_GREEN, opacity: l.indexOf("$") === 0 ? 1 : 0.8 }}>{l}</div>)}
      </div>
      <button type="button" disabled={running} className="mt-2 self-start border border-white/15 rounded px-2 py-1 text-white/85 hover:border-white/30 disabled:opacity-40" onClick={run}>Re-run</button>
    </div>
  );
}

function ShellConnectionsWindow({ clusterId, worldData }) {
  const c = findCluster(worldData, clusterId);
  if (!c) return null;
  return (
    <div className="p-3 flex flex-col h-full font-terminal font-medium text-[14px]">
      <div className="flex-1 overflow-y-auto space-y-1">
        <div style={{ color: CRT_GREEN }}>$ bash connections.sh</div>
        {c.flows.length === 0 && <div className="text-white/58">no outbound flows defined for this cluster.</div>}
        {c.flows.map((f) => (
          <div key={f.id} className="text-white/85">
            {f.from} <span className="text-white/48">→</span> {f.to}
            <span className="text-white/48"> [{f.signalType}, freq {f.frequency}, speed {f.speed}]</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardWindow({ clusterId, worldData }) {
  const c = findCluster(worldData, clusterId);
  if (!c) return null;
  const appName = CLUSTER_APPS[clusterId];
  return (
    <div className="p-5">
      <h1 className="text-white text-[18px] font-bold mt-3 mb-3 font-mono">{appName}</h1>
      <div className="grid grid-cols-2 gap-3">
        {c.entities.map((e) => (
          <div key={e.id} className="border border-white/10 rounded-lg p-3">
            <div className="mb-1.5"><IconImg icon={ENTITY_ICONS[e.type] || "■"} size={30} /></div>
            <div className="text-white text-[14px] font-semibold font-mono">{e.name}</div>
            <div className="text-white/58 text-[10px] font-semibold uppercase font-mono mb-1.5">{e.type} · {e.category}</div>
            <p className="text-white/78 text-[14px] font-medium leading-relaxed">{e.description}</p>
          </div>
        ))}
      </div>
      <p className="text-white/40 text-[10px] font-medium italic mt-4">"{appName}" is a concept UI shell wrapping labs.zuper.co's real entity data — not a confirmed real Zuper product name.</p>
    </div>
  );
}

function PropertiesWindow({ worldData }) {
  const totalEntities = worldData.reduce((s, c) => s + c.entities.length, 0);
  const totalFlows = worldData.reduce((s, c) => s + c.flows.length, 0);
  return (
    <div className="p-5 font-mono">
      <h1 className="text-white text-[18px] font-bold mb-3">Zuper Web OS — Properties</h1>
      <div className="flex flex-col gap-1.5 text-[14px] font-medium text-white/78 mb-4">
        <div>Clusters: <span className="text-white/92">{worldData.length}</span> (real, from labs.zuper.co)</div>
        <div>Entities: <span className="text-white/92">{totalEntities}</span></div>
        <div>Connection flows: <span className="text-white/92">{totalFlows}</span></div>
        <div>Build: <span className="text-white/92">concept prototype</span> (React + Tailwind, no backend)</div>
      </div>
      <p className="text-white/48 text-[10px] font-medium italic mt-4">This is a static desktop metaphor over real Zuper Labs scene data — no actual file system, accounts, or persistence beyond your browser's localStorage (icon positions/names only).</p>
    </div>
  );
}

function SizeRadioRow({ label, value, onChange, options }) {
  const opts = options || SIZE_OPTIONS;
  return (
    <div className="mb-5">
      <div className="text-white/68 text-[13px] font-semibold font-mono mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {opts.map((o) => {
          const active = value === o.value;
          return (
            <button key={o.value} type="button" onClick={() => onChange(o.value)}
              className="px-3.5 py-1.5 rounded-lg border font-mono font-semibold text-[12px] transition-colors"
              style={{
                borderColor: active ? ACCENT : "rgba(255,255,255,.15)",
                color: active ? "#fff" : "rgba(255,255,255,.68)",
                background: active ? ACCENT + "26" : "transparent",
              }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DisplaySettingsWindow({ iconSize, setIconSize, textSize, setTextSize }) {
  return (
    <div className="p-5">
      <h1 className="text-white text-[18px] font-bold mb-4 font-mono">Display settings</h1>
      <SizeRadioRow label="Icon size" value={iconSize} onChange={setIconSize} />
      <SizeRadioRow label="Text size" value={textSize} onChange={setTextSize} />
      <p className="text-white/48 text-[10px] font-medium italic mt-2">Changes apply immediately and are saved to this browser (localStorage) — nothing is sent anywhere.</p>
    </div>
  );
}

/* "Move to Trash" on a desktop icon only ever hid it (added the id to hiddenIconIds) —
   nothing was ever actually deleted, but there was no dedicated place to SEE or restore
   what's in there beyond a one-line toast ("Arrange icons restores it", which also
   resets every icon's position, not just the trashed ones). Direct request: a real,
   discoverable Recycle Bin, reachable from the Start menu, that lists exactly what's
   trashed and restores it one item at a time (or all at once) without touching anyone's
   arranged layout. */
function RecycleBinWindow({ trashedItems, onRestore, onRestoreAll }) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-white text-[18px] font-bold m-0 font-mono">Recycle Bin</h1>
        {trashedItems.length > 0 && (
          <button type="button" onClick={onRestoreAll} className="px-2.5 py-1 text-[12px] font-semibold rounded" style={{ background: ACCENT + "26", color: ACCENT }}>Restore all</button>
        )}
      </div>
      {trashedItems.length === 0 ? (
        <p className="text-white/48 text-[13px] font-medium italic">Empty — nothing's been moved to Trash.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {trashedItems.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded" style={{ background: "rgba(255,255,255,.05)" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <IconImg icon={a.icon} size={20} className="w-5 text-center flex-shrink-0" color={ACCENT} />
                <span className="text-white/85 text-[13px] font-medium truncate">{a.title}</span>
              </div>
              <button type="button" onClick={() => onRestore(a.id)} className="px-2.5 py-1 text-[12px] font-semibold rounded flex-shrink-0" style={{ background: "rgba(255,255,255,.1)", color: "#fff" }}>Restore</button>
            </div>
          ))}
        </div>
      )}
      <p className="text-white/48 text-[10px] font-medium italic mt-4">Nothing here is ever actually deleted — "Trash" only hides an icon from the desktop. Restoring puts it back where it was.</p>
    </div>
  );
}

/* More_Apps.exe originally just showed a toast ("more apps on the way") standing in for
   Zuper's wider product suite - direct follow-up: since the other 11 real clusters and
   Terminal.app already exist and work (just not pinned to the 4-icon desktop, see
   DESKTOP_VISIBLE_IDS), it makes more sense for this to actually open them than to fake
   not having them. Single click, matching every other icon on the desktop now. */
function AppDrawerWindow({ apps, onOpen }) {
  return (
    <div className="p-4 font-mono">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/58 mb-3">More apps — everything not pinned to the desktop</div>
      <div className="grid grid-cols-3 gap-3">
        {apps.map((a) => (
          <button key={a.id} type="button" onClick={() => onOpen(a.id)}
            className="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-white/5">
            <IconImg icon={a.icon} size={30} color={CRT_GREEN} />
            <span className="text-[12px] font-semibold text-white/85 text-center leading-tight break-words">{a.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= Games (unchanged mechanics, real cluster tags) ================= */
function RouteRacerGame({ onComplete, accent }) {
  const GRID = 8, MOVE_LIMIT = 34, CELL = 42;
  const a = accent || CRT_GREEN;
  const canvasRef = useRef(null);
  const [pops, setPops] = useState([]);
  const popIdRef = useRef(0);
  function pushPop(text, color) {
    const id = popIdRef.current++;
    setPops((p) => p.concat([{ id, text, color }]));
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== id)), 700);
  }
  function makeState() {
    const blocked = [], jobs = []; const taken = new Set(["0,0"]);
    while (blocked.length < 9) { const bx = rand(GRID), by = rand(GRID), k = bx + "," + by; if (!taken.has(k)) { blocked.push({ x: bx, y: by }); taken.add(k); } }
    while (jobs.length < 3) { const jx = rand(GRID), jy = rand(GRID), k = jx + "," + jy; if (!taken.has(k)) { jobs.push({ x: jx, y: jy, visited: false }); taken.add(k); } }
    return { pos: { x: 0, y: 0 }, moves: 0, done: false, blocked: blocked, jobs: jobs, message: "Visit all three job sites before you run out of moves." };
  }
  const [state, setState] = useState(makeState);
  function move(dir) {
    setState((prev) => {
      if (prev.done) return prev;
      const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
      const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
      const nx = prev.pos.x + dx, ny = prev.pos.y + dy;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return prev;
      if (prev.blocked.some((b) => b.x === nx && b.y === ny)) return prev;
      const hitJob = prev.jobs.some((j) => j.x === nx && j.y === ny && !j.visited);
      const jobs = prev.jobs.map((j) => (j.x === nx && j.y === ny ? Object.assign({}, j, { visited: true }) : j));
      if (hitJob) { pushPop("+1 JOB", a); playArcadeSuccessSound(); }
      const movesN = prev.moves + 1;
      const allVisited = jobs.every((j) => j.visited);
      let done = prev.done, message = prev.message;
      if (allVisited) { done = true; message = "All job sites reached in " + movesN + " moves."; setTimeout(() => onComplete("Route Racer complete", message), 0); }
      else if (movesN >= MOVE_LIMIT) { done = true; message = "Out of moves — press Restart to try a new layout."; }
      return Object.assign({}, prev, { pos: { x: nx, y: ny }, moves: movesN, jobs: jobs, done: done, message: message });
    });
  }
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#040200"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,176,0,0.14)";
    for (let i = 0; i <= GRID; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke(); }
    ctx.fillStyle = "rgba(20,10,2,0.9)"; ctx.strokeStyle = "rgba(255,176,0,0.4)";
    state.blocked.forEach((b) => { ctx.fillRect(b.x * CELL + 3, b.y * CELL + 3, CELL - 6, CELL - 6); ctx.strokeRect(b.x * CELL + 3, b.y * CELL + 3, CELL - 6, CELL - 6); });
    state.jobs.forEach((j) => {
      ctx.save();
      ctx.fillStyle = j.visited ? "rgba(255,176,0,0.3)" : a;
      if (!j.visited) { ctx.shadowColor = a; ctx.shadowBlur = 10; }
      ctx.beginPath(); ctx.arc(j.x * CELL + CELL / 2, j.y * CELL + CELL / 2, 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.save();
    ctx.shadowColor = "#fff3e0"; ctx.shadowBlur = 8;
    ctx.fillStyle = "#fff3e0"; ctx.beginPath(); ctx.arc(state.pos.x * CELL + CELL / 2, state.pos.y * CELL + CELL / 2, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }, [state, a]);
  useEffect(() => {
    function onKey(e) { const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }; if (map[e.key]) { e.preventDefault(); move(map[e.key]); } }
    const el = canvasRef.current; if (el) el.addEventListener("keydown", onKey);
    return () => { if (el) el.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line
  }, []);
  const remaining = state.jobs.filter((j) => !j.visited).length;
  /* Grid + d-pad used to stack vertically (canvas, then a 2-row d-pad, then the message
     line, all centered) — tall enough that on a real ~650px-tall browser window the
     d-pad and message text landed below the fold, confirmed live by a product-design
     review. Side-by-side layout instead: same total content, well under half the
     height, so it fits the arcade window's default size with room to spare instead of
     depending on scroll (which a canvas element doesn't reliably forward wheel events
     through anyway). */
  return (
    <div className="flex flex-col gap-3 p-4 relative">
      <FloatPops pops={pops} />
      <div className="w-full flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Moves: {state.moves} / {MOVE_LIMIT}</span><span>Jobs remaining: {remaining}</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => setState(makeState())}>Restart</button>
      </div>
      <div className="flex items-center justify-center gap-5">
        <canvas ref={canvasRef} tabIndex={0} width={GRID * CELL} height={GRID * CELL} className="outline-none flex-shrink-0" style={{ boxShadow: bevel("in-deep", a) }} aria-label="Route Racer grid. Use arrow keys to move."></canvas>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => move("up")} aria-label="Move up">&#8593;</button>
          <div className="flex gap-1">
            <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => move("left")} aria-label="Move left">&#8592;</button>
            <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => move("down")} aria-label="Move down">&#8595;</button>
            <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => move("right")} aria-label="Move right">&#8594;</button>
          </div>
        </div>
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{state.message}</p>
    </div>
  );
}

function DispatchTetrisGame({ onComplete, accent }) {
  const a = accent || CRT_GREEN;
  const TECHS = ["Tech A", "Tech B", "Tech C"], SLOTS = 8, TIME_LIMIT = 45;
  function makeQueue() { const q = []; for (let i = 0; i < 8; i++) q.push(Math.random() < 0.5 ? 1 : 2); return q; }
  function canPlace(sched, t, s, dur) { if (s + dur > SLOTS) return false; for (let i = s; i < s + dur; i++) if (sched[t][i]) return false; return true; }
  function anyValidSlot(sched, dur) { for (let t = 0; t < TECHS.length; t++) for (let s = 0; s < SLOTS; s++) if (canPlace(sched, t, s, dur)) return true; return false; }
  const [schedule, setSchedule] = useState(() => TECHS.map(() => new Array(SLOTS).fill(false)));
  const [queue, setQueue] = useState(makeQueue);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("Click a slot to place the current job into that many consecutive open hours.");
  const [invalidCell, setInvalidCell] = useState(null);
  const [pops, setPops] = useState([]);
  const popIdRef = useRef(0);
  function pushPop(text, color) {
    const id = popIdRef.current++;
    setPops((p) => p.concat([{ id, text, color }]));
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== id)), 700);
  }
  useEffect(() => { if (done) return; const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000); return () => clearInterval(timer); }, [done]);
  useEffect(() => { if (!done && timeLeft === 0) { setDone(true); setMessage("Time's up. " + score + " job(s) scheduled, " + misses + " skipped."); } /* eslint-disable-next-line */ }, [timeLeft]);
  function place(t, s) {
    if (done || queue.length === 0) return;
    const dur = queue[0];
    if (!canPlace(schedule, t, s, dur)) { setInvalidCell(t + "," + s); setTimeout(() => setInvalidCell(null), 220); return; }
    const next = schedule.map((row) => row.slice());
    for (let i = s; i < s + dur; i++) next[t][i] = true;
    setSchedule(next);
    pushPop("+SCHEDULED", a); playArcadeSuccessSound();
    const newScore = score + 1; setScore(newScore);
    let nq = queue.slice(1); let nMisses = misses;
    if (nq.length > 0 && !anyValidSlot(next, nq[0])) { nMisses += 1; nq = nq.slice(1); }
    setMisses(nMisses); setQueue(nq);
    if (nq.length === 0) { setDone(true); const summary = newScore + " job(s) scheduled, " + nMisses + " skipped."; setMessage("Queue cleared. " + summary); setTimeout(() => onComplete("Dispatch Tetris complete", summary), 0); }
  }
  function restart() { setSchedule(TECHS.map(() => new Array(SLOTS).fill(false))); setQueue(makeQueue()); setScore(0); setMisses(0); setTimeLeft(TIME_LIMIT); setDone(false); setMessage("Click a slot to place the current job into that many consecutive open hours."); }
  return (
    <div className="p-4 flex flex-col gap-3 relative">
      <FloatPops pops={pops} />
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Placed: {score}</span><span>Skipped: {misses}</span><span>Time: {timeLeft}s</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={restart}>Restart</button>
      </div>
      <div>
        <div className="text-[11px] font-medium mb-1.5 font-mono" style={{ color: "#c98a2e" }}>Next job:</div>
        {queue.length > 0 && <div className="w-11 h-[34px] flex items-center justify-center font-mono font-semibold text-[13px]" style={{ background: a, color: "#040200", boxShadow: bevel("out-shallow", a) }}>{queue[0]}h</div>}
      </div>
      <div className="flex flex-col gap-1.5">
        {TECHS.map((name, t) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-14 text-[11px] font-medium font-mono" style={{ color: "#c98a2e" }}>{name}</div>
            <div className="flex gap-1">
              {Array.from({ length: SLOTS }).map((_, s) => {
                const isInvalid = invalidCell === t + "," + s;
                return (
                  <button key={s} type="button" aria-label={name + " hour " + (s + 1) + (schedule[t][s] ? " (booked)" : " (open)")} onClick={() => place(t, s)}
                    className="w-8 h-8 transition-colors"
                    style={{
                      background: isInvalid ? "#fff3e0" : schedule[t][s] ? a + "40" : "rgba(20,10,0,.4)",
                      boxShadow: bevel(isInvalid || schedule[t][s] ? "in-shallow" : "out-shallow", a),
                    }}></button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
    </div>
  );
}

const WIRING_PAIRS = [
  { trigger: "New job created", action: "Notify assigned technician" },
  { trigger: "Job marked complete", action: "Send customer invoice" },
  { trigger: "Technician goes offline", action: "Reassign open jobs" },
  { trigger: "Inventory below threshold", action: "Create reorder task" },
];

function WorkflowWiringGame({ onComplete, accent }) {
  const a2 = accent || CRT_GREEN;
  const pairsRef = useRef(WIRING_PAIRS);
  const actionsRef = useRef(shuffle(WIRING_PAIRS.map((p) => p.action)));
  const [selected, setSelected] = useState(null);
  const [wired, setWired] = useState({});
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("Click a trigger, then click its matching action.");
  const [flashWrong, setFlashWrong] = useState(null);
  const [pops, setPops] = useState([]);
  const popIdRef = useRef(0);
  function pushPop(text, color) {
    const id = popIdRef.current++;
    setPops((p) => p.concat([{ id, text, color }]));
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== id)), 700);
  }
  function pickTrigger(t) { if (wired[t]) return; setSelected(t); setMessage("Now pick the action it should fire."); }
  function pickAction(action) {
    if (!selected) return;
    const correct = pairsRef.current.find((p) => p.trigger === selected).action;
    if (action === correct) {
      const nextWired = Object.assign({}, wired, { [selected]: action });
      setWired(nextWired); setSelected(null);
      setMessage("Wired: “" + selected + "” → “" + action + "”.");
      pushPop("+WIRED", a2); playArcadeSuccessSound();
      if (Object.keys(nextWired).length === pairsRef.current.length) {
        const summary = pairsRef.current.length + " trigger(s) wired, " + mistakes + " mistake(s).";
        setMessage("All triggers wired. " + summary);
        setTimeout(() => onComplete("Workflow Wiring complete", summary), 0);
      }
    } else {
      setMistakes((m) => m + 1); setFlashWrong(action); setTimeout(() => setFlashWrong(null), 220);
      playArcadeFailSound();
      setMessage("Not a match — try again.");
    }
  }
  const allWired = Object.keys(wired).length === pairsRef.current.length;
  return (
    <div className="p-4 flex flex-col gap-3 relative">
      <FloatPops pops={pops} />
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Wired: {Object.keys(wired).length} / {pairsRef.current.length}</span><span>Mistakes: {mistakes}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide font-mono" style={{ color: "#c98a2e" }}>Triggers</div>
          {pairsRef.current.map((p) => (
            <button key={p.trigger} type="button" disabled={!!wired[p.trigger]} onClick={() => pickTrigger(p.trigger)}
              className="text-left text-[12px] font-semibold px-2.5 py-2 disabled:opacity-40"
              style={{
                background: wired[p.trigger] ? a2 + "40" : "rgba(20,10,0,.4)", color: "#ffd98a",
                boxShadow: bevel(wired[p.trigger] || selected === p.trigger ? "in-shallow" : "out-shallow", a2),
              }}>{p.trigger}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide font-mono" style={{ color: "#c98a2e" }}>Actions</div>
          {actionsRef.current.map((act) => {
            const isWiredAction = Object.values(wired).includes(act);
            const isWrong = flashWrong === act;
            return (
              <button key={act} type="button" disabled={isWiredAction} onClick={() => pickAction(act)}
                className="text-left text-[12px] font-semibold px-2.5 py-2 disabled:opacity-40 transition-colors"
                style={{
                  background: isWrong ? "#fff3e0" : isWiredAction ? a2 + "40" : "rgba(20,10,0,.4)", color: isWrong ? "#040200" : "#ffd98a",
                  boxShadow: bevel(isWiredAction || isWrong ? "in-shallow" : "out-shallow", a2),
                }}>{act}</button>
            );
          })}
        </div>
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {allWired && <p className="text-center text-[12px] font-semibold font-mono" style={{ color: CONCEPT }}>Done — see the achievement note below.</p>}
    </div>
  );
}

function SystemStabilizerGame({ onComplete, accent }) {
  const a = accent || CRT_GREEN;
  const METERS = ["CPU", "Memory", "API Load"];
  const DURATION = 30;
  const [values, setValues] = useState({ CPU: 50, Memory: 50, "API Load": 50 });
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("Keep every meter between 25–75 until time runs out.");
  useEffect(() => {
    if (done) return;
    const drift = setInterval(() => { setValues((v) => { const nv = {}; METERS.forEach((m) => { nv[m] = clamp(v[m] + (Math.random() - 0.42) * 14, 0, 100); }); return nv; }); }, 900);
    const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => { clearInterval(drift); clearInterval(timer); };
    // eslint-disable-next-line
  }, [done]);
  useEffect(() => {
    if (done) return;
    const overloaded = METERS.find((m) => values[m] >= 96 || values[m] <= 4);
    if (overloaded) { setDone(true); setMessage(overloaded + " overloaded — system unstable. Restart to try again."); }
    else if (timeLeft === 0) { setDone(true); const summary = "All systems held stable for the full run."; setMessage(summary); setTimeout(() => onComplete("System Stabilizer complete", summary), 0); }
    // eslint-disable-next-line
  }, [values, timeLeft]);
  function nudge(meter, dir) { if (done) return; setValues((v) => Object.assign({}, v, { [meter]: clamp(v[meter] + dir * 12, 0, 100) })); }
  function restart() { setValues({ CPU: 50, Memory: 50, "API Load": 50 }); setTimeLeft(DURATION); setDone(false); setMessage("Keep every meter between 25–75 until time runs out."); }
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Time: {timeLeft}s</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={restart}>Restart</button>
      </div>
      <div className="flex flex-col gap-3">
        {METERS.map((m) => {
          const v = values[m]; const safe = v > 25 && v < 75;
          const meterColor = safe ? a : "#fff3e0";
          return (
            <div key={m} className="flex items-center gap-3">
              <div className="w-20 text-[11px] font-medium font-mono" style={{ color: "#c98a2e" }}>{m}</div>
              <div className="flex-1 h-3 overflow-hidden" style={{ boxShadow: bevel("in-shallow", a), background: "rgba(20,10,0,.5)" }}>
                <div className="h-full transition-[width]" style={{ width: v + "%", background: meterColor, opacity: safe ? 0.8 : 1, animation: safe ? "none" : "crt-icon-glow 1s ease-in-out infinite" }}></div>
              </div>
              <button type="button" className="w-7 h-7" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => nudge(m, -1)}>&#8722;</button>
              <button type="button" className="w-7 h-7" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => nudge(m, 1)}>+</button>
            </div>
          );
        })}
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
    </div>
  );
}

/* ================= Pipe Flow — Data Pipeline =================
   A rotate-the-segment pipe puzzle: click a pipe piece to spin it 90°, connect the
   glowing source to the target before the run clock hits zero. Grid grows each level.
   The solved layout is generated first (a random monotonic right/down path from
   corner to corner), then every middle segment is scrambled by a known rotation count
   — so every generated puzzle is guaranteed solvable by rotating only the clickable
   pieces, never the fixed source/target anchors. */
const PIPE_LEVELS = [{ rows: 3, cols: 3 }, { rows: 3, cols: 4 }, { rows: 4, cols: 4 }, { rows: 4, cols: 5 }];
const PIPE_DIRS = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const PIPE_OPP = { N: "S", S: "N", E: "W", W: "E" };
const PIPE_ORDER = ["N", "E", "S", "W"];
const PIPE_TOTAL_TIME = 90;

function pipeRotate(conn) {
  const next = {};
  for (let i = 0; i < 4; i++) next[PIPE_ORDER[(i + 1) % 4]] = conn[PIPE_ORDER[i]];
  return next;
}
function pipeEmptyConn() { return { N: false, E: false, S: false, W: false }; }
function generatePipeLevel(rows, cols) {
  const path = [{ r: 0, c: 0 }];
  let r = 0, c = 0;
  while (r < rows - 1 || c < cols - 1) {
    let goRight;
    if (r === rows - 1) goRight = true;
    else if (c === cols - 1) goRight = false;
    else goRight = Math.random() < 0.5;
    if (goRight) c++; else r++;
    path.push({ r, c });
  }
  const grid = [];
  for (let i = 0; i < rows; i++) { const row = []; for (let j = 0; j < cols; j++) row.push({ type: "empty", connections: pipeEmptyConn(), fixed: true }); grid.push(row); }
  for (let i = 0; i < path.length; i++) {
    const cur = path[i];
    const conn = pipeEmptyConn();
    if (i > 0) { const prev = path[i - 1]; const inDir = prev.r < cur.r ? "N" : prev.r > cur.r ? "S" : prev.c < cur.c ? "W" : "E"; conn[inDir] = true; }
    if (i < path.length - 1) { const nxt = path[i + 1]; const outDir = nxt.r > cur.r ? "S" : nxt.r < cur.r ? "N" : nxt.c > cur.c ? "E" : "W"; conn[outDir] = true; }
    const isSource = i === 0, isDest = i === path.length - 1;
    let finalConn = conn;
    const fixed = isSource || isDest;
    if (!fixed) { const spins = 1 + Math.floor(Math.random() * 3); for (let s = 0; s < spins; s++) finalConn = pipeRotate(finalConn); }
    grid[cur.r][cur.c] = { type: isSource ? "source" : isDest ? "dest" : "pipe", connections: finalConn, fixed: fixed };
  }
  return grid;
}
function pipeIsSolved(grid, rows, cols) {
  const visited = new Set(["0,0"]);
  const stack = [[0, 0]];
  while (stack.length) {
    const cur = stack.pop(); const r = cur[0], c = cur[1];
    const cell = grid[r][c];
    for (const dir of PIPE_ORDER) {
      if (!cell.connections[dir]) continue;
      const d = PIPE_DIRS[dir]; const nr = r + d[0], nc = c + d[1];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const neighbor = grid[nr][nc];
      if (!neighbor.connections[PIPE_OPP[dir]]) continue;
      const key = nr + "," + nc;
      if (!visited.has(key)) { visited.add(key); stack.push([nr, nc]); }
    }
  }
  return visited.has((rows - 1) + "," + (cols - 1));
}
function PipeCell({ cell, size, solved, accent }) {
  if (cell.type === "empty") return <div style={{ width: size, height: size }} />;
  const mid = size / 2, thick = size * 0.24;
  const color = solved ? "#ffe3b3" : (cell.type === "source" || cell.type === "dest") ? CONCEPT : (accent || CRT_GREEN);
  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} style={{ filter: solved ? "drop-shadow(0 0 4px #ffe3b3)" : "none" }}>
      {cell.connections.N && <rect x={mid - thick / 2} y={0} width={thick} height={mid + thick / 2} fill={color} />}
      {cell.connections.S && <rect x={mid - thick / 2} y={mid - thick / 2} width={thick} height={mid + thick / 2} fill={color} />}
      {cell.connections.W && <rect x={0} y={mid - thick / 2} width={mid + thick / 2} height={thick} fill={color} />}
      {cell.connections.E && <rect x={mid - thick / 2} y={mid - thick / 2} width={mid + thick / 2} height={thick} fill={color} />}
      <circle cx={mid} cy={mid} r={thick * 0.62} fill={color} />
      {(cell.type === "source" || cell.type === "dest") && <circle cx={mid} cy={mid} r={thick * 0.28} fill="#040200" />}
    </svg>
  );
}
function PipeFlowGame({ onComplete, accent }) {
  const a = accent || CRT_GREEN;
  const [levelIndex, setLevelIndex] = useState(0);
  const [grid, setGrid] = useState(() => generatePipeLevel(PIPE_LEVELS[0].rows, PIPE_LEVELS[0].cols));
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PIPE_TOTAL_TIME);
  const [done, setDone] = useState(false);
  const [clearedLevels, setClearedLevels] = useState(0);
  const [message, setMessage] = useState("Click a pipe segment to rotate it. Connect the glowing source to the target.");
  const [pops, setPops] = useState([]);
  const popIdRef = useRef(0);
  const [best] = useState(() => loadHighScore("pipe-flow"));

  useEffect(() => {
    if (done || solved) return;
    const id = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, [done, solved]);
  useEffect(() => {
    if (done) return;
    if (timeLeft === 0) { setDone(true); setMessage("Out of time."); playArcadeFailSound(); }
    // eslint-disable-next-line
  }, [timeLeft]);
  useEffect(() => {
    if (!done) return;
    const beat = saveHighScore("pipe-flow", score);
    const grade = gradeForScore(score, 260, 160, 80);
    const summary = "Cleared " + clearedLevels + " / " + PIPE_LEVELS.length + " pipeline(s). Score: " + score + " (Grade " + grade + ")" + (beat ? " — new high score!" : "");
    setTimeout(() => onComplete("Pipe Flow complete", summary), 400);
    // eslint-disable-next-line
  }, [done]);

  function pushPop(text, color) {
    const id = popIdRef.current++;
    setPops((p) => p.concat([{ id, text, color }]));
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== id)), 750);
  }
  function clickCell(r, c) {
    if (done || solved) return;
    const cell = grid[r][c];
    if (cell.fixed || cell.type !== "pipe") return;
    const rows = grid.length, cols = grid[0].length;
    const nextGrid = grid.map((row) => row.slice());
    nextGrid[r][c] = { type: "pipe", connections: pipeRotate(cell.connections), fixed: false };
    setGrid(nextGrid);
    if (pipeIsSolved(nextGrid, rows, cols)) {
      const gained = 50 + timeLeft;
      setScore((s) => s + gained);
      setSolved(true);
      setClearedLevels((n) => n + 1);
      pushPop("+" + gained, a);
      playArcadeSuccessSound();
      const isLast = levelIndex + 1 >= PIPE_LEVELS.length;
      setMessage(isLast ? "All pipelines connected!" : "Connected! Next pipeline loading…");
      setTimeout(() => {
        if (!isLast) {
          const next = PIPE_LEVELS[levelIndex + 1];
          setLevelIndex((li) => li + 1);
          setGrid(generatePipeLevel(next.rows, next.cols));
          setSolved(false);
          setMessage("Click a pipe segment to rotate it. Connect the glowing source to the target.");
        } else {
          setDone(true);
        }
      }, 900);
    }
  }
  function restart() {
    setLevelIndex(0); setGrid(generatePipeLevel(PIPE_LEVELS[0].rows, PIPE_LEVELS[0].cols));
    setSolved(false); setScore(0); setTimeLeft(PIPE_TOTAL_TIME); setDone(false); setClearedLevels(0);
    setMessage("Click a pipe segment to rotate it. Connect the glowing source to the target.");
  }

  const rows = grid.length, cols = grid[0].length;
  /* Precise clicking on individual pipe segments is the entire mechanic here, but the
     old fixed 44/52px cells left the grid the smallest thing in an otherwise mostly-empty
     ~800x500 window (design review finding). Scale to the available space instead — this
     still shrinks gracefully as PIPE_LEVELS grows to 4x5, but every level now fills most
     of the window rather than sitting tiny in a corner of it. */
  const cellSize = Math.max(56, Math.min(96, Math.floor(460 / cols)));
  return (
    <div className="p-4 flex flex-col gap-3 items-center relative">
      <FloatPops pops={pops} />
      <div className="w-full flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Level {levelIndex + 1}/{PIPE_LEVELS.length}</span><span>Time: {timeLeft}s</span><span>Score: {score}</span><span>Best: {best}</span>
      </div>
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "repeat(" + cols + ", " + cellSize + "px)" }}>
        {grid.map((row, r) => row.map((cell, c) => (
          <button key={r + "-" + c} type="button" onClick={() => clickCell(r, c)} disabled={cell.fixed || cell.type !== "pipe"}
            className="flex items-center justify-center p-0"
            style={{ width: cellSize, height: cellSize, background: cell.type === "empty" ? "transparent" : "rgba(20,10,0,.4)", boxShadow: cell.type === "empty" ? "none" : bevel("out-shallow", a), cursor: cell.fixed || cell.type !== "pipe" ? "default" : "pointer" }}>
            <PipeCell cell={cell} size={cellSize - 8} solved={solved} accent={a} />
          </button>
        )))}
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {done && <button type="button" className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: a, color: "#040200", boxShadow: bevel("out-shallow", a) }} onClick={restart}>Restart</button>}
    </div>
  );
}

/* ================= Spinning Plates — Command Center =================
   Real-time attention-splitting: several system gauges decay continuously, click one
   to ping/refill it. A new gauge comes online every 15s survived (up to 6). Pinging a
   gauge that was already in its pulsing critical zone counts as a clutch "save" for
   bonus score — the tension is deliberately different from the arcade's other,
   turn-based puzzles. Critical state reads via a bright near-white pulse (`#fff3e0`,
   same value SystemStabilizerGame already uses for unsafe meters), never red — this
   arcade stays strictly mono-CRT-accent, no red/yellow/blue state colors anywhere. */
const PLATE_NAMES = ["API Gateway", "Auth Service", "Job Queue", "Notifications", "Billing Sync", "Search Index"];
function SpinningPlatesGame({ onComplete, accent }) {
  const a = accent || CRT_GREEN;
  const [plates, setPlates] = useState(() => PLATE_NAMES.slice(0, 3).map((n) => ({ name: n, value: 100 })));
  const [elapsed, setElapsed] = useState(0);
  const [saves, setSaves] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("Click a system to stabilize it before it goes critical.");
  const [pops, setPops] = useState([]);
  const popIdRef = useRef(0);
  const [best] = useState(() => loadHighScore("spinning-plates"));

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setElapsed((e) => e + 1);
      setPlates((prev) => {
        const decay = 3.5 + Math.random() * 4;
        const next = prev.map((p) => ({ name: p.name, value: clamp(p.value - decay, 0, 100) }));
        const failed = next.find((p) => p.value <= 0);
        if (failed) { setDone(true); setMessage(failed.name + " went offline. Run over."); playArcadeFailSound(); }
        return next;
      });
    }, 900);
    return () => clearInterval(id);
  }, [done]);
  useEffect(() => {
    if (done) return;
    if (elapsed > 0 && elapsed % 15 === 0) {
      setPlates((prev) => (prev.length < PLATE_NAMES.length ? prev.concat([{ name: PLATE_NAMES[prev.length], value: 100 }]) : prev));
      if (elapsed / 15 <= PLATE_NAMES.length - 3) pushPop("NEW SYSTEM ONLINE", CONCEPT);
    }
    // eslint-disable-next-line
  }, [elapsed]);
  useEffect(() => {
    if (!done) return;
    const score = elapsed * 4 + saves * 15;
    const beat = saveHighScore("spinning-plates", score);
    const grade = gradeForScore(score, 260, 160, 90);
    const summary = "Survived " + elapsed + "s, stabilized " + saves + " critical system(s). Score: " + score + " (Grade " + grade + ")" + (beat ? " — new high score!" : "");
    setTimeout(() => onComplete("Spinning Plates complete", summary), 400);
    // eslint-disable-next-line
  }, [done]);

  function pushPop(text, color) {
    const id = popIdRef.current++;
    const x = 15 + Math.random() * 60, y = 8 + Math.random() * 30;
    setPops((p) => p.concat([{ id, text, color, x, y }]));
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== id)), 750);
  }
  function ping(i) {
    if (done) return;
    setPlates((prev) => {
      const p = prev[i];
      const wasCritical = p.value <= 25;
      const next = prev.slice();
      next[i] = { name: p.name, value: clamp(p.value + 32, 0, 100) };
      if (wasCritical) { setSaves((s) => s + 1); pushPop("+15 SAVED!", a); playArcadeSuccessSound(); }
      return next;
    });
  }
  function restart() {
    setPlates(PLATE_NAMES.slice(0, 3).map((n) => ({ name: n, value: 100 })));
    setElapsed(0); setSaves(0); setDone(false);
    setMessage("Click a system to stabilize it before it goes critical.");
  }

  const score = elapsed * 4 + saves * 15;
  return (
    <div className="p-4 flex flex-col gap-3 relative" style={{ animation: done ? "arcade-shake .4s ease-in-out" : "none" }}>
      <FloatPops pops={pops} />
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Time: {elapsed}s</span><span>Score: {score}</span><span>Best: {best}</span>
      </div>
      <div className="flex flex-col gap-2">
        {plates.map((p, i) => {
          const critical = p.value <= 25;
          return (
            <button key={p.name} type="button" onClick={() => ping(i)} disabled={done}
              className="flex items-center gap-3 px-2 py-1.5 text-left disabled:opacity-60"
              style={{ background: "rgba(20,10,0,.4)", boxShadow: bevel("out-shallow", a) }}>
              <span className="w-24 text-[11px] font-medium font-mono truncate" style={{ color: "#c98a2e" }}>{p.name}</span>
              <span className="flex-1 h-3 overflow-hidden" style={{ boxShadow: bevel("in-shallow", a), background: "rgba(20,10,0,.5)" }}>
                <span className="block h-full transition-[width]" style={{ width: p.value + "%", background: critical ? "#fff3e0" : a, animation: critical ? "arcade-pulse-critical .5s ease-in-out infinite" : "none" }}></span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {done && <button type="button" className="self-center px-3 py-1.5 text-[13px] font-semibold" style={{ background: a, color: "#040200", boxShadow: bevel("out-shallow", a) }} onClick={restart}>Restart</button>}
    </div>
  );
}

/* ================= Fraud or Fine? — Payment Processing =================
   Judgment-under-uncertainty, not just sorting: most transactions are straightforward,
   but a few are legit-but-unusual on purpose (a large one-time purchase, travel-dates
   overseas charge) to bait an over-eager flag — the same trick "Papers, Please"-style
   review games use. Combo multiplier + speed bonus reward fast, accurate review. */
const FRAUD_TRANSACTIONS = [
  { amount: "$42.00", location: "Local", velocity: "Normal", note: "Grocery store purchase", isFraud: false },
  { amount: "$9.99", location: "Local", velocity: "Normal", note: "Recurring subscription renewal", isFraud: false },
  { amount: "$1,850.00", location: "Overseas", velocity: "3 charges in 5 min", note: "Electronics store, new device", isFraud: true },
  { amount: "$620.00", location: "Local", velocity: "Normal", note: "One-time furniture purchase", isFraud: false },
  { amount: "$75.00", location: "Overseas", velocity: "Normal", note: "Hotel booking, trip dates match calendar", isFraud: false },
  { amount: "$310.00", location: "Local", velocity: "5 charges in 2 min", note: "Same small gift-card retailer, repeated", isFraud: true },
  { amount: "$1,200.00", location: "Local", velocity: "Normal", note: "Annual insurance premium", isFraud: false },
  { amount: "$58.00", location: "Overseas", velocity: "Normal", note: "Streaming service, account holder traveling", isFraud: false },
  { amount: "$4,300.00", location: "Overseas", velocity: "2 charges in 1 min", note: "Wire transfer, new payee, no prior history", isFraud: true },
  { amount: "$18.50", location: "Local", velocity: "Normal", note: "Coffee shop, regular merchant", isFraud: false },
  { amount: "$980.00", location: "Local", velocity: "Normal", note: "Wedding vendor deposit, matches invoice", isFraud: false },
  { amount: "$2,150.00", location: "Overseas", velocity: "Normal", note: "Luxury goods, first purchase on account", isFraud: true },
];
const FRAUD_ROUND_TIME = 5;
function FraudOrFineGame({ onComplete, accent }) {
  const a = accent || CRT_GREEN;
  const orderRef = useRef(shuffle(FRAUD_TRANSACTIONS));
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(FRAUD_ROUND_TIME);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("Approve legit charges. Flag the fraud. " + FRAUD_ROUND_TIME + "s per transaction.");
  const [flash, setFlash] = useState(null);
  const [pops, setPops] = useState([]);
  const popIdRef = useRef(0);
  const [best] = useState(() => loadHighScore("fraud-or-fine"));

  useEffect(() => {
    if (done || locked) return;
    const id = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, [done, locked, index]);
  useEffect(() => {
    if (done || locked) return;
    if (timeLeft === 0) decide(null);
    // eslint-disable-next-line
  }, [timeLeft]);
  useEffect(() => {
    if (!done) return;
    const beat = saveHighScore("fraud-or-fine", score);
    const grade = gradeForScore(score, 260, 160, 80);
    const summary = "Reviewed " + (index + 1) + " transaction(s), final score " + score + " (Grade " + grade + ")" + (beat ? " — new high score!" : "");
    setTimeout(() => onComplete("Fraud or Fine? complete", summary), 500);
    // eslint-disable-next-line
  }, [done]);

  function pushPop(text, color) {
    const id = popIdRef.current++;
    setPops((p) => p.concat([{ id, text, color }]));
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== id)), 700);
  }
  function decide(action) {
    if (done || locked) return;
    setLocked(true);
    const txn = orderRef.current[index];
    const correct = action !== null && ((action === "flag") === txn.isFraud);
    if (correct) {
      const speedBonus = timeLeft * 2;
      const nextCombo = combo + 1;
      const gained = 10 * Math.min(nextCombo, 5) + speedBonus;
      setScore((s) => s + gained);
      setCombo(nextCombo);
      setFlash("good");
      pushPop("+" + gained + (nextCombo > 1 ? "  x" + Math.min(nextCombo, 5) : ""), a);
      playArcadeSuccessSound();
      setMessage(txn.isFraud ? "Correctly flagged." : "Correctly approved.");
    } else {
      setLives((l) => l - 1);
      setCombo(0);
      setFlash("bad");
      pushPop(action === null ? "MISSED" : "WRONG", "#fff3e0");
      playArcadeFailSound();
      setMessage(txn.isFraud ? "That one was fraud." : "That one was legit.");
    }
    setTimeout(() => setFlash(null), 260);
    const nextIndex = index + 1;
    const outOfLives = !correct && lives - 1 <= 0;
    if (outOfLives || nextIndex >= orderRef.current.length) {
      setDone(true);
    } else {
      setTimeout(() => { setIndex(nextIndex); setTimeLeft(FRAUD_ROUND_TIME); setLocked(false); }, 500);
    }
  }
  function restart() {
    orderRef.current = shuffle(FRAUD_TRANSACTIONS);
    setIndex(0); setLives(3); setScore(0); setCombo(0); setTimeLeft(FRAUD_ROUND_TIME); setLocked(false); setDone(false);
    setMessage("Approve legit charges. Flag the fraud. " + FRAUD_ROUND_TIME + "s per transaction.");
  }

  const txn = orderRef.current[index];
  return (
    <div className="p-4 flex flex-col gap-3 relative" style={{ animation: flash === "bad" ? "arcade-shake .3s ease-in-out" : "none" }}>
      <FloatPops pops={pops} />
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Score: {score}</span><span>Lives: {"♥".repeat(Math.max(lives, 0))}</span><span>Best: {best}</span>
      </div>
      {!done && txn && (
        <div className="p-3.5 flex flex-col gap-1.5" style={{ background: flash === "good" ? "rgba(255,176,0,.18)" : flash === "bad" ? "rgba(255,243,224,.32)" : "rgba(20,10,0,.4)", boxShadow: bevel("out-shallow", a), transition: "background .2s" }}>
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-bold font-mono" style={{ color: "#ffd98a" }}>{txn.amount}</span>
            <span className="text-[11px] font-semibold font-mono" style={{ color: "#c98a2e" }}>{timeLeft}s</span>
          </div>
          <div className="text-[11px] font-medium font-mono" style={{ color: "#c98a2e" }}>{txn.location} · {txn.velocity}</div>
          <div className="text-[14px] font-medium" style={{ color: "#c98a2e" }}>{txn.note}</div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={done || locked} className="flex-1 px-3 py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: a, color: "#040200", boxShadow: bevel("out-shallow", a) }} onClick={() => decide("approve")}>Approve</button>
        <button type="button" disabled={done || locked} className="flex-1 px-3 py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", a), color: "#ffd98a" }} onClick={() => decide("flag")}>Flag</button>
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {done && <button type="button" className="self-center px-3 py-1.5 text-[13px] font-semibold" style={{ background: a, color: "#040200", boxShadow: bevel("out-shallow", a) }} onClick={restart}>Restart</button>}
    </div>
  );
}

const GAMES = [
  { id: "route-racer", title: "Route Racer", cluster: "field-operations", desc: "Grid-navigation puzzle. Visit every job site before you run out of moves.", summary: "Concept takeaway: Zuper's real dispatch system routes technicians around live traffic and job constraints automatically — this mini-game is an illustrative analogy, not a simulation of the real routing engine." },
  { id: "dispatch-tetris", title: "Dispatch Tetris", cluster: null, desc: "Schedule-fitting puzzle. Place each incoming job into an open technician slot.", summary: "Concept takeaway: Zuper's real scheduling tools fit incoming jobs into technician availability automatically — this mini-game is an illustrative analogy, not a simulation of the real scheduling engine." },
  { id: "workflow-wiring", title: "Workflow Wiring", cluster: "workflows-cluster", desc: "Connect event triggers to automated actions in a logic puzzle.", summary: "Concept takeaway: Zuper's real workflow automation connects triggers to actions behind the scenes — this mini-game is an illustrative analogy, not a simulation of the real automation engine." },
  { id: "system-stabilizer", title: "System Stabilizer", cluster: "core-platform", desc: "Resource-management mini-game. Keep every system meter in range.", summary: "Concept takeaway: Zuper's real platform monitors and balances system load automatically — this mini-game is an illustrative analogy, not a simulation of real infrastructure telemetry." },
  { id: "pipe-flow", title: "Pipe Flow", cluster: "data-pipeline", desc: "Rotate-the-segment puzzle. Connect the source to the target before time runs out — grows each level.", summary: "Concept takeaway: Zuper's real data pipeline moves information between systems automatically, already connected — this mini-game is an illustrative analogy, not a simulation of the real pipeline." },
  { id: "spinning-plates", title: "Spinning Plates", cluster: "command-center", desc: "Real-time survival. Ping each system before it goes critical — more come online the longer you last.", summary: "Concept takeaway: Zuper's real command center monitors every system at once so nothing goes critical unnoticed — this mini-game is an illustrative analogy, not a simulation of real monitoring." },
  { id: "fraud-or-fine", title: "Fraud or Fine?", cluster: "payment-processing", desc: "Fast judgment call. Approve or flag each transaction before the clock runs out — some legit ones look suspicious on purpose.", summary: "Concept takeaway: Zuper's real payment processing screens transactions for risk automatically — this mini-game is an illustrative analogy, not a simulation of a real fraud model." },
];
/* Clusters that already have a matching arcade game don't get their own desktop
   folder icon anymore — they're "in the arcade" now, per direct request. Derived
   from GAMES (not a separately-maintained list) so it can't drift out of sync; the
   folder window itself still exists in allWindows/worldData and stays reachable via
   the terminal (`cd <cluster>` then `ls`), this only removes the desktop icon. */
const ARCADE_CLUSTER_IDS = new Set(GAMES.filter((g) => g.cluster).map((g) => g.cluster));

/* Direct follow-up after "the games look lifeless" — every game rendered in the exact
   same amber-on-black palette regardless of which one you're playing (confirmed by
   actually playing one before touching anything: Route Racer was a flat grid, no color
   identity beyond the OS chrome). Each game now gets the SAME per-cabinet accent color
   already shown on its arcade-menu tile (single source of truth here, so the menu tile
   and the actual gameplay screen can never drift apart), threaded through as an `accent`
   prop and used in place of the old hardcoded CRT_GREEN for buttons/meters/borders.
   Explicit danger/wrong-answer feedback still always reads as the near-white pulse
   (#fff3e0) used elsewhere in the OS, never red - only the neutral/positive UI got a
   color identity, the "no red errors" convention is untouched. */
const GAME_ACCENT_BY_ID = Object.fromEntries(GAMES.map((g, i) => [g.id, "hsl(" + (i * 51) % 360 + ", 70%, 62%)"]));

/* Per Sameer, direct request: the desktop itself should only ever show these four
   icons, no matter how many real clusters worldData has. Everything else (every other
   real cluster, Terminal.app) stays fully reachable — Start Menu and the QuickLauncher
   ("Find"/"Run") still list the full app set (see desktopIcons vs visibleDesktopIcons in
   App below) — this only trims what's visible directly on the desktop surface. */
const DESKTOP_VISIBLE_IDS = new Set(["careers", "blog", "zuper-arcade", "more-apps"]);

/* Every game's "Skip & Read Summary" used to show the exact same canned disclaimer
   sentence regardless of which game or which real cluster it's paired with — a design
   review pointed out worldData (the real cluster/entity/flow data) is already loaded
   right here and going unused for this. Pulls real entity/flow counts and a couple of
   real entity names into the takeaway instead, so it actually teaches something rather
   than repeating "this is an analogy." Falls back to the game's own static summary for
   Dispatch Tetris (cluster: null — it isn't paired to one real cluster) or if worldData
   hasn't loaded yet. */
function gameSummaryText(game, worldData) {
  const c = game.cluster && worldData ? findCluster(worldData, game.cluster) : null;
  if (!c) return game.summary;
  const names = c.entities.slice(0, 3).map((e) => e.name).join(", ");
  const flowPart = c.flows.length ? " and " + c.flows.length + " real data flow" + (c.flows.length === 1 ? "" : "s") : "";
  return "Concept takeaway: " + c.name + " is a real Zuper cluster — " + c.entities.length + " real "
    + (c.entities.length === 1 ? "entity" : "entities") + (names ? " (" + names + ")" : "") + flowPart
    + ". This mini-game is an illustrative analogy, not a simulation of the real system.";
}

function ArcadeWindow({ worldData }) {
  const [view, setView] = useState("menu");
  const [achievement, setAchievement] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  function onGameComplete(title, resultText) { setAchievement({ title: title, text: resultText + " (Concept only — nothing is transmitted anywhere; any high score shown is kept in this browser's localStorage only.)" }); }
  function skip(game) { setSummaryText(gameSummaryText(game, worldData)); setView("summary"); setAchievement(null); }
  function backToMenu() { setView("menu"); setAchievement(null); }
  return (
    <div className="p-4 h-full flex flex-col">
      {view === "menu" && (
        <React.Fragment>
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h2 className="m-0 text-[15px] font-bold font-mono tracking-wide" style={{ color: "#ffd98a" }}>SELECT A CABINET</h2>
            <span className="text-[11px] font-semibold font-mono" style={{ color: "#c98a2e" }}>{GAMES.length} games</span>
          </div>
          {/* Grid, not a horizontal scroll — direct follow-up: wraps into rows so every
              cabinet fits in the window at once, no scrolling in either direction at the
              default window size. Each card has its own explicit Play / Skip & Read
              Summary buttons again (the single-click-whole-tile + tiny corner "i" from
              the previous pass was reduced back down per direct request). */}
          <div className="flex-1 min-h-0 overflow-y-auto grid gap-3 content-start" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
            {GAMES.map((g) => {
              const accent = GAME_ACCENT_BY_ID[g.id];
              return (
                <div key={g.id} className="flex flex-col items-center gap-2 p-3 text-center"
                  style={{ background: "rgba(20,10,0,.45)", boxShadow: bevel("out-shallow", accent) }}>
                  <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 42, height: 42, background: accent + "22", boxShadow: bevel("in-shallow", accent) }}>
                    <MinimalIcon shapeKey={g.cluster || "zuper-arcade"} size={22} color={accent} />
                  </span>
                  <h3 className="text-[13px] font-bold m-0 font-mono leading-tight" style={{ color: "#ffd98a" }}>{g.title}</h3>
                  <p className="text-[11px] font-medium leading-snug m-0 flex-1" style={{ color: "#c98a2e" }}>{g.desc}</p>
                  <div className="flex flex-col gap-1.5 w-full mt-1">
                    <button type="button" className="px-2 py-1 text-[11px] font-semibold" style={{ background: accent, color: "#040200", boxShadow: bevel("out-shallow", accent) }} onClick={() => { setAchievement(null); setView(g.id); }}>Play</button>
                    <button type="button" className="px-2 py-1 text-[11px] font-semibold" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", accent), color: "#ffd98a" }} onClick={() => skip(g)}>Skip &amp; Read Summary</button>
                  </div>
                </div>
              );
            })}
          </div>
        </React.Fragment>
      )}
      {view !== "menu" && (
        <div className="mt-3">
          <button type="button" className="text-[12px] font-semibold hover:brightness-125" style={{ color: GAME_ACCENT_BY_ID[view] || "#c98a2e" }} onClick={backToMenu}>&larr; Back to Arcade</button>
          <div className="mt-1">
            {view === "route-racer" && <RouteRacerGame onComplete={onGameComplete} accent={GAME_ACCENT_BY_ID[view]} />}
            {view === "dispatch-tetris" && <DispatchTetrisGame onComplete={onGameComplete} accent={GAME_ACCENT_BY_ID[view]} />}
            {view === "workflow-wiring" && <WorkflowWiringGame onComplete={onGameComplete} accent={GAME_ACCENT_BY_ID[view]} />}
            {view === "system-stabilizer" && <SystemStabilizerGame onComplete={onGameComplete} accent={GAME_ACCENT_BY_ID[view]} />}
            {view === "pipe-flow" && <PipeFlowGame onComplete={onGameComplete} accent={GAME_ACCENT_BY_ID[view]} />}
            {view === "spinning-plates" && <SpinningPlatesGame onComplete={onGameComplete} accent={GAME_ACCENT_BY_ID[view]} />}
            {view === "fraud-or-fine" && <FraudOrFineGame onComplete={onGameComplete} accent={GAME_ACCENT_BY_ID[view]} />}
            {view === "summary" && <p className="text-[14px] font-medium leading-relaxed p-4" style={{ color: "#ffd98a" }}>{summaryText}</p>}
          </div>
        </div>
      )}
      {achievement && (
        <div className="mt-4 p-3.5" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-deep", CRT_GREEN) }}>
          <h4 className="m-0 text-[16px] font-bold font-mono" style={{ color: "#ffd98a" }}>{achievement.title}</h4>
          <p className="m-0 mt-1 text-[14px] font-medium leading-relaxed" style={{ color: "#c98a2e" }}>{achievement.text}</p>
        </div>
      )}
    </div>
  );
}

/* ================= Careers challenge — terminal-native ("Zuper_Careers.exe" as a
   VFS/CLI adventure under /desktop/careers, not a separate GUI window) =================
   This is a faithful port of the challenge that actually ships on labs.zuper.co today
   (found in its own production bundle, then played end-to-end for real to verify every
   step) — run the same way status.sh/connections.sh already are (`bash <file>.sh`).

   LEVEL 1 (bash solve.sh) — Console (window.__zuper_keys, 16 base64 strings, a shuffled
   copy of CAREERS_WORDS below) -> Elements/Styles (a --zuper-key-index CSS custom
   property on <html> names the correct index) -> Network (5 real requests to
   jsonplaceholder.typicode.com/comments — one guaranteed id in the 16-20 range plus 4
   random ones, so exactly one response always has postId===4; that response's own "id"
   is the verification code). Answer: bash submit.sh <decoded_key>-<code>.

   LEVEL 2 (auto-starts right after Level 1's correct submit, no separate solve step) —
   window.__zuper_keys becomes 16 real crypto-random hex strings that re-roll every 2s
   via setInterval; the one at the index named in sessionStorage.__zuper_idx is held
   fixed across rerolls. Answer: bash submit.sh <key> (no dash/code this time).

   All of this is generated fresh, client-side, at solve-time — there's no fixed answer
   to leak by this being a public repo, so (unlike the first draft of this feature)
   nothing is validated server-side anymore. What Sameer's real site does NOT do: once
   both levels are solved it just tells the candidate to manually email a screenshot to
   careers@zuper.co. Per direct discussion, we keep that real message but ALSO offer an
   automated path on top of it — bash submit.sh <email> — which still hits
   api/careers-submit.js to notify Raghav and Sameer via Resend.

   There's also a real, separate `bash quiz.sh` (5 technical multiple-choice questions,
   unrelated to solve/submit) — included here with its real questions/choices, captured
   the same way: played live and transcribed. */
const CAREERS_STORAGE_KEY = "zuper-os-careers-progress";
function loadCareersProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(CAREERS_STORAGE_KEY));
    if (saved && (saved.step === 1 || saved.step === 2 || saved.step === 3 || saved.step === 4)) return saved;
  } catch (e) {}
  return { step: 1 };
}
function saveCareersProgress(progress) {
  try { localStorage.setItem(CAREERS_STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
}

const CAREERS_WORDS = ["access-granted", "hello-engineer", "debug-master", "code-breaker", "stack-trace", "event-loop", "async-await", "null-pointer", "race-condition", "dead-lock", "heap-overflow", "buffer-flush", "type-safety", "unit-tested", "code-review", "ship-it"];

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function randomHex(len) {
  const bytes = new Uint8Array(Math.ceil(len / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

async function careersSolveLevel1(answerRef) {
  document.documentElement.style.removeProperty("--zuper-key-index");
  const words = shuffled(CAREERS_WORDS);
  const correctIdx = Math.floor(Math.random() * words.length);
  window.__zuper_keys = words.map((w) => btoa(w));
  document.documentElement.style.setProperty("--zuper-key-index", String(correctIdx));

  /* Ported from labs.zuper.co's real challenge, then re-verified live against it
     (direct bug report + screenshots) — the target postId there is NOT fixed at 4,
     it's freshly randomized (1-100) every single time the puzzle loads (58, 72, 89
     all observed live back to back). jsonplaceholder's /comments are laid out in
     sequential 5-per-post blocks (ids 1-5 -> postId 1, 6-10 -> postId 2, ...), so
     for any target postId N the ids that actually belong to it are the 5-id block
     starting at (N-1)*5+1 — same math this file already used, just generalized off
     the hardcoded 4/16-20 case to match the real site's actual behavior. */
  const targetPostId = 1 + Math.floor(Math.random() * 100);
  const blockStart = (targetPostId - 1) * 5 + 1;
  const guaranteedId = blockStart + Math.floor(Math.random() * 5);
  const decoyIds = [];
  while (decoyIds.length < 4) {
    const id = 1 + Math.floor(Math.random() * 500);
    if (id !== guaranteedId && decoyIds.indexOf(id) === -1) decoyIds.push(id);
  }
  const ids = shuffled([guaranteedId, ...decoyIds]);
  const responses = await Promise.all(ids.map((id) =>
    fetch("https://jsonplaceholder.typicode.com/comments/" + id).then((r) => r.json()).catch(() => null)
  ));
  const target = responses.find((r) => r && r.postId === targetPostId);
  answerRef.current = { level: 1, key: words[correctIdx], code: String(target ? target.id : guaranteedId) };

  return [
    { text: "ACCESS PROBE — LEVEL 1", kind: "heading" }, "────────────────────────────────",
    "Open DevTools (F12 / Cmd+Shift+I).", "",
    { text: "STEP 1 — Console tab", kind: "label" }, "  Run: window.__zuper_keys", "  Returns 16 strings. They are base64-encoded. Decode with: atob()", "",
    { text: "STEP 2 — Elements tab (Styles)", kind: "label" }, "  The correct array index is a CSS custom property on the <html> element.", "  Property: --zuper-key-index", "",
    { text: "STEP 3 — Network tab", kind: "label" }, "  5 requests were made to jsonplaceholder.", "  Find the response where postId === " + targetPostId + ".", "  The \"id\" field of that response is your verification code.", "",
    { text: "STEP 4 — Submit", kind: "label" }, "  bash submit.sh <decoded_key>-<code>",
  ];
}

function careersStartLevel2(answerRef, timerRef) {
  document.documentElement.style.removeProperty("--zuper-key-index");
  const keys = Array.from({ length: 16 }, () => randomHex(12));
  const correctIdx = Math.floor(Math.random() * 16);
  const correctKey = keys[correctIdx];
  window.__zuper_keys = keys;
  try { sessionStorage.setItem("__zuper_idx", String(correctIdx)); } catch (e) {}
  if (timerRef.current) clearInterval(timerRef.current);
  timerRef.current = setInterval(() => {
    const next = Array.from({ length: 16 }, () => randomHex(12));
    next[correctIdx] = correctKey;
    window.__zuper_keys = next;
  }, 2000);
  window.__zuper_timer = timerRef.current;
  answerRef.current = { level: 2, key: correctKey };

  return [
    { text: "ACCESS PROBE — LEVEL 2", kind: "heading" }, "────────────────────────────────", "",
    { text: "STEP 1 — Console tab", kind: "label" }, "  window.__zuper_keys has been reloaded.", "  16 new keys. They rotate every 2 seconds.", "  Stop the timer or snapshot the array.", "",
    { text: "STEP 2 — Application tab", kind: "label" }, "  Open Application > Session Storage.", "  The correct index is stored under key: __zuper_idx", "",
    { text: "STEP 3 — Submit", kind: "label" }, "  bash submit.sh <key>",
  ];
}

function careersCleanupLevel2(timerRef) {
  if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  delete window.__zuper_timer;
  delete window.__zuper_keys;
  try { sessionStorage.removeItem("__zuper_idx"); } catch (e) {}
  document.documentElement.style.removeProperty("--zuper-key-index");
}

/* GET reads the live "N people have solved this" count without incrementing (used for
   the pre-solve teaser in cat readme.md); POST atomically increments and returns the
   new count (called exactly once, the instant both levels are actually cleared — see
   careersSubmitAnswer). Real, shared state across every visitor via api/careers-solve-
   count.js (Upstash Redis) — nothing else in this app has ever needed that before,
   careers progress itself is per-browser localStorage. Fails silent: returns null
   (never throws) if the counter isn't configured yet or the request fails, so callers
   just skip showing the line rather than showing an error over a nice-to-have stat. */
async function careersFetchSolveCount(method) {
  try {
    const r = await fetch("/api/careers-solve-count", { method: method || "GET" });
    const data = await r.json().catch(() => null);
    return data && typeof data.count === "number" ? data.count : null;
  } catch (e) {
    return null;
  }
}

const CAREERS_QUIZ = [
  { q: "What does 'FSM' stand for in the roofing industry?", choices: ["Finite State Machine", "Full Stack Monitoring", "Field Service Management", "Fast Service Middleware"], correct: 2 },
  { q: "Which protocol does gRPC use under the hood?", choices: ["HTTP/1.1", "WebSocket", "HTTP/2", "MQTT"], correct: 2 },
  { q: "In the CAP theorem, what does the 'P' stand for?", choices: ["Performance", "Persistence", "Partition Tolerance", "Parallel Processing"], correct: 2 },
  { q: "Which design pattern lets one object notify many observers?", choices: ["Singleton", "Observer", "Factory", "Strategy"], correct: 1 },
  { q: "What sorting algorithm has O(n log n) average and O(n²) worst case?", choices: ["Mergesort", "Heapsort", "Bubblesort", "Quicksort"], correct: 3 },
];
function careersQuizQuestionLines(index) {
  const q = CAREERS_QUIZ[index];
  const lines = [{ text: "Q" + (index + 1) + ": " + q.q, kind: "label" }];
  ["a", "b", "c", "d"].forEach((l, i) => lines.push({ text: "  " + l + ") " + q.choices[i], kind: "choice" }));
  return lines;
}

/* ================= Terminal.app (VFS-aware) ================= */
/* Shareable "ACCESS GRANTED" result card — a design review's pitch: a generated retro
   badge is dramatically more postable than a screenshot of terminal scrollback. 1200x630
   (standard social-card size). Draws to an offscreen canvas so it can be downloaded or
   handed to the Web Share API as a real PNG file, not just a screenshot of the DOM.
   Waits on document.fonts.load() for the two real site fonts (VT323 for the big glow
   headline, matching the desktop watermark's own use of it; JetBrains Mono for
   everything else, matching .font-terminal) — both load async via a Google Fonts
   <link>, and drawing before they're ready would silently fall back to a generic serif
   for the headline. */
async function drawAccessGrantedCard(canvas) {
  const W = 1200, H = 630;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  try {
    await Promise.all([
      document.fonts.load("900 130px VT323"),
      document.fonts.load("700 26px 'JetBrains Mono'"),
      document.fonts.load("600 24px 'JetBrains Mono'"),
    ]);
  } catch (e) { /* fonts API unsupported or load failed — draw with whatever's available */ }

  ctx.fillStyle = "#0d0700";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,176,0,0.05)";
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ff4919";
  ctx.font = "900 560px VT323";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Z", W / 2, H / 2 + 20);
  ctx.restore();

  ctx.strokeStyle = "#ff4919";
  ctx.lineWidth = 6;
  const pad = 36, bw = 26;
  ctx.beginPath();
  ctx.moveTo(pad + bw, pad); ctx.lineTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(pad + bw, H - pad);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - pad - bw, pad); ctx.lineTo(W - pad, pad); ctx.lineTo(W - pad, H - pad); ctx.lineTo(W - pad - bw, H - pad);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 26px 'JetBrains Mono', monospace";
  ctx.fillText("Z U P E R   L A B S   —   C A R E E R S   C H A L L E N G E", W / 2, 130);

  ctx.shadowColor = "#ffb000";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#ffb000";
  ctx.font = "900 130px VT323";
  ctx.fillText("ACCESS GRANTED", W / 2, 300);
  ctx.shadowBlur = 0;

  ctx.textAlign = "left";
  ctx.font = "600 24px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#c98a2e";
  const items = [
    "✓ Decoded base64 keys",
    "✓ Read a CSS custom property",
    "✓ Filtered live network responses",
    "✓ Stopped a rotating timer, read sessionStorage",
  ];
  let ty = 370;
  items.forEach((t) => { ctx.fillText(t, W / 2 - 270, ty); ty += 42; });

  ctx.textAlign = "center";
  ctx.font = "500 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#ffd98a";
  ctx.fillText("zuper-labs-os.vercel.app  ·  cd careers && bash solve.sh", W / 2, H - 55);
}

function ShareCardOverlay({ onClose }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (canvasRef.current) drawAccessGrantedCard(canvasRef.current).then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);
  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "zuper-access-granted.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }
  function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "zuper-access-granted.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "ACCESS GRANTED", text: "I just cracked Zuper Labs' careers challenge." }); } catch (e) { /* user cancelled the share sheet — not an error */ }
      } else {
        download();
      }
    }, "image/png");
  }
  return (
    <div className="absolute inset-0 z-[900] flex flex-col items-center justify-center gap-4 p-4" style={{ background: "rgba(4,2,0,.92)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4 max-w-full">
        <canvas ref={canvasRef} style={{ width: "min(85vw, 600px)", height: "auto", boxShadow: bevel("out-deep", CRT_GREEN) }} />
        {!ready && <p className="text-[12px] font-mono" style={{ color: "#c98a2e" }}>Generating…</p>}
        <div className="flex gap-2 flex-wrap justify-center">
          <button type="button" disabled={!ready} onClick={download} className="px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40" style={{ background: CRT_GREEN, color: "#040200", boxShadow: bevel("out-shallow", CRT_GREEN) }}>Download PNG</button>
          {typeof navigator !== "undefined" && navigator.share && (
            <button type="button" disabled={!ready} onClick={share} className="px-3 py-1.5 text-[13px] font-semibold disabled:opacity-40" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }}>Share…</button>
          )}
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* Direct request: bring the terminal closer to a real shell — history (Up/Down),
   Tab completion, live syntax coloring of the verb being typed, and fish-style faded
   auto-suggestions from history. Kept as small standalone helpers (not component
   methods) since none of them need component state — they just describe what's
   completable/known at a given cwd, reused by both the completion and the
   validity-coloring logic below. */
const TERMINAL_VERBS = ["help", "ls", "cd", "pwd", "cat", "bash", "whoami", "date", "clear"];
function terminalCwdFiles(cwd) {
  if (cwd === "careers") return ["readme.md", "product.md", "open-roles.md", "challenge-preview.md"];
  if (cwd === "careers/server") return ["access.log"];
  if (cwd === "careers/agent") return ["agent.log"];
  if (cwd === "careers/database") return ["candidates.db"];
  if (cwd) return ["readme.md"];
  return [];
}
function terminalCwdScripts(cwd) {
  if (cwd === "careers") return ["solve.sh", "quiz.sh", "submit.sh", "notify.sh"];
  if (cwd && cwd.indexOf("careers") !== 0) return ["status.sh", "connections.sh"];
  return [];
}
function terminalCwdDirs(cwd, worldData) {
  if (!cwd) return worldData.map((c) => c.id);
  if (cwd === "careers") return ["server", "agent", "database", ".."];
  return [".."];
}
function terminalLongestCommonPrefix(strs) {
  if (!strs.length) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].toLowerCase().indexOf(prefix.toLowerCase()) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}
/* First word not yet typed (or already a space) -> completing the verb, candidates are
   every known command PLUS any bare file.sh/file.md shortcut reachable from here (the
   normalization in run() already accepts those). Otherwise, candidates depend on which
   verb was typed — only completes a single trailing arg, not further ones, since
   nothing past the first arg (a key, an email, a link) is realistically completable. */
function terminalCompletions(input, cwd, worldData) {
  const spaceIdx = input.indexOf(" ");
  if (spaceIdx === -1) return TERMINAL_VERBS.concat(terminalCwdFiles(cwd)).concat(terminalCwdScripts(cwd));
  const verb = input.slice(0, spaceIdx).toLowerCase();
  const rest = input.slice(spaceIdx + 1);
  if (rest.indexOf(" ") !== -1) return [];
  if (verb === "cd") return terminalCwdDirs(cwd, worldData);
  if (verb === "cat") return terminalCwdFiles(cwd);
  if (verb === "bash") return terminalCwdScripts(cwd);
  return [];
}
/* Live validity color for the verb being typed — green once it's a full match (a real
   command, or a bare file.sh/file.md that the run() normalization will accept), white
   while it's still a plausible prefix of something, red once it can't possibly resolve
   to anything. Only ever colors the first word; arguments after it stay plain white. */
function terminalInputColor(input) {
  const trimmedStart = input.replace(/^\s+/, "");
  if (!trimmedStart) return "#ffffff";
  const spaceIdx = trimmedStart.indexOf(" ");
  const word = (spaceIdx === -1 ? trimmedStart : trimmedStart.slice(0, spaceIdx)).toLowerCase();
  if (!word) return "#ffffff";
  if (TERMINAL_VERBS.indexOf(word) !== -1 || /\.(sh|md)$/i.test(word)) return "#8aff8a";
  if (spaceIdx === -1 && TERMINAL_VERBS.some((v) => v.indexOf(word) === 0)) return "#ffffff";
  return "#ff8080";
}
/* Fish-style auto-suggestion: most recent history entry that starts with (and is
   longer than) what's typed so far. Most-recent-first so retyping something you just
   ran surfaces immediately rather than an older, possibly stale match. */
function terminalGhostSuggestion(input, history) {
  if (!input) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] !== input && history[i].toLowerCase().indexOf(input.toLowerCase()) === 0) return history[i];
  }
  return null;
}

function TerminalWindow({ worldData, jumpTo, onOpenFolder }) {
  /* Direct feedback from a product-design review: nothing anywhere told a first-time
     visitor the careers challenge exists, let alone that it lives in here — discovery
     depended entirely on someone instinctively running `ls`. The real entry point
     (cd careers, then ls/cat readme.md, all of which already worked) just needed to be
     said out loud once, right where people already land. */
  const [lines, setLines] = useState([{ text: "Zuper Web OS terminal (concept shell over real VFS data). Type 'help', or 'cd careers' to see what we're hiring for.", kind: "out" }]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState(null); // null = /desktop root, "cluster", or "cluster/subdir" (careers only)
  const [careersProgress, setCareersProgress] = useState(loadCareersProgress);
  const [quizState, setQuizState] = useState(null); // null | {index, score}
  /* Product review finding: the quiz score was computed and then just discarded —
     quizState resets to null the instant the quiz ends, so nothing carried it forward
     to the actual lead (careersSubmitEmail below). This survives that reset so a real
     signal of candidate strength reaches Raghav/Sameer instead of vanishing. */
  const [lastQuizScore, setLastQuizScore] = useState(null);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const careersAnswerRef = useRef(null);
  const careersTimerRef = useRef(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  /* Command history (Up/Down) — plain refs, not state, since navigating history
     shouldn't itself trigger extra re-renders beyond the setInput() that already
     updates what's displayed. historyPosRef -1 means "not currently navigating, this
     is the live draft"; draftRef holds whatever was being typed before the user
     pressed Up, so pressing Down back past the newest history entry restores it
     instead of just clearing the line. */
  const historyRef = useRef([]);
  const historyPosRef = useRef(-1);
  const draftRef = useRef("");
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines, input]);
  useEffect(() => () => { if (careersTimerRef.current) clearInterval(careersTimerRef.current); }, []);

  /* careersProgress.step persists to localStorage, but the actual live puzzle state for
     Level 2 (window.__zuper_keys, the rotating timer, sessionStorage.__zuper_idx) only
     ever lives in careersAnswerRef/careersTimerRef — plain refs, reset to null on every
     mount. If Terminal ever unmounts while step === 2 (closing/reopening the window, a
     stray resize flipping to the mobile-fallback view and back, a hard refresh), a
     returning candidate was left stuck: progress said "Level 2 is live" but there was no
     actual state to solve. This regenerates a fresh Level 2 puzzle whenever step === 2
     but the in-memory answer is missing, so re-entry always has something real to solve
     instead of silently stranding whoever hits it. */
  function ensureLevel2Live() {
    if (careersAnswerRef.current && careersAnswerRef.current.level === 2) return false;
    careersStartLevel2(careersAnswerRef, careersTimerRef);
    return true;
  }
  useEffect(() => {
    if (careersProgress.step === 2) ensureLevel2Live();
    // eslint-disable-next-line
  }, []);

  /* Accepts either plain strings (default to kind "out", same as before) or
     {text, kind} objects — lets careers* helpers tag their own headings/labels/choices
     without every caller having to build the full object shape by hand. */
  function pushLines(newLines) { setLines((prev) => prev.concat(newLines.map((t) => (typeof t === "string" ? { text: t, kind: "out" } : t)))); }

  function careersSubmitAnswer(answer) {
    const trimmed = (answer || "").trim();
    const expected = careersAnswerRef.current;
    if (!trimmed) { setLines((prev) => prev.concat([{ text: "usage: bash submit.sh <answer>", kind: "err" }])); return; }
    if (!expected) {
      if (careersProgress.step === 2) {
        ensureLevel2Live();
        setLines((prev) => prev.concat([{ text: "Level 2's live state had reset — fresh keys are up now. Check DevTools again, then: bash submit.sh <key>", kind: "out" }]));
        return;
      }
      setLines((prev) => prev.concat([{ text: "Nothing to submit yet — run: bash solve.sh", kind: "err" }]));
      return;
    }

    if (expected.level === 1) {
      const dash = trimmed.lastIndexOf("-");
      const key = dash === -1 ? trimmed : trimmed.slice(0, dash);
      const code = dash === -1 ? "" : trimmed.slice(dash + 1);
      if (key === expected.key && code === expected.code) {
        playArcadeSuccessSound();
        const level2Lines = careersStartLevel2(careersAnswerRef, careersTimerRef);
        const next = { step: 2 }; setCareersProgress(next); saveCareersProgress(next);
        trackEvent("Careers Level 1 solved");
        pushLines([{ text: "LEVEL 1 COMPLETE", kind: "heading" }, "────────────────────────────────", ""].concat(level2Lines));
      } else {
        playArcadeFailSound();
        setLines((prev) => prev.concat([{ text: "That answer didn't check out. Double-check it and try again.", kind: "err" }]));
      }
    } else {
      if (trimmed === expected.key) {
        playArcadeSuccessSound();
        careersCleanupLevel2(careersTimerRef);
        careersAnswerRef.current = null;
        const next = { step: 3 }; setCareersProgress(next); saveCareersProgress(next);
        trackEvent("Careers Level 2 solved");
        pushLines([
          { text: "CHALLENGE COMPLETE", kind: "heading" }, "────────────────────────────────", "Both levels verified.", "",
          "You decoded base64 keys, read CSS custom properties, filtered network",
          "responses, stopped a rotating timer, and found a value in sessionStorage.",
          "That's the kind of engineer we're looking for.", "",
          "Reach out to careers@zuper.co with a screenshot of this terminal —",
          "or run: bash submit.sh <your email> [linkedin or portfolio url] and",
          "we'll reach out to you directly. The link is optional but helps.",
          "",
          "Not ready to apply yet? bash notify.sh <your email> — we'll just",
          "keep you posted about roles, no pressure.",
        ]);
        /* Increments exactly once, right here — the instant both levels are actually
           cleared, not on every mount/refresh (careersProgress.step already guards
           re-entry into this branch, since a second correct submit would just hit the
           step===4 "already completed" path in run() instead). Fails silent to null if
           the counter isn't configured — the line just never appears rather than
           showing an error over what's a nice-to-have stat, not the real conversion
           step (bash submit.sh <email> above still is). */
        careersFetchSolveCount("POST").then((count) => {
          if (count != null) pushLines([{ text: "You're solver #" + count + ".", kind: "out" }]);
        });
      } else {
        playArcadeFailSound();
        setLines((prev) => prev.concat([{ text: "That answer didn't check out. Double-check it and try again.", kind: "err" }]));
      }
    }
  }

  async function careersSubmitEmail(raw) {
    const trimmed = (raw || "").trim();
    if (!trimmed) { setLines((prev) => prev.concat([{ text: "usage: bash submit.sh <your email> [linkedin or portfolio url]", kind: "err" }])); return; }
    /* Product review finding: the notification email used to carry a bare address —
       a cold lead needing manual chase-down, not pipeline-ready data. First
       whitespace-separated token is still the email (what EMAIL_RE on the server
       validates); anything after it is an optional link — LinkedIn, portfolio,
       resume URL, whatever the candidate wants to hand over — plus the quiz score
       if they took bash quiz.sh this session. Both stay genuinely optional: this
       still works exactly as bash submit.sh <email> alone always did. */
    const spaceAt = trimmed.indexOf(" ");
    const email = spaceAt === -1 ? trimmed : trimmed.slice(0, spaceAt);
    const link = spaceAt === -1 ? "" : trimmed.slice(spaceAt + 1).trim();
    try {
      const r = await fetch("/api/careers-submit", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, link: link, quizScore: lastQuizScore }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data && data.ok) {
        const next = { step: 4 };
        setCareersProgress(next); saveCareersProgress(next);
        trackEvent("Careers email submitted");
        pushLines(["🎉 Thanks — we've got your details and someone from the team will be in touch."]);
      } else {
        setLines((prev) => prev.concat([{ text: r.status === 503 ? "Email notifications aren't configured yet — check back soon." : "Couldn't send that — double-check your email and try again.", kind: "err" }]));
      }
    } catch (err) {
      setLines((prev) => prev.concat([{ text: "Couldn't reach the server. Check your connection and try again.", kind: "err" }]));
    }
  }

  async function careersSubmitNotify(email) {
    const trimmed = (email || "").trim();
    if (!trimmed) { setLines((prev) => prev.concat([{ text: "usage: bash notify.sh <your email>", kind: "err" }])); return; }
    try {
      const r = await fetch("/api/careers-submit", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed, soft: true }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data && data.ok) {
        trackEvent("Careers notify-me submitted");
        pushLines(["👍 Got it — we'll keep you posted about roles. No pressure to finish the challenge."]);
      } else {
        setLines((prev) => prev.concat([{ text: r.status === 503 ? "Email notifications aren't configured yet — check back soon." : "Couldn't send that — double-check your email and try again.", kind: "err" }]));
      }
    } catch (err) {
      setLines((prev) => prev.concat([{ text: "Couldn't reach the server. Check your connection and try again.", kind: "err" }]));
    }
  }

  /* Desktop icons open this terminal already cd'd into the clicked cluster (see
     handleIconOpen in App) — jumpTo is a fresh {cwd, nonce} object each time, even for
     repeat clicks on the same icon, so this effect always re-fires. */
  useEffect(() => {
    if (!jumpTo || !findCluster(worldData, jumpTo.cwd)) return;
    const introLines = [{ text: "guest@zuper-web-os:/desktop$ cd " + jumpTo.cwd, kind: "cmd" }];
    if (jumpTo.cwd === "careers") {
      trackEvent("Careers opened");
      /* Clicking the careers icon lands you here already cd'd in — but nothing said
         what to do next (a design review found this the single biggest discoverability
         gap: no in-product hint that this is where the actual hiring challenge lives).
         A follow-up review then found every OTHER cluster (via More_Apps.exe) has the
         exact same silent-dead-end problem — folder/product windows are one click away
         via `ls`, but nothing says so — so that's now fixed everywhere, not just here.
         Returning solvers also now get a status-aware welcome instead of the same
         first-timer hint every visit, using the progress already persisted in
         localStorage (see loadCareersProgress/careersProgress above). */
      if (careersProgress.step === 1) introLines.push({ text: "Type 'ls' to look around, or 'cat readme.md' to see what this is about.", kind: "out" });
      else if (careersProgress.step === 2) introLines.push({ text: "Welcome back — Level 1's already cleared. Level 2 is still live: bash submit.sh <key>", kind: "out" });
      else if (careersProgress.step === 3) introLines.push({ text: "Welcome back — both levels are cleared. Still want to leave your email? bash submit.sh <your email>", kind: "out" });
      else introLines.push({ text: "Welcome back — you already finished this one. bash quiz.sh is still open if you want it.", kind: "out" });
    } else {
      introLines.push({ text: "Type 'ls' to look around.", kind: "out" });
    }
    setLines((prev) => prev.concat(introLines));
    setCwd(jumpTo.cwd);
    // eslint-disable-next-line
  }, [jumpTo]);

  function promptPath() { return cwd ? "/desktop/" + cwd : "/desktop"; }
  function promptString() { return "guest@zuper-web-os:" + promptPath() + "$"; }

  function run(cmd) {
    const trimmed = cmd.trim();
    if (trimmed === "") return;
    const out = [{ text: promptString() + " " + trimmed, kind: "cmd" }];

    if (quizState) {
      if (trimmed.toLowerCase() === "cancel") {
        setQuizState(null);
        out.push({ text: "Quiz cancelled.", kind: "out" });
        setLines((prev) => prev.concat(out));
        return;
      }
      const letters = ["a", "b", "c", "d"];
      const li = letters.indexOf(trimmed.toLowerCase());
      if (li === -1) {
        out.push({ text: "answer a, b, c, or d (or 'cancel')", kind: "err" });
        setLines((prev) => prev.concat(out));
        return;
      }
      const q = CAREERS_QUIZ[quizState.index];
      const correct = li === q.correct;
      out.push({ text: correct ? "Correct!" : "Incorrect. Correct answer: " + letters[q.correct] + ") " + q.choices[q.correct], kind: correct ? "out" : "err" });
      const nextIndex = quizState.index + 1;
      const nextScore = quizState.score + (correct ? 1 : 0);
      out.push({ text: "", kind: "out" });
      if (nextIndex >= CAREERS_QUIZ.length) {
        out.push({ text: "QUIZ COMPLETE", kind: "heading" });
        out.push({ text: "────────────────────────────────", kind: "out" });
        out.push({ text: "Score: " + nextScore + "/" + CAREERS_QUIZ.length, kind: "out" });
        out.push({ text: nextScore >= 3 ? "Great job! You know your stuff." : "Keep learning — technical depth is trainable.", kind: "out" });
        out.push({ text: "", kind: "out" });
        setLastQuizScore(nextScore);
        /* Used to just end there — a design review flagged the quiz as a pure dead end
           (score shown, nothing captured, no path onward). It's not the real hiring
           signal (solve.sh is), so this points forward instead of just stopping. */
        out.push({ text: careersProgress.step === 1 ? "Up for the real challenge? bash solve.sh" : "See what's actually open: cat open-roles.md", kind: "out" });
        setQuizState(null);
      } else {
        careersQuizQuestionLines(nextIndex).forEach((t) => out.push(t));
        setQuizState({ index: nextIndex, score: nextScore });
      }
      setLines((prev) => prev.concat(out));
      return;
    }

    /* Direct feedback: requiring the literal "bash" prefix for every script (and "cat"
       for every doc) doesn't match how anyone actually types at a real shell — real
       terminals accept ./file.sh, bash file.sh, or just file.sh interchangeably, and
       a bare filename for a text file is a completely normal instinct too. Rewriting
       here (not by adding parallel branches everywhere below) means every existing
       "bash x.sh" / "cat x.md" handler below keeps working unchanged — this only
       decides WHICH verb a bare/./-prefixed filename resolves to before the normal
       dispatch runs. Only rewrites the leading token, so it can't misfire on some
       later argument that happens to end in .sh/.md (e.g. a pasted URL). */
    const firstTok = trimmed.split(/\s+/)[0] || "";
    let effective = trimmed;
    if (/^\.\/[\w.-]+\.sh$/i.test(firstTok)) effective = "bash " + trimmed.slice(2);
    else if (/^[\w.-]+\.sh$/i.test(firstTok)) effective = "bash " + trimmed;
    else if (/^[\w.-]+\.md$/i.test(firstTok)) effective = "cat " + trimmed;

    const [verb, ...rest] = effective.split(/\s+/);
    const arg = rest.join(" ");

    if (verb === "clear") { setLines([]); return; }
    if (verb === "help") {
      out.push({ text: "Commands: help, ls, cd <dir>, pwd, cat <file>, bash <file.sh>, whoami, date, clear", kind: "out" });
      out.push({ text: "Shortcuts: ./file.sh, file.sh, and bare file.md all work too — no need to type bash/cat first.", kind: "out" });
      out.push({ text: "Tab completes, Up/Down cycles history, faded text is a suggestion — press → to accept it.", kind: "out" });
    }
    else if (verb === "pwd") { out.push({ text: promptPath(), kind: "out" }); }
    else if (verb === "whoami") { out.push({ text: "guest@zuper-web-os", kind: "out" }); }
    else if (verb === "date") { out.push({ text: new Date().toString(), kind: "out" }); }
    else if (verb === "ls") {
      if (!cwd) out.push({ text: worldData.map((c) => c.id + "/").join("  "), kind: "out" });
      else if (cwd === "careers") out.push({ text: "server/  agent/  database/  readme.md  product.md  open-roles.md  challenge-preview.md  solve.sh  quiz.sh  submit.sh  notify.sh", kind: "out" });
      else if (cwd === "careers/server") out.push({ text: "access.log", kind: "out" });
      else if (cwd === "careers/agent") out.push({ text: "agent.log", kind: "out" });
      else if (cwd === "careers/database") out.push({ text: "candidates.db", kind: "out" });
      else {
        out.push({ text: "opening " + cwd + "/ …", kind: "out" });
        if (onOpenFolder) onOpenFolder(cwd);
      }
    } else if (verb === "cd") {
      if (arg === ".." || arg === "") {
        if (cwd && cwd.indexOf("/") !== -1) setCwd(cwd.slice(0, cwd.indexOf("/")));
        else setCwd(null);
      } else if (cwd === "careers" && (arg === "server" || arg === "agent" || arg === "database")) {
        setCwd("careers/" + arg);
      } else if (findCluster(worldData, arg)) {
        if (arg === "careers") trackEvent("Careers opened");
        setCwd(arg);
      }
      else out.push({ text: "cd: no such directory: " + arg, kind: "err" });
    } else if (verb === "cat") {
      if (cwd === "careers" && arg === "readme.md") {
        out.push({ text: "Zuper Careers Challenge — two access-probe levels stand between you and the team.", kind: "out" });
        out.push({ text: "Run: bash solve.sh", kind: "out" });
        out.push({ text: "(Looking for Zuper's real Careers product instead? cat product.md)", kind: "out" });
        out.push({ text: "(Want to see what's actually open right now? cat open-roles.md)", kind: "out" });
        out.push({ text: "(Not on a laptop, or DevTools isn't your thing? cat challenge-preview.md)", kind: "out" });
        setLines((prev) => prev.concat(out));
        /* Social-proof teaser, only for someone who hasn't solved it yet — a solver
           gets their own "You're solver #N" line elsewhere (careersSubmitAnswer), this
           would be a non sequitur after the fact. Silently skipped if the counter isn't
           configured or reads 0 (nothing solved yet — "0 people have cracked this,
           join them" reads as a red flag, not an invitation). */
        if (careersProgress.step === 1) {
          careersFetchSolveCount("GET").then((count) => {
            if (count != null && count > 0) pushLines([{ text: count + " engineer" + (count === 1 ? " has" : "s have") + " already cracked this — join them.", kind: "out" }]);
          });
        }
        return;
      } else if (cwd === "careers" && arg === "challenge-preview.md") {
        /* The puzzle is entirely DevTools-gated with zero alternative — a design review
           flagged this as a real accessibility/inclusivity gap (nothing for a screen-
           reader user, a phone visitor, or anyone unfamiliar with DevTools), not just a
           nice-to-have. This is deliberately a plain-English description of the four
           real mechanics, not a walkthrough — it explains what's being tested without
           handing over any actual answers, so it doesn't dilute the engineering signal
           for candidates who do run the real thing. */
        out.push({ text: "CHALLENGE PREVIEW", kind: "heading" });
        out.push({ text: "────────────────────────────────", kind: "out" });
        out.push({ text: "No DevTools needed to read this — just what solve.sh actually tests:", kind: "out" });
        out.push({ text: "", kind: "out" });
        out.push({ text: "1. Reading a value straight from the Console — and recognizing it's", kind: "out" });
        out.push({ text: "   base64, a one-line decode.", kind: "out" });
        out.push({ text: "2. Finding a value that lives on a CSS custom property, not in any", kind: "out" });
        out.push({ text: "   visible component — the Elements panel, not React DevTools.", kind: "out" });
        out.push({ text: "3. Filtering real network responses for one specific field.", kind: "out" });
        out.push({ text: "4. Watching a value that's deliberately changing on a timer, and", kind: "out" });
        out.push({ text: "   grabbing the one part of it that's actually holding still.", kind: "out" });
        out.push({ text: "", kind: "out" });
        out.push({ text: "If DevTools isn't your thing right now, that's fine — it's not the", kind: "out" });
        out.push({ text: "only way to reach us. cat open-roles.md, or email careers@zuper.co.", kind: "out" });
      } else if (cwd === "careers" && arg === "product.md") {
        const c = findCluster(worldData, "careers");
        out.push({ text: "# " + c.name, kind: "out" });
        c.entities.forEach((e) => { out.push({ text: "- " + e.name + " (" + e.type + "): " + e.description, kind: "out" }); });
      } else if (cwd === "careers" && arg === "open-roles.md") {
        /* Real, pulled live from Zuper's actual careers portal (zupersoft.keka.com/
           careers) — not invented. Direct feedback after a design review flagged "no
           real open-roles content anywhere in the flow": checked the real listing
           first rather than guessing, found exactly one role with real technical
           scope open right now, and deliberately did NOT pad this out with fabricated
           engineering reqs (or ones "inspired by" real employees' LinkedIn) just to
           make the list look longer — a real candidate could act on this. */
        out.push({ text: "OPEN ROLES", kind: "heading" });
        out.push({ text: "────────────────────────────────", kind: "out" });
        out.push({ text: "Pulled live from Zuper's real careers portal — not invented.", kind: "out" });
        out.push({ text: "", kind: "out" });
        out.push({ text: "Senior Executive — Technical Implementation", kind: "label" });
        out.push({ text: "  Customer Experience · Chennai · Full-Time", kind: "out" });
        out.push({ text: "  The closest thing to an engineering-facing role open right now —", kind: "out" });
        out.push({ text: "  technical solutioning + implementation work for real customers.", kind: "out" });
        out.push({ text: "", kind: "out" });
        out.push({ text: "No pure software engineering roles (backend/frontend/DevOps/QA)", kind: "out" });
        out.push({ text: "are open at the moment. New ones show up here first:", kind: "out" });
        out.push({ text: "https://zupersoft.keka.com/careers/", kind: "out" });
      } else if (cwd === "careers/server" && arg === "access.log") {
        out.push({ text: "info: connection established from 10.0.4.12 — nothing else logged here.", kind: "out" });
      } else if (cwd === "careers/agent" && arg === "agent.log") {
        out.push({ text: "info: field agent daemon idle. the real challenge lives in /careers, not in here.", kind: "out" });
      } else if (cwd === "careers/database" && arg === "candidates.db") {
        out.push({ text: "cat: candidates.db: binary file, not readable. try solve.sh instead.", kind: "err" });
      } else if (!cwd) {
        out.push({ text: "cat: not inside a cluster directory", kind: "err" });
      } else if (arg === "readme.md") {
        const c = findCluster(worldData, cwd);
        out.push({ text: "# " + c.name, kind: "out" });
        c.entities.forEach((e) => { out.push({ text: "- " + e.name + " (" + e.type + "): " + e.description, kind: "out" }); });
      } else out.push({ text: "cat: no such file: " + arg, kind: "err" });
    } else if (verb === "bash") {
      const [scriptName, ...scriptArgsArr] = arg.split(/\s+/);
      const scriptArgs = scriptArgsArr.join(" ");
      if (cwd === "careers" && scriptName === "solve.sh") {
        if (careersProgress.step === 1) {
          out.push({ text: "Connecting to jsonplaceholder…", kind: "out" });
          setLines((prev) => prev.concat(out));
          careersSolveLevel1(careersAnswerRef).then((introLines) => pushLines(introLines));
          return;
        } else if (careersProgress.step === 2) {
          ensureLevel2Live();
          out.push({ text: "Level 2 is already active — solve it via DevTools, then: bash submit.sh <key>", kind: "out" });
        } else {
          out.push({ text: "Both levels already solved.", kind: "out" });
        }
      } else if (cwd === "careers" && scriptName === "quiz.sh") {
        out.push({ text: "", kind: "out" });
        out.push({ text: "TECHNICAL QUIZ", kind: "heading" });
        out.push({ text: "────────────────────────────────", kind: "out" });
        out.push({ text: "Answer 5 questions (a/b/c/d). Type 'cancel' to quit.", kind: "out" });
        out.push({ text: "", kind: "out" });
        careersQuizQuestionLines(0).forEach((t) => out.push(t));
        setQuizState({ index: 0, score: 0 });
      } else if (cwd === "careers" && scriptName === "notify.sh") {
        /* Product review finding: a solver who finishes CHALLENGE COMPLETE and doesn't
           submit.sh their email is gone for good — nothing captures the "not ready to
           apply right now, but keep me in mind" segment. Deliberately separate from
           submit.sh (which reads as "I'm applying now") and works at ANY step, not just
           after finishing — someone who's just read readme.md without wanting to do
           the DevTools puzzle can still opt in. Lower commitment, same underlying
           endpoint (careers-submit.js), a different email subject line so Raghav/
           Sameer can tell a soft signal apart from an active application. */
        if (!scriptArgs) {
          out.push({ text: "usage: bash notify.sh <your email>", kind: "err" });
        } else {
          out.push({ text: "Sending…", kind: "out" });
          setLines((prev) => prev.concat(out));
          careersSubmitNotify(scriptArgs);
          return;
        }
      } else if (cwd === "careers" && scriptName === "submit.sh") {
        if (careersProgress.step === 4) {
          out.push({ text: "You've already completed this challenge. Thanks!", kind: "out" });
        } else if (!scriptArgs) {
          out.push({ text: "usage: bash submit.sh <answer>", kind: "err" });
        } else if (careersProgress.step === 3) {
          out.push({ text: "Sending…", kind: "out" });
          setLines((prev) => prev.concat(out));
          careersSubmitEmail(scriptArgs);
          return;
        } else {
          setLines((prev) => prev.concat(out));
          careersSubmitAnswer(scriptArgs);
          return;
        }
      } else if (!cwd) {
        out.push({ text: "bash: not inside a cluster directory", kind: "err" });
      } else if (arg === "status.sh") {
        const c = findCluster(worldData, cwd);
        c.entities.forEach((e) => { out.push({ text: "[OK] " + e.id + " (" + e.type + ") responding…", kind: "out" }); });
        out.push({ text: "[OK] all nodes nominal.", kind: "out" });
      } else if (arg === "connections.sh") {
        const c = findCluster(worldData, cwd);
        if (c.flows.length === 0) out.push({ text: "no outbound flows defined.", kind: "out" });
        c.flows.forEach((f) => out.push({ text: f.from + " -> " + f.to + " [" + f.signalType + "]", kind: "out" }));
      } else out.push({ text: "bash: no such script: " + arg, kind: "err" });
    } else {
      out.push({ text: "command not found: " + verb + " (try 'help')", kind: "err" });
    }
    setLines((prev) => prev.concat(out));
  }

  /* Enter/history/completion/suggestion-accept all live on the real <input>'s
     onKeyDown, not run() — run() only ever handles what a submitted command actually
     DOES, this is purely about editing the not-yet-submitted line. Quiz mode keeps its
     original plain-Enter-only behavior (a/b/c/d, cancel) — none of history/tab-
     completion/coloring make sense mid-quiz, so everything past the Enter branch bails
     out early while quizState is set. */
  function handleTermKeyDown(e) {
    if (e.key === "Enter") {
      const val = input;
      const trimmedVal = val.trim();
      if (trimmedVal && historyRef.current[historyRef.current.length - 1] !== trimmedVal) {
        historyRef.current = historyRef.current.concat([trimmedVal]);
      }
      historyPosRef.current = -1;
      draftRef.current = "";
      run(val);
      setInput("");
      return;
    }
    if (quizState) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const hist = historyRef.current;
      if (hist.length === 0) return;
      if (historyPosRef.current === -1) { draftRef.current = input; historyPosRef.current = hist.length - 1; }
      else if (historyPosRef.current > 0) { historyPosRef.current -= 1; }
      setInput(hist[historyPosRef.current]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const hist = historyRef.current;
      if (historyPosRef.current === -1) return;
      if (historyPosRef.current < hist.length - 1) { historyPosRef.current += 1; setInput(hist[historyPosRef.current]); }
      else { historyPosRef.current = -1; setInput(draftRef.current); }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const spaceIdx = input.indexOf(" ");
      const wordStart = spaceIdx === -1 ? 0 : spaceIdx + 1;
      const partial = input.slice(wordStart);
      const candidates = terminalCompletions(input, cwd, worldData).filter((c) => c.toLowerCase().indexOf(partial.toLowerCase()) === 0);
      if (candidates.length === 0) return;
      if (candidates.length === 1) { setInput(input.slice(0, wordStart) + candidates[0] + " "); return; }
      const lcp = terminalLongestCommonPrefix(candidates);
      if (lcp.length > partial.length) setInput(input.slice(0, wordStart) + lcp);
      else setLines((prev) => prev.concat([{ text: candidates.slice().sort().join("  "), kind: "out" }]));
      return;
    }
    if (e.key === "ArrowRight") {
      const el = inputRef.current;
      const atEnd = el && el.selectionStart === input.length && el.selectionEnd === input.length;
      const ghost = terminalGhostSuggestion(input, historyRef.current);
      if (atEnd && ghost) { e.preventDefault(); setInput(ghost); }
    }
  }

  /* Live syntax coloring + auto-suggestion, computed fresh every render off the
     current input value — cheap (a handful of string ops on a short line), no need
     for useMemo. quizState keeps the plain white a/b/c/d line, same as before. */
  const inputSpaceIdx = input.indexOf(" ");
  const inputVerbPart = inputSpaceIdx === -1 ? input : input.slice(0, inputSpaceIdx);
  const inputRestPart = inputSpaceIdx === -1 ? "" : input.slice(inputSpaceIdx);
  const inputVerbColor = quizState ? "#ffffff" : terminalInputColor(input);
  const ghostSuggestion = quizState ? null : terminalGhostSuggestion(input, historyRef.current);

  /* The live prompt line lives INSIDE the scrolling log, right after the last output
     line — same as a real terminal (cmd.exe, a shell), where there's no separate
     "input box" below a divider and no placeholder hint; the prompt itself is where
     you type, and it scrolls up into history once you hit Enter. Clicking anywhere in
     the terminal refocuses the (invisible, borderless) input, same as a real one. */
  return (
    <div className="relative p-3 flex flex-col h-full font-terminal font-medium text-[14px] select-text"
      /* The desktop stage (App's outer div) is select-none so dragging icons/windows
         around doesn't accidentally highlight page text — but that's a `user-select`
         CSS property, which inherits into every window's content by default, including
         this one. That silently made it impossible to select/copy ANY terminal output
         (a real bug report: "not capable of copy or paste") — you couldn't even copy a
         value out to paste into a submit.sh command. select-text here overrides the
         inheritance back on for this window specifically; the guard below on onClick
         additionally stops the click-to-refocus-the-input behavior from immediately
         stealing back a selection the user just finished making (the standard fix any
         terminal emulator needs once its input steals focus on click). */
      onClick={() => { if (window.getSelection().toString()) return; inputRef.current && inputRef.current.focus(); }}
      /* Direct request: the careers challenge needs real DevTools access (Network tab,
         Elements, sessionStorage), and this OS's own right-click menu (see the
         desktop's onContextMenu below) was silently eating every right-click before the
         real browser menu — including "Inspect" — ever got a chance to show. A page
         can't show its own custom menu AND the browser's native one on the same click,
         so this is a deliberate exception carved out for exactly this one window:
         stopPropagation (not preventDefault) here means the event never reaches the
         desktop's handler, so the browser's real context menu appears instead. Every
         other window/the desktop itself is unaffected — still gets the custom OS menu. */
      onContextMenu={(e) => e.stopPropagation()}>
      <div ref={logRef} className="flex-1 overflow-y-auto space-y-1">
        {/* Careers-challenge content (solve/submit/quiz output) used to render as plain
           "out" lines like everything else — a STEP label, a quiz question, its a/b/c/d
           choices, and ordinary instruction text were all identical CRT green, direct
           feedback that they "look alike" and are hard to tell apart at a glance. Three
           extra kinds give it real hierarchy: "heading" for section titles (ACCESS
           PROBE — LEVEL N, CHALLENGE COMPLETE, TECHNICAL QUIZ), "label" for STEP N / QN
           sub-headers, "choice" for the a/b/c/d quiz options — each its own color/weight,
           ordinary body text stays plain CRT green. */}
        {lines.map((l, i) => (
          <div key={i}
            className={l.kind === "err" ? "text-red-400" : l.kind === "cmd" ? "text-white" : l.kind === "heading" || l.kind === "label" ? "font-bold tracking-wide" : ""}
            style={
              l.kind === "out" ? { color: CRT_GREEN, opacity: 0.85 }
              : l.kind === "heading" ? { color: CONCEPT }
              : l.kind === "label" ? { color: "#ffd98a" }
              : l.kind === "choice" ? { color: "#ffd98a", opacity: 0.85 }
              : undefined
            }>{l.text}</div>
        ))}
        {/* Design review's pitch: a generated retro badge is dramatically more postable
           than a screenshot of terminal scrollback. Sits right above the live prompt so
           it stays visible near wherever the transcript has scrolled to, once both
           levels are actually solved (step >= 3) — not shown for the quiz alone, that's
           a different, lower-stakes win. */}
        {careersProgress.step >= 3 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setShareCardOpen(true); }}
            className="px-2.5 py-1 text-[12px] font-semibold my-1"
            style={{ background: "rgba(255,176,0,.12)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }}>
            🎉 Generate a shareable "ACCESS GRANTED" card
          </button>
        )}
        <div className="flex items-center gap-2">
          <span style={{ color: CRT_GREEN }}>{promptString()}</span>
          {/* A real <input> still does all the work (value/onChange/focus/keydown) but
              is fully invisible (opacity 0, including its own native caret) — what's
              actually shown is this styled text plus a blinking block cursor after
              it, a classic terminal look that reads unmistakably as "type here"
              instead of a thin, easy-to-miss native i-beam caret sitting right after
              the prompt's own "$". */}
          <div className="relative flex-1">
            {/* Verb colored live (green = recognized, white = still a valid prefix,
                red = won't resolve to anything) — arguments after it stay plain white,
                same as before. */}
            <span style={{ whiteSpace: "pre" }}>
              <span style={{ color: inputVerbColor }}>{inputVerbPart}</span>
              <span className="text-white">{inputRestPart}</span>
            </span>
            <span aria-hidden="true" style={{
              display: "inline-block", width: "0.6em", height: "1.05em", verticalAlign: "text-bottom",
              background: CRT_GREEN, marginLeft: 1, animation: "term-cursor-blink 1s steps(1) infinite",
            }} />
            {/* Faded auto-suggestion (fish-style) — the rest of the most recent matching
                history entry, past what's actually been typed. Right arrow (at end of
                line) accepts it — see handleTermKeyDown. */}
            {ghostSuggestion && <span aria-hidden="true" style={{ whiteSpace: "pre", opacity: 0.38 }}>{ghostSuggestion.slice(input.length)}</span>}
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleTermKeyDown}
              className="absolute inset-0 bg-transparent outline-none opacity-0" style={{ caretColor: "transparent" }} spellCheck={false} autoComplete="off" autoFocus aria-label="Terminal command input" />
          </div>
        </div>
      </div>
      {shareCardOpen && <ShareCardOverlay onClose={() => setShareCardOpen(false)} />}
    </div>
  );
}

/* Ghost Portal (the real member-signup widget, embedded in index.html) scans the
   page for [data-portal] elements once, at its own script-init time — it does not
   use document-level click delegation. That's fine on labs.zuper.co's own page,
   where the trigger link is already in the initial static HTML, but this whole app
   renders via in-browser Babel, so the Taskbar's Subscribe link doesn't exist in the
   DOM yet when Portal's scan runs — its own auto-wiring silently never attaches to
   it, and clicking did nothing. Fixed by reaching into Portal's own iframe (same-
   origin via srcdoc, no sandbox) and clicking its real internal trigger directly —
   works regardless of mount timing since it's looked up on demand, not registered in
   advance. data-portal="signup" stays on the anchor too (harmless, and correct per
   Ghost's own convention) as a no-cost fallback path.

   Retries for a few seconds instead of trying once: on a real (not locally-served)
   deploy, Portal itself can still be mid-startup (fetching site/member config, and
   sometimes replacing its own iframe once — see index.html) for a second or two
   after this app's own UI is already interactive, so a click in that narrow window
   found nothing on the first attempt alone. preventDefault always fires immediately
   (required — it has to happen synchronously in the event handler, can't be delayed
   into the retry), and if Portal genuinely never becomes ready within the retry
   budget, this replays the exact navigation the browser would have done itself.

   Also explicitly un-blocks Portal's own iframe (pointer-events: none by default —
   see index.html) the moment a click actually reaches this handler, so the modal is
   interactive once it opens; index.html's own watcher clears that override again
   once the iframe collapses back down after the modal closes. */
function openGhostSignup(e) {
  e.preventDefault();
  trackEvent("Subscribe opened");
  const href = e.currentTarget.getAttribute("href");
  const target = e.currentTarget.getAttribute("target");
  let attempts = 0;
  function tryOpen() {
    attempts += 1;
    const root = document.getElementById("ghost-portal-root");
    const ifr = root && root.querySelector("iframe");
    if (ifr) ifr.style.pointerEvents = "auto";
    let doc = null;
    try { doc = ifr && (ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document)); } catch (err) { /* cross-origin — fall through to the retry/fallback below */ }
    const trigger = doc && doc.querySelector("[class*='triggerbtn-container']");
    if (trigger) { trigger.click(); return; }
    if (attempts < 15) { setTimeout(tryOpen, 200); return; }
    if (target === "_blank") window.open(href, "_blank", "noopener"); else window.location.href = href;
  }
  tryOpen();
}

/* ================= Taskbar / Start menu ================= */
function Taskbar({ onStartClick, running, onRunningClick, theme }) {
  const [clock, setClock] = useState("");
  const t = theme || THEME;
  useEffect(() => {
    function tick() { const d = new Date(); setClock(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")); }
    tick(); const id = setInterval(tick, 15000); return () => clearInterval(id);
  }, []);
  return (
    <div className="fixed left-0 right-0 bottom-0 h-[52px] flex items-center gap-3 px-3 z-[800]" style={{ background: t.taskbarBg, backdropFilter: t.winBlur === "none" ? undefined : "blur(10px)", boxShadow: bevel("out-shallow", t.winBorder) + ", inset 0 1px 0 rgba(0,0,0,.4)" }}>
      <button type="button" onClick={onStartClick} className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[13px] font-semibold" style={{ background: t.accent, color: "#040200", boxShadow: bevel("out-shallow", t.accent) }}>&#9635; Start</button>
      <div className="flex-1 flex gap-1.5 overflow-x-auto">
        {running.map((r) => (
          <button key={r.id} type="button" onClick={() => onRunningClick(r.id)}
            className="px-2.5 py-1 font-mono font-semibold text-[13px] whitespace-nowrap"
            style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel(r.focused ? "in-shallow" : "out-shallow", r.focused ? t.accent : t.winBorder), color: r.focused ? t.chromeText : t.chromeTextDim, fontFamily: t.fontChrome || undefined }}>{r.title}</button>
        ))}
      </div>
      <span aria-hidden="true" className="font-mono font-semibold text-[11px]" style={{ color: t.chromeText, fontFamily: t.fontChrome || undefined }}>{clock}</span>
      {/* onClick triggers the real Ghost signup modal directly (see openGhostSignup
          above) — data-portal="signup" is also set per Ghost's own convention, and
          href/target remain as a fallback if the embed script hasn't loaded at all. */}
      <a href="https://labs.zuper.co/#/portal/signup" target="_blank" rel="noopener" data-portal="signup" onClick={openGhostSignup} className="text-[11px] underline" style={{ color: t.accent }}>Subscribe</a>
    </div>
  );
}

function StartMenu({ open, onClose, onOpen, topApps, onFullscreen, onFind, onRun, onReboot, onSession, onRecycleBin, trashedCount, theme }) {
  if (!open) return null;
  const t = theme || THEME;
  function item(label, fn) {
    return (
      <button type="button" className="crt-item w-full text-left px-4 py-2 pl-5"
        style={{ color: t.chromeTextDim, fontFamily: t.fontChrome || undefined }}
        onClick={() => { fn(); onClose(); }}>{label}</button>
    );
  }
  return (
    <React.Fragment>
      <div className="fixed inset-0 z-[840]" onClick={onClose}></div>
      <div className="fixed left-3 bottom-[60px] w-72 max-h-[70vh] overflow-y-auto py-2 z-[850] font-mono font-semibold text-[13px]"
        style={{ background: t.panelBg, backdropFilter: t.panelBlur, borderRadius: t.winRadius === "0px" ? "0px" : "8px", boxShadow: bevel("out-deep", t.winBorder), fontFamily: t.fontChrome || undefined }}
        onClick={(e) => e.stopPropagation()}>
        {/* The real "Zuper Labs" wordmark, once, as a header — the taskbar itself is
            already dense (running-app buttons, clock, Subscribe), so the Start menu
            is the tasteful spot for a stronger real-brand presence in the OS chrome. */}
        <div className="px-4 pt-2 pb-2 border-b" style={{ borderColor: t.winBorder }}>
          <img src="./assets/zuper-wordmark.png" alt="Zuper Labs" style={{ height: 22 }} />
        </div>
        <div className="px-4 pt-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.chromeTextDim, opacity: .7 }}>Programs</div>
        {topApps.map((a) => (
          <button key={a.id} type="button" className="crt-item w-full text-left px-4 py-2 pl-5 flex items-center gap-2.5" style={{ color: t.chromeText }} onClick={() => onOpen(a.id)}>
            <IconImg icon={a.icon} size={20} className="w-5 text-center flex-shrink-0" />{a.title}
          </button>
        ))}
        <div className="my-1.5 border-t" style={{ borderColor: t.winBorder }}></div>
        {item("🖥️ Fullscreen", onFullscreen)}
        {item("🔎 Find", onFind)}
        {item("▶ Run...", onRun)}
        {item("🗑️ Recycle Bin" + (trashedCount > 0 ? " (" + trashedCount + ")" : ""), onRecycleBin)}
        {item("🔄 Reboot", onReboot)}
        {item("👤 Session", onSession)}
      </div>
    </React.Fragment>
  );
}

/* ================= Desktop assistant — an original CRT-terminal-robot mascot: a
   boxy retro monitor head on tank treads, its screen glowing in the OS's own CRT
   accent color (t.accent — ties to whatever CRT color theme is active, not a fixed
   hex) with a pixel-block smiley and a blinking >_ cursor, a small power LED in
   Zuper's real brand orange (ACCENT) as the one brand-color touch (own design, own
   proportions; earlier passes were an alien-cat, a humanoid, a head-only golden-dog,
   a head-only otter, a full-body otter, then an orange wrench, replaced in turn per
   direction — the wrench in particular didn't tie into the OS's own mono-CRT theme at
   all, which is exactly what this redesign fixes). Chosen deliberately as "an object
   with a personality" in the spirit of a classic desktop-assistant character, WITHOUT
   using that character: Microsoft's actual Clippy asset/sprite (investigated twice —
   via felixrieseberg/clippy's npm package, and again via a standalone Clippy.exe
   Electron build, both confirmed to bundle the real Office Assistant artwork with no
   valid grant, only self-asserted fair-use) can't be reused here regardless of
   internal risk-tolerance or how many times it's asked for. A reference screenshot of
   a different retro-CRT-robot character (a third party's own branded product mascot)
   was used the same way — style/vibe inspiration only, no traced shapes, no borrowed
   name or branding. No hard cartoon outlines anywhere — every part is a gradient fill
   plus soft translucent shadows, which is what actually reads as "soft 3D" rather
   than a flat outlined icon. The outer <button>
   used to visually BE a 64x64 circular badge (background+border+boxShadow all
   circle-shaped) — that's why only a head ever fit and why it always read as "a face
   in a circular badge"; the button is now just an invisible hit-box, and every visible
   pixel is drawn by the SVG at whatever size the figure actually needs. The glow is a
   drop-shadow filter on the SVG (hugs the actual drawn silhouette) instead of a
   boxShadow on the button. On top of that, the whole SVG gets a genuine CSS 3D
   transform (perspective + rotateY, real 3D, not just shading) as an idle animation —
   visible dimensionality without the cost/complexity of a full WebGL rewrite, which is
   what got reverted earlier when tried for the whole Zuper Quest town. Has its own
   set of original animation "states" — idle eye-blink, a real terminal-style hard-cut
   cursor blink, ambient CRT scanline flicker, a tread-rock wave on opening and a wave
   goodbye on closing, a hover-notice perk-up, a randomized idle fidget (a head glance)
   every ~12-22s so it stays alive even untouched, a tread-rock on a fresh reply, and a
   head-tilt while thinking. The screen's own content swaps per state too — a small
   pixel hand waving on greet, "GOODBYE!!!" rendered in VT323 on close, a bright
   scan-bar sweeping down the screen (a "glitch" cue) on hover, and three pulsing
   loading dots while thinking — in the same "always a little alive, reacts to
   touch/click/idle" interaction-design vocabulary classic assistant characters use (a
   named greeting/thinking/idle animation set, the kind @react95/clippy exposes), but
   hand-built as CSS/SVG
   transforms on this original character, not any borrowed sprite frames. Sound
   effects for greet/goodbye/hover follow the same rule — synthesized from scratch
   with the Web Audio API (getSharedAudioCtx/synthNote helpers, top of this
   file), short vibrato-wobbled triangle-wave note runs tuned to sound like a cute
   chirpy little robot (an LFO wobbling each note's own pitch, R2-D2-style, rather
   than a flat pitch-glide, which read as a plain notification "ping" instead of a
   character), so there's no sampled audio clip to license either —
   @react95/clippy ships actual extracted Microsoft Office character assets (confirmed
   by inspecting the published package), so it and @react95/icons were both ruled out
   earlier this session. Tries a real
   Claude call first (via
   api/ask.js) grounded in the REAL labs.zuper.co cluster/entity/flow data, falling back
   to deterministic local keyword search if Claude isn't configured — every answer is
   tagged with its actual source. Docks near the focused window until manually dragged,
   then stays put. ================= */
const ASSISTANT_TIPS = [
  "Right-click the desktop for more options, or double-click empty space for New.",
  "Open Display settings to change icon size or text size.",
  "Every cluster name here is real — pulled straight from labs.zuper.co's own scene data.",
  "The Arcade games are concept analogies only — never a simulation of real Zuper algorithms.",
  "Press Start → Find (or Run) to quickly jump to any app.",
  "Windows resize from any edge or the bottom-right corner — try dragging one.",
  "Right-click any icon for Rename or Move to Trash.",
];

function normalizeQ(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function includesWord(haystack, needle) {
  if (!needle) return false;
  return new RegExp("(^|\\s)" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\s|$)").test(haystack);
}

/* Deterministic local search over the real cluster/entity/flow data — no network call,
   no model, just substring/word-boundary matching against zuper-world-data.json. */
function answerFromWorldData(worldData, question) {
  const q = normalizeQ(question);
  if (!q) return "Ask me something — try a cluster name, an entity name, or \"how many clusters are there?\".";
  if (!worldData || !worldData.length) return "Platform data hasn't finished loading yet — give it a second and try again.";

  if (/\btip\b/.test(q)) return ASSISTANT_TIPS[Math.floor(Math.random() * ASSISTANT_TIPS.length)];
  if (/how many cluster/.test(q)) return worldData.length + " real clusters, straight from labs.zuper.co: " + worldData.map((c) => c.name).join(", ") + ".";
  if (/how many entit/.test(q)) return worldData.reduce((s, c) => s + c.entities.length, 0) + " real entities across " + worldData.length + " clusters.";
  if (/list.*cluster|what clusters|which clusters/.test(q)) return worldData.map((c) => "• " + c.name + " (" + c.id + ")").join("\n");

  let bestEntity = null, bestCluster = null;
  worldData.forEach((c) => {
    c.entities.forEach((e) => {
      const n = normalizeQ(e.name);
      if (n.length >= 3 && includesWord(q, n) && (!bestEntity || n.length > normalizeQ(bestEntity.name).length)) {
        bestEntity = e; bestCluster = c;
      }
    });
  });
  if (bestEntity) {
    let out = bestEntity.name + " (" + bestEntity.type + ", in " + bestCluster.name + "): " + bestEntity.description;
    if (bestEntity.details && bestEntity.details.length) out += "\n" + bestEntity.details.map((d) => "• " + d).join("\n");
    return out;
  }

  const cluster = worldData.find((c) => includesWord(q, normalizeQ(c.id)) || includesWord(q, normalizeQ(c.name)));
  if (cluster) {
    if (/flow|connect|signal|talk|send/.test(q)) {
      if (!cluster.flows.length) return cluster.name + " has no recorded data-flows in the source data.";
      const list = cluster.flows.slice(0, 6).map((f) => f.from + " → " + f.to + " (" + f.signalType + ")").join("\n");
      return cluster.name + "'s real data-flows:\n" + list + (cluster.flows.length > 6 ? "\n…and " + (cluster.flows.length - 6) + " more." : "");
    }
    const sample = cluster.entities.slice(0, 5).map((e) => e.name + " (" + e.type + ")").join(", ");
    return cluster.name + " is one of Zuper's 14 real product clusters — " + cluster.entities.length + " entities, " + cluster.flows.length + " data-flows. Entities include: " + sample + (cluster.entities.length > 5 ? ", …" : "") + ".";
  }

  return "I couldn't match that to real platform data — I only answer from labs.zuper.co's actual clusters/entities/flows, no live language model behind this. Try \"what is ai-intelligence\", an entity name, or \"how many clusters are there?\".";
}

/* Session-only cap on real LLM calls from a single browser tab — this endpoint is public
   once deployed, so this is a cheap guardrail against one runaway tab burning API spend.
   Not real abuse protection (that would need server-side rate limiting); documented as a
   known limitation in the README. */
const LLM_SESSION_LIMIT = 30;

function AssistantWidget({ theme, stageRef, worldData, hasFocusedWindow }) {
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zuper-os-assistant-pos")); } catch (e) { return null; }
  });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const llmCallsRef = useRef(0);
  const logRef = useRef(null);
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const t = theme || THEME;

  /* Original animation "states" for the mascot — same interaction vocabulary classic
     assistant characters use (a greeting gesture on open, a goodbye on close, a
     hover-notice, idle fidgets, a thinking pose while waiting, an excited response)
     but hand-built here as CSS/SVG transforms on our own original character, not any
     borrowed sprite frames. */
  const [greet, setGreet] = useState(false);
  const [bye, setBye] = useState(false);
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setGreet(true);
      const id = setTimeout(() => setGreet(false), 700);
      prevOpenRef.current = open;
      return () => clearTimeout(id);
    }
    if (!open && prevOpenRef.current) {
      setBye(true);
      const id = setTimeout(() => setBye(false), 700);
      prevOpenRef.current = open;
      return () => clearTimeout(id);
    }
    prevOpenRef.current = open;
  }, [open]);

  const [excited, setExcited] = useState(false);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant") {
      setExcited(true);
      const id = setTimeout(() => setExcited(false), 1400);
      return () => clearTimeout(id);
    }
  }, [messages]);

  /* Hover-notice — a quick "perk up" when the pointer lands on the mascot, the same
     kind of always-alive touch-reactivity classic assistant characters have. */
  const [hover, setHover] = useState(false);

  /* Idle fidgets — small unprompted gestures on a randomized timer while the panel is
     closed, so the character feels alive even when nobody's interacting with it
     (mirrors the idle-animation habit of classic assistant characters), not just
     when clicked/hovered. */
  const [fidget, setFidget] = useState(false);
  useEffect(() => {
    if (open) return;
    let waitId, holdId;
    function schedule() {
      waitId = setTimeout(() => {
        setFidget(true);
        holdId = setTimeout(() => { setFidget(false); schedule(); }, 900);
      }, 12000 + Math.random() * 10000);
    }
    schedule();
    return () => { clearTimeout(waitId); clearTimeout(holdId); };
  }, [open]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, open, thinking]);

  async function ask(question) {
    const text = (typeof question === "string" ? question : input).trim();
    if (!text || thinking) return;
    setMessages((m) => [...m, { role: "user", text: text }]);
    setInput("");
    setThinking(true);
    let answer = null, source = "local";
    if (llmCallsRef.current < LLM_SESSION_LIMIT) {
      try {
        const r = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
        if (r.ok) {
          const data = await r.json();
          if (data && data.answer) { answer = data.answer; source = "claude"; llmCallsRef.current += 1; }
        }
      } catch (e) { /* network/API unavailable — fall through to local search */ }
    }
    if (!answer) answer = answerFromWorldData(worldData, text);
    setThinking(false);
    setMessages((m) => [...m, { role: "assistant", text: answer, source: source }]);
  }

  const suggestions = React.useMemo(() => {
    if (!worldData || !worldData.length) return ["Give me a tip"];
    const withEntities = worldData.find((c) => c.entities.length);
    const sample = withEntities ? withEntities.entities[0].name : null;
    return ["How many clusters are there?", "What is " + worldData[0].name + "?"].concat(sample ? ["Tell me about " + sample] : []).concat(["Give me a tip"]);
  }, [worldData]);

  /* Proactive "nudge" — the logo-based mascot has no animated face/screen to draw the
     eye the way the old CRT-robot did, so left alone it can read as a static app icon.
     After 90s of no interaction while the panel's closed, surface a small speech
     bubble to invite a click; it auto-hides itself a few seconds later either way.
     Any hover/click/drag resets the idle clock (via bumpActivity) so it never shows
     more than once per idle stretch — a nudge, not a nag. The bubble's own wording is
     a casual, talked-out-loud version ("hey, know what X is? wanna know!") of the
     same real question the chat's suggestion chips ask — kept as a separate list from
     `suggestions` above so the chips can stay plainly worded while the nudge gets to
     be chattier; both drive the exact same local-search/Claude question underneath. */
  const nudgeSuggestions = React.useMemo(() => {
    if (!worldData || !worldData.length) return [{ label: "hey, want a quick tip?", question: "Give me a tip" }];
    const withEntities = worldData.find((c) => c.entities.length);
    const sample = withEntities ? withEntities.entities[0].name : null;
    const firstName = worldData[0].name;
    const list = [
      { label: "hey, know how many clusters there are? wanna know!", question: "How many clusters are there?" },
      { label: "curious what " + firstName + " is? just ask!", question: "What is " + firstName + "?" },
    ];
    if (sample) list.push({ label: "hey, know what " + sample + " is? wanna know!", question: "Tell me about " + sample });
    list.push({ label: "need a quick tip? I got one!", question: "Give me a tip" });
    return list;
  }, [worldData]);
  const [nudge, setNudge] = useState(null);
  const [nudgeTick, setNudgeTick] = useState(0);
  function bumpActivity() {
    setNudgeTick((k) => k + 1);
    setNudge(null);
  }
  useEffect(() => {
    /* Design review finding: the nudge bubble used to fire even while a Terminal/
       Recycle Bin/Arcade window had focus — an unsolicited interruption competing with
       whatever the visitor was actually doing. hasFocusedWindow (from App's
       focusedWinState) suppresses it whenever any window is focused; it only surfaces
       on the bare desktop, which is also the one place it's actually asking for
       attention on nothing else. */
    if (open || thinking || hasFocusedWindow) { setNudge(null); return; }
    const id = setTimeout(() => {
      setNudge(nudgeSuggestions[Math.floor(Math.random() * nudgeSuggestions.length)]);
    }, 90000);
    return () => clearTimeout(id);
  }, [open, thinking, hasFocusedWindow, nudgeTick, nudgeSuggestions]);
  useEffect(() => {
    if (!nudge) return;
    const id = setTimeout(() => { setNudge(null); setNudgeTick((k) => k + 1); }, 9000);
    return () => clearTimeout(id);
  }, [nudge]);
  function onNudgeClick() {
    const q = nudge && nudge.question;
    setNudge(null);
    setOpen(true);
    ask(q);
  }

  function defaultPos() {
    const rect = stageRef.current ? stageRef.current.getBoundingClientRect() : { width: 1400, height: 800 };
    return { x: rect.width - 110, y: rect.height - 210 };
  }
  /* Direct feedback: the mascot used to dock near whatever window had focus, jumping
     around the screen as you opened/switched windows — confusing, and not what was
     asked for. Default placement is now always bottom-right (defaultPos()) until the
     user actually drags it somewhere else, full stop — no more per-window docking. */
  const docked = !pos;
  const current = pos || defaultPos();
  /* Both popups (chat panel, nudge bubble) used to always open UPWARD from the mascot
     by a fixed offset — correct only when the mascot sits near the bottom of the
     screen. A first fix flipped to open downward below a fixed y:340 threshold, but
     that only checked distance from the TOP — at the mascot's default dock (bottom-
     right of the stage) on any viewport under ~640px tall, current.y itself already
     lands under 340, so it "correctly" flips downward... into a stage that doesn't
     have room downward either. Confirmed live by a second review: rendered rect
     y:483 h:302 on a 529px-tall stage, overflowing the bottom by 250px+. Compare
     actual space in both directions against the real stage height instead of a
     guessed constant, and pick whichever side has more room — always the least-bad
     option even when neither fully fits. */
  const stageRectNow = stageRef.current ? stageRef.current.getBoundingClientRect() : { height: 800 };
  const MASCOT_H = 160;
  const spaceAbove = current.y;
  const spaceBelow = Math.max(0, stageRectNow.height - (current.y + MASCOT_H));
  const openUpward = spaceAbove >= spaceBelow;
  const nudgeUpward = openUpward;
  const panelMaxH = Math.max(160, (openUpward ? spaceAbove : spaceBelow) - 16);
  const nudgeMaxH = Math.max(90, (openUpward ? spaceAbove : spaceBelow) - 16);

  useEffect(() => {
    function onMove(e) {
      const d = dragRef.current;
      if (!d.dragging) return;
      const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
      const rect = stageRef.current ? stageRef.current.getBoundingClientRect() : { width: 2000, height: 2000 };
      const nx = clamp(d.startLeft + dx, 4, rect.width - 90);
      const ny = clamp(d.startTop + dy, 4, rect.height - 170);
      setPos({ x: nx, y: ny });
    }
    function onUp() { dragRef.current.dragging = false; }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [stageRef]);

  useEffect(() => { try { if (pos) localStorage.setItem("zuper-os-assistant-pos", JSON.stringify(pos)); } catch (e) {} }, [pos]);

  function onPointerDown(e) {
    bumpActivity();
    dragRef.current = { dragging: true, moved: false, startX: e.clientX, startY: e.clientY, startLeft: current.x, startTop: current.y };
  }
  function onClickCapture(e) {
    if (dragRef.current.moved) { e.preventDefault(); e.stopPropagation(); dragRef.current.moved = false; }
  }
  function onSubmit(e) { e.preventDefault(); ask(); }

  return (
    <div className="absolute pointer-events-auto" style={{ left: current.x, top: current.y, zIndex: 500, transition: docked ? "left .4s ease, top .4s ease" : "none" }}
      onPointerDown={onPointerDown}>
      {open && (
        <div className={"absolute right-0 w-72 p-3 font-mono font-medium text-[13px] flex flex-col " + (openUpward ? "bottom-[166px]" : "top-[176px]")}
          style={{ background: t.panelBg, backdropFilter: t.panelBlur, borderRadius: t.winRadius === "0px" ? "0px" : "10px", boxShadow: bevel("out-deep", t.winBorder) + ", 0 16px 40px rgba(0,0,0,.5)", maxHeight: panelMaxH, overflowY: "auto" }}>
          <div className="flex items-start justify-end">
            <button type="button" onClick={() => setOpen(false)} className="text-[0.9rem] leading-none px-1" style={{ color: t.chromeTextDim }} aria-label="Hide assistant">×</button>
          </div>
          <div ref={logRef} className="overflow-y-auto my-2" style={{ maxHeight: 220, minHeight: messages.length ? 60 : 0 }}>
            {messages.length === 0 && (
              <p className="leading-relaxed" style={{ color: t.chromeTextDim }}>
                Ask about any real Zuper cluster, entity, or data-flow. Every answer is tagged
                with where it came from — Claude, or this app's own local search.
              </p>
            )}
            {messages.map((m, i) => (
              <p key={i} className="leading-relaxed whitespace-pre-wrap my-1.5" style={{ color: m.role === "user" ? t.chromeTextDim : t.chromeText }}>
                {m.role === "user" ? "> " : ""}{m.text}
                {m.role === "assistant" && (
                  <span style={{ color: t.chromeTextDim, fontSize: "10px", fontWeight: 500 }}>{m.source === "claude" ? "  — via Claude" : "  — local search"}</span>
                )}
              </p>
            ))}
            {thinking && <p className="leading-relaxed" style={{ color: t.chromeTextDim }}>…thinking</p>}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestions.map((s, i) => (
              <button key={i} type="button" disabled={thinking} onClick={() => ask(s)} className="px-2 py-0.5 text-[12px] font-semibold disabled:opacity-40" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>{s}</button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="flex gap-1.5">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" autoComplete="off" disabled={thinking}
              className="flex-1 px-2 py-1 text-[13px] font-medium bg-transparent outline-none disabled:opacity-40" style={{ border: "none", boxShadow: bevel("in-shallow", t.winBorder), color: t.chromeText, caretColor: t.accent }} />
            <button type="submit" disabled={thinking} className="px-2.5 py-1 text-[12px] font-semibold disabled:opacity-40" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeText }}>Ask</button>
          </form>
        </div>
      )}
      {nudge && !open && (
        <button type="button" onClick={onNudgeClick}
          /* The wrapper div's own onPointerDown (drag-initiation) called bumpActivity(),
             which clears `nudge` on ANY pointerdown inside the widget — including on
             this button itself. pointerdown fires (and this component re-renders with
             nudge=null, unmounting this very button) before the click event that would
             have run onNudgeClick ever gets a chance to — confirmed live: every nudge
             click just silently dismissed the bubble with zero content delivered.
             Stopping propagation here keeps the wrapper's drag logic intact for the
             mascot figure itself while letting this button's own click fire normally. */
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={"Ask: " + nudge.label}
          className={"absolute right-3 w-[180px] px-3.5 py-3 text-[12px] font-bold text-left leading-snug " + (nudgeUpward ? "bottom-[128px]" : "top-[172px]")}
          style={{
            background: "#fff3e0", color: "#2a1608",
            border: "2.5px solid " + t.accent,
            borderRadius: "26% 24% 28% 30% / 55% 50% 45% 50%",
            boxShadow: "0 8px 18px rgba(0,0,0,.45)",
            animation: "nudge-in .35s ease-out 1",
            maxHeight: nudgeMaxH, overflow: "hidden",
          }}>
          {/* faint halftone-dot texture, comic-panel style */}
          <span aria-hidden="true" style={{
            position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
            backgroundImage: "radial-gradient(" + t.accent + "55 1px, transparent 1.3px)",
            backgroundSize: "7px 7px", opacity: 0.5,
          }} />
          <span style={{ position: "relative" }}>{nudge.label}</span>
          {/* speech-bubble tail — points down toward the mascot when the bubble opens
              above it, or up toward the mascot when flipped below it (see nudgeUpward) */}
          {nudgeUpward ? (
            <span aria-hidden="true" style={{
              position: "absolute", right: 16, bottom: -8, width: 16, height: 16,
              background: "#fff3e0", borderRight: "2.5px solid " + t.accent, borderBottom: "2.5px solid " + t.accent,
              transform: "rotate(45deg)", borderRadius: "0 0 3px 0",
            }} />
          ) : (
            <span aria-hidden="true" style={{
              position: "absolute", right: 16, top: -8, width: 16, height: 16,
              background: "#fff3e0", borderLeft: "2.5px solid " + t.accent, borderTop: "2.5px solid " + t.accent,
              transform: "rotate(45deg)", borderRadius: "3px 0 0 0",
            }} />
          )}
        </button>
      )}
      {/* It's draggable (see onPointerDown above) but nothing signalled that — a design
          review found it can land right on top of a game's own controls (e.g. Route
          Racer) with no cue that it's movable, reading as broken rather than "drag me
          out of the way." A grab cursor + native title tooltip costs nothing and is the
          standard browser affordance for "this moves." */}
      <button type="button" onClickCapture={onClickCapture} onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => { setHover(true); bumpActivity(); }} onMouseLeave={() => setHover(false)}
        className="flex items-center justify-center relative focus-visible:outline focus-visible:outline-2"
        style={{ width: 80, height: 160, animation: "zuper-bob 3s ease-in-out infinite", outlineColor: t.accent, overflow: "visible", cursor: "grab" }}
        title="Click to ask a question — drag to move me"
        aria-label="Zuper OS assistant — real platform data, Claude when configured. Draggable.">
        {/* The assistant's visual identity IS the real Zuper Labs logo now (direct
            request — not an SVG character wearing a badge with the logo on it). It
            sits in a small device-style bezel (echoes the OS's own dark CRT-case
            material/gradient) so it still reads as a desktop widget with real depth,
            not a flat pasted image floating in space, but every prior interaction
            channel (drag, click-to-open, greet/bye/hover/thinking/excited states,
            the sound cues) is preserved — just re-expressed as CSS transforms/opacity
            /glow on the logo image itself instead of swapping SVG sub-parts. */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 80, height: 160, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", left: 8, top: 46, width: 64, height: 64, borderRadius: 16,
            background: "radial-gradient(120% 120% at 35% 22%, #565f5f 0%, #2c3232 55%, #131616 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), inset 0 -2px 4px rgba(0,0,0,.5), 0 2px 4px rgba(0,0,0,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            filter: "drop-shadow(0 10px 14px rgba(0,0,0,.5)) drop-shadow(0 0 7px " + t.accent + "90)",
            animation: hover ? "mascot-notice .5s ease-out 1" : thinking ? "dog-think-tilt 1.6s ease-in-out infinite" : fidget ? "mascot-fidget .9s ease-in-out 1" : "mascot-3d-tilt 5s ease-in-out infinite",
          }}>
            {/* breathing wrapper — a continuous, gentle scale pulse (own nested element
                so it composes with the plate's own tilt/notice/fidget transform above
                instead of fighting it for the same CSS property) is what reads as
                "alive" now that the mascot is a flat logo mark instead of an animated
                CRT-robot screen. No CRT-style flicker/scanline artifacts here anymore —
                those belonged to the old character; this is just a clean, calm glow. */}
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", animation: "mascot-breathe 2.6s ease-in-out infinite" }}>
              {/* ambient glow ring — brighter/faster on greet, goodbye, or a fresh reply */}
              <div style={{
                position: "absolute", inset: -6, borderRadius: "50%",
                background: "radial-gradient(circle, " + t.accent + "50 0%, transparent 72%)",
                animation: (greet || bye || excited) ? "dot-pulse .5s ease-in-out 3" : "dot-pulse 3s ease-in-out infinite",
              }} />
              <img src="./assets/zuper-logo.png" alt="Zuper Labs" draggable={false} style={{
                position: "relative", width: 42, height: 42, objectFit: "contain",
                filter: "drop-shadow(0 0 6px " + t.accent + "a0)",
                transform: bye ? "scale(.7) translateY(6px)" : greet ? "scale(1.18)" : hover ? "scale(1.08)" : "scale(1)",
                opacity: bye ? 0.35 : 1,
                transition: "transform .25s ease, opacity .35s ease",
              }} />
              {/* thinking indicator — same three-dot pulse the terminal-screen version used */}
              {thinking && (
                <div style={{ position: "absolute", bottom: 8, display: "flex", gap: 3 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent, filter: "drop-shadow(0 0 2px " + t.accent + ")", animation: "dot-pulse 1s ease-in-out infinite" }} />
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent, filter: "drop-shadow(0 0 2px " + t.accent + ")", animation: "dot-pulse 1s ease-in-out infinite", animationDelay: "0.15s" }} />
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent, filter: "drop-shadow(0 0 2px " + t.accent + ")", animation: "dot-pulse 1s ease-in-out infinite", animationDelay: "0.3s" }} />
                </div>
              )}
            </div>
          </div>
          {/* small grounding shadow, standing in for the old tank-tread base */}
          <div style={{ position: "absolute", left: 22, top: 118, width: 36, height: 8, borderRadius: "50%", background: "rgba(0,0,0,.45)", filter: "blur(2px)" }} />
        </div>
      </button>
    </div>
  );
}

/* ================= Draggable desktop icon ================= */
function DesktopIcon({ id, title, icon, color, pos, iconSize, textSize, theme, onMove, onOpen, onRename, onTrash, showToast, stageRef }) {
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const [menu, setMenu] = useState(null);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    function onPointerMove(e) {
      const d = dragRef.current;
      if (!d.dragging) return;
      const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
      const stage = stageRef.current;
      const rect = stage ? stage.getBoundingClientRect() : { width: 2000, height: 2000 };
      const nx = clamp(d.startLeft + dx, 4, rect.width - 96);
      const ny = clamp(d.startTop + dy, 4, rect.height - 96);
      onMove(id, nx, ny);
    }
    function onPointerUp() { dragRef.current.dragging = false; setPressed(false); }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
  }, [id, onMove, stageRef]);

  function onPointerDown(e) {
    dragRef.current = { dragging: true, moved: false, startX: e.clientX, startY: e.clientY, startLeft: pos.x, startTop: pos.y };
    setPressed(true);
  }
  function onClickCapture(e) {
    if (dragRef.current.moved) { e.preventDefault(); e.stopPropagation(); dragRef.current.moved = false; }
  }

  const tile = ICON_TILE_PX[iconSize] || ICON_TILE_PX.md;
  const glyphSize = ICON_GLYPH_REM[iconSize] || ICON_GLYPH_REM.md;
  const labelSize = ICON_LABEL_REM[textSize] || ICON_LABEL_REM.md;
  const t = theme || THEME;

  return (
    <div className="absolute pointer-events-auto" style={{ left: pos.x, top: pos.y, width: Math.max(92, tile + 24) }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }}>
      <button type="button" onClickCapture={onClickCapture}
        className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/10 transition-transform focus-visible:outline focus-visible:outline-2"
        style={{ width: Math.max(92, tile + 24), outlineColor: color, transform: pressed ? "scale(.93)" : "scale(1)" }}
        onClick={() => onOpen(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(id); } }}>
        {/* Just the icon itself now — no bordered/background tile behind it (that
            square "window" frame was the actual ask to remove; the icon's own
            drop-shadow glow still ties it into the CRT theme). The icon box has an
            explicit width/height so it can never be squeezed by the label. The label
            deliberately does NOT get a forced width: shrink-to-fit sizing is what lets
            it wrap at natural word boundaries ("AI intelligence" -> "AI" / "intelligence")
            instead of force-breaking mid-word — a forced width narrower than a single
            long word (tried once, reverted) makes overflow-wrap break the word itself
            ("intellige" / "nce"), which is worse than the problem it was meant to fix. */}
        <span className="relative flex items-center justify-center flex-shrink-0" style={{ width: tile, height: tile, fontSize: glyphSize, overflow: "visible" }}>
          <span className="relative" style={{ color: color, animation: !pressed ? "crt-icon-glow 2.4s ease-in-out infinite" : "none" }}>
            <IconImg icon={icon} size={typeof icon === "string" ? glyphSize : Math.round(tile * (icon && icon.img ? 0.88 : 0.66))} color={color} />
          </span>
        </span>
        <span className="text-center leading-tight font-mono font-semibold break-words" style={{ fontSize: labelSize, color: t.chromeText, fontFamily: t.fontChrome || undefined, textShadow: "0 0 6px " + color + "80" }}>{title}</span>
      </button>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} theme={t} items={[
          { label: "Open", icon: "▸", onSelect: () => onOpen(id) },
          { label: "Rename...", icon: "✎", onSelect: () => {
            const next = window.prompt("Rename", title);
            if (next && next.trim()) onRename(id, next.trim());
          } },
          { divider: true },
          { label: "Open With", icon: "▤", muted: true, onSelect: () => showToast("Not available in this concept build") },
          { label: "Cut", icon: "✂", muted: true, onSelect: () => showToast("Not available in this concept build") },
          { label: "Copy", icon: "⧉", muted: true, onSelect: () => showToast("Not available in this concept build") },
          { divider: true },
          { label: "Move to Trash", icon: "🗑", onSelect: () => onTrash(id) },
        ]} />
      )}
    </div>
  );
}

/* ================= App ================= */
function App({ worldData, onReboot }) {
  const clusterApps = useMemo(() => worldData.map((c, i) => ({
    id: c.id, title: c.id + "/", icon: CLUSTER_ICONS[c.id] || "\u{1F4C1}", kind: "folder",
    rect: { x: 40 + (i % 5) * 6, y: 40 + (i % 7) * 6, w: 380, h: 300 },
  })), [worldData]);

  const fileWindows = useMemo(() => {
    const out = [];
    worldData.forEach((c, i) => {
      const base = { x: 260 + (i % 5) * 30, y: 110 + (i % 6) * 25 };
      out.push({ id: c.id + "--readme", title: "readme.md", kind: "markdown", clusterId: c.id, rect: Object.assign({}, base, { w: 400, h: 440 }) });
      out.push({ id: c.id + "--status", title: "status.sh", kind: "shell-status", clusterId: c.id, rect: Object.assign({}, base, { x: base.x + 40, y: base.y + 20, w: 380, h: 360 }) });
      out.push({ id: c.id + "--connections", title: "connections.sh", kind: "shell-connections", clusterId: c.id, rect: Object.assign({}, base, { x: base.x + 80, y: base.y + 40, w: 380, h: 360 }) });
      if (CLUSTER_APPS[c.id]) out.push({ id: c.id + "--app", title: CLUSTER_APPS[c.id], kind: "dashboard", clusterId: c.id, rect: Object.assign({}, base, { x: base.x + 120, y: base.y + 60, w: 460, h: 480 }) });
    });
    return out;
  }, [worldData]);

  const staticApps = useMemo(() => [
    /* Wider default than most windows on purpose — the arcade menu is a horizontal row
       of cabinets now (no vertical scrolling through a stacked list), so it needs the
       width to show most of them without a sideways scroll too. */
    { id: "zuper-arcade", title: "Zuper_Arcade.exe", icon: CLUSTER_ICONS["zuper-arcade"], kind: "arcade", rect: { x: 260, y: 30, w: 860, h: 560 } },
    /* Wider/taller default open size — direct request, after the old 380x340
       default made the prompt path (e.g. "guest@zuper-web-os:/desktop/ai-
       intelligence$") wrap across 2-3 lines by default, cramped and awkward
       to read, requiring a manual resize every time just to use it comfortably. */
    { id: "terminal", title: "Terminal.app", icon: CLUSTER_ICONS["terminal"], kind: "terminal", rect: { x: 220, y: 60, w: 880, h: 520 } },
    /* Opens a real app-drawer window listing every app not pinned to the 4-icon desktop
       (see AppDrawerWindow / hiddenApps below) — every one of them already exists and
       works, this is just where they live now that they're off the desktop itself. */
    { id: "more-apps", title: "More_Apps.exe", icon: CLUSTER_ICONS["more-apps"], kind: "app-drawer", rect: { x: 300, y: 60, w: 420, h: 460 } },
  ], []);

  const hiddenWindows = useMemo(() => [
    { id: "desktop-properties", title: "Properties", kind: "properties", rect: { x: 300, y: 160, w: 380, h: 320 } },
    { id: "display-settings", title: "Display settings", kind: "display-settings", rect: { x: 340, y: 140, w: 360, h: 320 } },
    { id: "recycle-bin", title: "Recycle Bin", kind: "recycle-bin", rect: { x: 320, y: 120, w: 400, h: 380 } },
  ], []);

  const allWindows = useMemo(() => clusterApps.concat(fileWindows, staticApps, hiddenWindows), [clusterApps, fileWindows, staticApps, hiddenWindows]);
  const desktopIconDefs = useMemo(() => clusterApps.filter((a) => !ARCADE_CLUSTER_IDS.has(a.id)).concat(staticApps), [clusterApps, staticApps]);

  const wm = useWindowManager(allWindows);
  const stageRef = useRef(null);
  const [startOpen, setStartOpen] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState(null);
  const [createMenu, setCreateMenu] = useState(null);
  const [launcher, setLauncher] = useState(null); // { title, placeholder }
  const theme = THEME;
  const [toast, setToast] = useState(null);
  const [hiddenIconIds, setHiddenIconIds] = useState(() => new Set());
  function showToast(text, action) { setToast({ text: text, action: action || null }); }

  const [iconSize, setIconSize] = useState(() => { try { return localStorage.getItem("zuper-os-icon-size") || "lg"; } catch (e) { return "lg"; } });
  const [textSize, setTextSize] = useState(() => { try { return localStorage.getItem("zuper-os-text-size") || "md"; } catch (e) { return "md"; } });
  useEffect(() => { try { localStorage.setItem("zuper-os-icon-size", iconSize); } catch (e) {} }, [iconSize]);
  useEffect(() => { try { localStorage.setItem("zuper-os-text-size", textSize); } catch (e) {} }, [textSize]);

  function defaultIconPos(index) {
    const cell = ICON_CELL_PX[iconSize] || ICON_CELL_PX.md;
    return { x: 16 + Math.floor(index / 8) * cell, y: 16 + (index % 8) * cell };
  }
  const [iconPos, setIconPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zuper-os-icon-pos") || "{}"); } catch (e) { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("zuper-os-icon-pos", JSON.stringify(iconPos)); } catch (e) {} }, [iconPos]);
  function moveIcon(id, x, y) { setIconPos((prev) => Object.assign({}, prev, { [id]: { x: x, y: y } })); }
  function resetIcons() { setIconPos({}); setHiddenIconIds(new Set()); }

  const [iconNames, setIconNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zuper-os-icon-names") || "{}"); } catch (e) { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("zuper-os-icon-names", JSON.stringify(iconNames)); } catch (e) {} }, [iconNames]);
  function renameIcon(id, name) { setIconNames((prev) => Object.assign({}, prev, { [id]: name })); showToast("Renamed to “" + name + "”"); }
  function trashIcon(id) {
    setHiddenIconIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    showToast("Moved to Trash — see it in Start menu → Recycle Bin", { label: "Undo", onClick: () => restoreIcon(id) });
  }
  function restoreIcon(id) {
    setHiddenIconIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    showToast("Restored to desktop");
  }
  function restoreAllIcons() { setHiddenIconIds(new Set()); showToast("Restored everything from Trash"); }
  const trashedItems = useMemo(() => desktopIconDefs.filter((a) => hiddenIconIds.has(a.id)), [desktopIconDefs, hiddenIconIds]);

  const desktopIcons = useMemo(() => desktopIconDefs.filter((a) => !hiddenIconIds.has(a.id)), [desktopIconDefs, hiddenIconIds]);
  /* The actual desktop icon grid only ever shows these four (see DESKTOP_VISIBLE_IDS) —
     desktopIcons above stays the full reachable set for Start Menu / QuickLauncher. */
  const visibleDesktopIcons = useMemo(() => desktopIcons.filter((a) => DESKTOP_VISIBLE_IDS.has(a.id)), [desktopIcons]);
  /* Everything reachable but NOT pinned to the desktop (every other real cluster,
     Terminal.app) — this is what More_Apps.exe's drawer lists. */
  const hiddenApps = useMemo(() => desktopIcons.filter((a) => !DESKTOP_VISIBLE_IDS.has(a.id) && a.id !== "more-apps"), [desktopIcons]);

  /* The terminal opens centered on the stage every time, no matter which app/icon
     triggered it (a cluster folder, the Terminal.app icon itself, or reopening from
     the taskbar) — otherwise it just sits wherever it was left (its registered rect,
     or a previous drag position), which can land off-center or even off-screen
     depending on viewport size. */
  function openTerminalCentered() {
    const w = wm.state.terminal;
    const rect = stageRef.current ? stageRef.current.getBoundingClientRect() : { width: 1400, height: 800 };
    wm.move("terminal", Math.max(8, Math.round((rect.width - w.w) / 2)), Math.max(8, Math.round((rect.height - w.h) / 2)));
    wm.open("terminal");
    wm.focus("terminal");
  }

  function toggleFromTaskbar(id) {
    const w = wm.state[id];
    if (!w.open || w.minimized) { if (id === "terminal") openTerminalCentered(); else wm.open(id); }
    else if (wm.focusedId === id) wm.minimize(id);
    else wm.focus(id);
  }

  /* Clicking a cluster icon now opens Terminal.app cd'd into that cluster, instead of
     directly opening its folder window — the folder window (unchanged, still a
     pre-registered "folder"-kind window) is reached by running `ls` inside the terminal
     instead. Non-cluster icons (Terminal.app itself, Zuper_Arcade.exe) open normally. */
  const jumpCounterRef = useRef(0);
  const [terminalJump, setTerminalJump] = useState(null);
  function handleIconOpen(id) {
    const def = winDefById[id];
    if (def && def.kind === "folder") {
      jumpCounterRef.current += 1;
      setTerminalJump({ cwd: def.id, nonce: jumpCounterRef.current });
      openTerminalCentered();
    } else if (id === "terminal") {
      openTerminalCentered();
    } else {
      wm.open(id);
    }
  }
  function openFromIconOrMenu(id) { handleIconOpen(id); setStartOpen(false); }
  function openFile(clusterId, key) { wm.open(clusterId + "--" + key); }

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setStartOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const runningWindows = allWindows.filter((a) => wm.state[a.id] && wm.state[a.id].open);
  const focusedWinState = wm.focusedId && wm.state[wm.focusedId] && wm.state[wm.focusedId].open ? wm.state[wm.focusedId] : null;
  const winDefById = useMemo(() => { const m = {}; allWindows.forEach((w) => { m[w.id] = w; }); return m; }, [allWindows]);

  function closeAllWindows() {
    allWindows.forEach((w) => { if (wm.state[w.id] && wm.state[w.id].open) wm.close(w.id); });
    showToast("Session cleared — all windows closed");
  }
  function handleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => showToast("Fullscreen not available"));
    else showToast("Fullscreen not available");
  }

  return (
    <React.Fragment>
      <div ref={stageRef} className="fixed inset-0 bottom-[52px] overflow-y-auto overflow-x-hidden select-none" style={{ touchAction: "pan-y", background: theme.osBg }}
        onContextMenu={(e) => { e.preventDefault(); setDesktopMenu({ x: e.clientX, y: e.clientY }); }}
        onDoubleClick={(e) => { if (e.target === e.currentTarget) setCreateMenu({ x: e.clientX, y: e.clientY }); }}>
        <ScanlineBackground color={theme.accent} />
        <GlitchWatermark />
        {/* ScreenGlitch (the continuously sweeping scanline band) removed per direct
           feedback: "the lines going on behind the screen is a constant distraction."
           Static ScanlineBackground/GlitchWatermark stay — those are what gives the
           desktop its CRT identity without anything actively moving/distracting. */}

        {visibleDesktopIcons.map((a, i) => (
          <DesktopIcon key={a.id} id={a.id} title={iconNames[a.id] || a.title} icon={a.icon} color={theme.accent}
            iconSize={iconSize} textSize={textSize} theme={theme}
            pos={iconPos[a.id] || defaultIconPos(i)} onMove={moveIcon} onOpen={handleIconOpen}
            onRename={renameIcon} onTrash={trashIcon} showToast={showToast} stageRef={stageRef} />
        ))}

        {allWindows.map((w) => {
          const s = wm.state[w.id];
          if (!s.open) return null;
          return (
            <Window key={w.id} id={w.id} title={iconNames[w.id] || w.title} x={s.x} y={s.y} w={s.w} h={s.h} z={s.z} color={theme.accent} theme={theme}
              isFocused={wm.focusedId === w.id} isMaximized={s.maximized} minimized={s.minimized}
              onFocus={wm.focus} onMove={wm.move} onResize={wm.resize} onClose={wm.close} onMinimize={wm.minimize} onToggleMaximize={wm.toggleMaximize} stageRef={stageRef}>
              {w.kind === "folder" && <FolderWindow clusterId={w.id} worldData={worldData} onOpenFile={openFile} />}
              {w.kind === "markdown" && <MarkdownWindow clusterId={w.clusterId} worldData={worldData} />}
              {w.kind === "shell-status" && <ShellStatusWindow clusterId={w.clusterId} worldData={worldData} />}
              {w.kind === "shell-connections" && <ShellConnectionsWindow clusterId={w.clusterId} worldData={worldData} />}
              {w.kind === "dashboard" && <DashboardWindow clusterId={w.clusterId} worldData={worldData} />}
              {w.kind === "arcade" && <ArcadeWindow worldData={worldData} />}
              {w.kind === "terminal" && <TerminalWindow worldData={worldData} jumpTo={terminalJump} onOpenFolder={wm.open} />}
              {w.kind === "properties" && <PropertiesWindow worldData={worldData} />}
              {w.kind === "display-settings" && <DisplaySettingsWindow iconSize={iconSize} setIconSize={setIconSize} textSize={textSize} setTextSize={setTextSize} />}
              {w.kind === "recycle-bin" && <RecycleBinWindow trashedItems={trashedItems} onRestore={restoreIcon} onRestoreAll={restoreAllIcons} />}
              {w.kind === "app-drawer" && <AppDrawerWindow apps={hiddenApps} onOpen={handleIconOpen} />}
            </Window>
          );
        })}

        {desktopMenu && (
          <ContextMenu x={desktopMenu.x} y={desktopMenu.y} onClose={() => setDesktopMenu(null)} theme={theme} items={[
            { label: "Arrange icons", icon: "▦", onSelect: resetIcons },
            { label: "Refresh", icon: "↻", onSelect: () => window.location.reload() },
            { divider: true },
            { label: "Display settings...", icon: "🖵", onSelect: () => wm.open("display-settings") },
          ]} />
        )}

        {createMenu && (
          <ContextMenu x={createMenu.x} y={createMenu.y} onClose={() => setCreateMenu(null)} theme={theme} items={[
            { label: "Create Folder...", icon: "📁", muted: true, onSelect: () => showToast("Not available in this concept build") },
            { label: "Create File...", icon: "📄", muted: true, onSelect: () => showToast("Not available in this concept build") },
            { label: "Create Shortcut...", icon: "+", muted: true, onSelect: () => showToast("Not available in this concept build") },
            { divider: true },
            { label: "Paste", icon: "📋", disabled: true, onSelect: () => {} },
            { label: "Select all", icon: "▦", onSelect: () => showToast(visibleDesktopIcons.length + " icon(s) on this desktop") },
            { divider: true },
            { label: "Properties", icon: "ℹ️", onSelect: () => wm.open("desktop-properties") },
          ]} />
        )}

        <AssistantWidget theme={theme} stageRef={stageRef} worldData={worldData} hasFocusedWindow={!!focusedWinState} />

        {toast && <Toast text={toast.text} action={toast.action} onDone={() => setToast(null)} />}
        {launcher && (
          <QuickLauncher title={launcher.title} placeholder={launcher.placeholder} apps={desktopIcons}
            onOpen={wm.open} onClose={() => setLauncher(null)} />
        )}
      </div>

      <StartMenu open={startOpen} onClose={() => setStartOpen(false)} onOpen={openFromIconOrMenu}
        topApps={desktopIcons.map((a) => (iconNames[a.id] ? Object.assign({}, a, { title: iconNames[a.id] }) : a))} theme={theme}
        onFullscreen={handleFullscreen}
        onFind={() => setLauncher({ title: "Find", placeholder: "Search apps…" })}
        onRun={() => setLauncher({ title: "Run", placeholder: "Type the name of an app to open…" })}
        onReboot={onReboot}
        onSession={closeAllWindows}
        onRecycleBin={() => wm.open("recycle-bin")} trashedCount={trashedItems.length} />

      <Taskbar onStartClick={() => setStartOpen((o) => !o)} theme={theme}
        running={runningWindows.map((a) => ({ id: a.id, title: iconNames[a.id] || winDefById[a.id].title, focused: wm.focusedId === a.id }))}
        onRunningClick={toggleFromTaskbar} />
    </React.Fragment>
  );
}

/* A product-design review found the desktop-OS metaphor (draggable/resizable windows,
   hover states, terminal typing, a DevTools-based puzzle) simply doesn't work on a
   phone — and a careers link gets opened on phones constantly. MOBILE_BREAKPOINT covers
   real phones in portrait (390-430px iPhones, 360-412px Android) with margin, while
   staying narrower than tablets/small laptops, which can still reasonably attempt the
   real thing via "Continue to desktop version anyway" below. */
const MOBILE_BREAKPOINT = 700;
function useIsNarrowViewport() {
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false));
  useEffect(() => {
    function onResize() { setNarrow(window.innerWidth < MOBILE_BREAKPOINT); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return narrow;
}

/* Deliberately NOT just "come back on desktop" — a candidate who opened this on their
   phone specifically to check out careers deserves something real, not a wall. Reuses
   the same real worldData the desktop OS itself renders from (no separate/fake content
   to keep in sync), plus the same real closing line the actual DevTools challenge ends
   on (careers@zuper.co), since the challenge itself can't run here. */
function MobileFallback({ worldData, onContinue }) {
  return (
    <div className="min-h-screen w-full font-terminal" style={{ background: THEME.osBg, color: CRT_GREEN }}>
      <div className="max-w-lg mx-auto px-5 py-8">
        <img src="./assets/zuper-wordmark.png" alt="Zuper Labs" className="mb-5" style={{ width: "min(70vw, 280px)" }} />
        <p className="text-[15px] leading-relaxed mb-1" style={{ color: "#ffd98a" }}>ZUPER OS [concept build]</p>
        <p className="text-[14px] leading-relaxed mb-7" style={{ color: "#c98a2e" }}>
          This is an interactive concept desktop OS — draggable windows, a real terminal,
          a hidden DevTools puzzle — built for a mouse and a bigger screen. Here's the
          short version instead.
        </p>

        {/* Real, pulled live from Zuper's actual careers portal (zupersoft.keka.com/
            careers) — not invented, and deliberately not padded out with fabricated
            engineering roles just to look fuller. Same content as the terminal's
            `cat open-roles.md` (see careers cwd in run()), so the story matches
            whichever entry point a candidate happens to use. */}
        <div className="mb-7 p-4" style={{ background: "rgba(20,10,0,.4)", boxShadow: bevel("out-shallow", CRT_GREEN) }}>
          <h2 className="m-0 mb-1.5 text-[15px] font-bold" style={{ color: "#ffd98a" }}>Open roles — pulled live, not invented</h2>
          <div className="mb-2">
            <div className="text-[14px] font-bold" style={{ color: CRT_GREEN }}>Senior Executive — Technical Implementation</div>
            <div className="text-[12px] mb-1" style={{ color: "#c98a2e" }}>Customer Experience · Chennai · Full-Time</div>
            <p className="m-0 text-[13px] leading-relaxed" style={{ color: "#c98a2e" }}>
              The closest thing to an engineering-facing role open right now — technical
              solutioning and implementation work for real customers.
            </p>
          </div>
          <p className="m-0 mb-2 text-[13px] leading-relaxed" style={{ color: "#c98a2e" }}>
            No pure software engineering roles (backend/frontend/DevOps/QA) are open at
            the moment. New ones show up on the real portal first:
          </p>
          <a href="https://zupersoft.keka.com/careers/" target="_blank" rel="noopener" className="underline text-[13px]" style={{ color: CRT_GREEN }}>
            View all open roles →
          </a>
          <p className="m-0 mt-3 text-[13px] leading-relaxed" style={{ color: "#c98a2e" }}>
            Or email <a href="mailto:careers@zuper.co" className="underline" style={{ color: CRT_GREEN }}>careers@zuper.co</a> directly
            — same address the full challenge (on desktop) sends candidates to at the end.
          </p>
        </div>

        <h3 className="text-[12px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#c98a2e", opacity: .8 }}>
          What Zuper actually builds — {worldData ? worldData.length : "…"} real product clusters
        </h3>
        {!worldData && <p className="text-[13px]" style={{ color: "#c98a2e" }}>Loading…</p>}
        <div className="flex flex-col gap-2 mb-8">
          {worldData && worldData.map((c) => (
            <div key={c.id} className="p-3" style={{ background: "rgba(20,10,0,.3)", boxShadow: bevel("out-shallow", CRT_GREEN) }}>
              <div className="text-[13px] font-bold mb-0.5" style={{ color: "#ffd98a" }}>{c.name || c.id}</div>
              {c.entities && c.entities.length > 0 && (
                <div className="text-[12px] leading-relaxed" style={{ color: "#c98a2e" }}>{c.entities.map((e) => e.name).join(" · ")}</div>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={onContinue} className="text-[13px] underline" style={{ color: "#c98a2e" }}>
          Continue to the desktop version anyway →
        </button>
      </div>
    </div>
  );
}

/* ================= Root: load real data, then boot ================= */
function Root() {
  const [worldData, setWorldData] = useState(null);
  const [bootDone, setBootDone] = useState(false);
  const [bootKey, setBootKey] = useState(0);
  const isNarrow = useIsNarrowViewport();
  const [forceDesktop, setForceDesktop] = useState(false);

  useEffect(() => {
    fetch("./zuper-world-data.json").then((r) => r.json()).then(setWorldData).catch(() => setWorldData([]));
  }, []);

  function reboot() { setBootDone(false); setBootKey((k) => k + 1); }

  if (isNarrow && !forceDesktop) return <MobileFallback worldData={worldData} onContinue={() => setForceDesktop(true)} />;

  const ready = bootDone && worldData;
  return (
    <React.Fragment>
      {!ready && <BootScreen key={bootKey} onDone={() => setBootDone(true)} />}
      {ready && <App worldData={worldData} onReboot={reboot} />}
    </React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Root />);
