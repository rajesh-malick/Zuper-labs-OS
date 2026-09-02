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
const REAL = "#7ee6a3";
/* The OS shell's own mono-CRT accent — was green (#3fe676), now a classic amber-
   phosphor terminal color, per direct request. Kept as its own constant (distinct
   hex from ACCENT) rather than reusing ACCENT directly: ACCENT ties to Zuper's real
   brand orange, CRT_GREEN ties to the OS's internal chrome theme — two different
   concepts that happen to both be orange-family now, same as before when one was
   orange and the other was green. The variable name stays CRT_GREEN to avoid a
   much larger rename across every component that imports it. */
const CRT_GREEN = "#ffb000";

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

/* ---------- Assistant mascot sound effects — synthesized entirely from scratch with
   the Web Audio API, not a single sampled/recorded audio clip, so there's nothing to
   license. A flat pitch-glide (the first version of this) read as a plain notification
   "ping," not a character — fixed by giving every note a fast vibrato wobble (a low-
   frequency oscillator modulating the note's own pitch) and playing short multi-note
   runs instead of one glide, which is what actually reads as a cute chirpy little robot
   (think R2-D2-style trills) rather than a UI chime. A lazily-created singleton
   AudioContext (browsers require a user gesture before audio can play — the mascot's
   own click-to-open is always the first one). */
let sharedAudioCtx = null;
function getSharedAudioCtx() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
}
function synthNote(ctx, freq, startTime, duration, gainPeak, type) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "triangle";
  osc.frequency.setValueAtTime(freq, startTime);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(30, startTime);
  lfoGain.gain.setValueAtTime(freq * 0.07, startTime);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  lfo.start(startTime);
  osc.start(startTime);
  lfo.stop(startTime + duration + 0.02);
  osc.stop(startTime + duration + 0.02);
}
/* A flat tone (no vibrato) for arcade feedback — punchier/more "8-bit" than the
   assistant's cute wobble, appropriate for quick win/lose game cues. */
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
function playAssistantGreetSound() {
  const ctx = getSharedAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  synthNote(ctx, 587, t0, 0.1, 0.055, "triangle");
  synthNote(ctx, 740, t0 + 0.09, 0.1, 0.055, "triangle");
  synthNote(ctx, 880, t0 + 0.18, 0.15, 0.055, "triangle");
}
function playAssistantByeSound() {
  const ctx = getSharedAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  synthNote(ctx, 784, t0, 0.1, 0.05, "triangle");
  synthNote(ctx, 587, t0 + 0.1, 0.1, 0.05, "triangle");
  synthNote(ctx, 392, t0 + 0.2, 0.22, 0.045, "triangle");
}
function playAssistantGlitchSound() {
  const ctx = getSharedAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const notes = [660, 740, 880, 990, 740];
  notes.forEach((f, i) => synthNote(ctx, f, t0 + i * 0.05, 0.05, 0.035, "triangle"));
}
/* Arcade game feedback sounds — same synthesis discipline (Web Audio only, nothing
   sampled), but square/sawtooth flat tones for a punchier 8-bit arcade feel, distinct
   from the assistant's cute vibrato chirps. */
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
  "zuper-arcade": [ // joystick
    ["rect", { x: 5, y: 13, width: 14, height: 7, rx: 2.5 }],
    ["circle", { cx: 9.5, cy: 16.5, r: 1, fill: "currentColor" }],
    ["circle", { cx: 14.5, cy: 16.5, r: 1, fill: "currentColor" }],
    ["path", { d: "M9 13V9.5a3 3 0 0 1 6 0V13" }],
  ],
  terminal: [ // prompt
    ["rect", { x: 3, y: 4.5, width: 18, height: 15, rx: 1.8 }],
    ["polyline", { points: "7.5 10 10.5 12.5 7.5 15" }],
    ["line", { x1: 12.3, y1: 15, x2: 16, y2: 15 }],
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
const ICON_TILE_PX = { sm: 38, md: 52, lg: 70 };
const ICON_GLYPH_REM = { sm: "1.05rem", md: "1.35rem", lg: "1.75rem" };
const ICON_LABEL_REM = { sm: "11px", md: "13px", lg: "15px" };
const ICON_CELL_PX = { sm: 78, md: 100, lg: 128 };
const SIZE_OPTIONS = [{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }];

/* ---------- Mono CRT theme — the OS shell's only look. Reskins desktop bg, window
   chrome, taskbar, start menu, context menus, and icon tiles. Window CONTENT (readme/
   dashboard/game text) stays on a dark panel — full re-theming of every content pane
   was out of scope. Original amber/black CRT palette (was green/black — retinted per
   direct request), not copied from any specific trademarked terminal product. ---------- */
const THEME = {
  label: "Mono CRT", osBg: "#040200", winBg: "rgba(8,4,0,.94)",
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
   AND the "ZUPER LABS" text, overlaid on the same center point (logo behind,
   faint; text on top, same plain full-color treatment it always had) —
   direct request, after a stacked-column first pass wasn't what was wanted.
   Static, no glitch/breathe animation — the screen-glitch motion lives in
   ScreenGlitch instead, not here. ================= */
function GlitchWatermark({ color }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
      <img src="./assets/zuper-logo.png" alt="" style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: "min(30vw, 380px)", height: "min(30vw, 380px)", objectFit: "contain", opacity: 0.08,
      }} />
      <span style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        fontFamily: "'VT323','Inconsolata',monospace", fontWeight: 700,
        fontSize: "min(15vw, 200px)", letterSpacing: "0.04em", whiteSpace: "nowrap", lineHeight: 1,
        color: color,
      }}>ZUPER LABS</span>
    </div>
  );
}

/* ================= Screen glitch: a CONTINUOUS moving scanline sweep + subtle
   flicker across the whole desktop — separate from GlitchWatermark (the "ZUPER LABS"
   text stays plain and static per direct request; this is the screen glitching, not
   the text). First pass here was a brief/occasional band-jitter, which wasn't what
   was actually wanted — this is the always-on sweep instead, the same motion the old
   CRTOverlay had. Deliberately does NOT bring back CRTOverlay's dark-corners vignette
   (radial-gradient + inset box-shadow) — that was the part actually disliked, plus
   the reason it used to visually darken open windows before its z-index got fixed.
   Sits at z-index 2 — just above the plain background layers
   (ScanlineBackground/GlitchWatermark, z:0) and nowhere near open app windows (z:10+)
   or the assistant (z:500); the old CRTOverlay sat at z:1990, "on top of everything,"
   which is what caused that bug. Stays strictly mono-accent-color — no RGB
   channel-split, that would break the "mono CRT only" rule the rest of the OS
   follows. ================= */
function ScreenGlitch({ color }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0" style={{
        top: 0, height: "140px", left: 0, right: 0,
        background: "linear-gradient(180deg, transparent, " + color + "1c 45%, " + color + "0d 55%, transparent)",
        animation: "crt-sweep 7s linear infinite",
        mixBlendMode: "screen",
      }} />
      <div className="absolute inset-0" style={{ background: color, opacity: 0.02, animation: "crt-flicker 6.5s ease-in-out infinite", mixBlendMode: "overlay" }} />
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

function Toast({ text, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-[64px] left-1/2 z-[1950] px-4 py-2 rounded-lg font-mono font-semibold text-[12px] text-white/92"
      style={{ transform: "translateX(-50%)", background: "rgba(20,21,28,.95)", border: "1px solid rgba(255,255,255,.15)", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
      {text}
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

function RealBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: REAL, borderColor: "rgba(126,230,163,.45)", background: "rgba(126,230,163,.12)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: REAL }}></span>{children}
    </span>
  );
}
function ConceptBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: CONCEPT, borderColor: "rgba(126,203,255,.45)", background: "rgba(126,203,255,.12)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: CONCEPT }}></span>{children}
    </span>
  );
}

/* ================= Boot screen ================= */
function BootScreen({ onDone, extraLine }) {
  const linesRef = useRef(buildLines());
  const lines = linesRef.current;
  const [visibleCount, setVisibleCount] = useState(0);
  const [fading, setFading] = useState(false);

  function buildLines() {
    var ua = navigator.userAgent;
    var m = ua.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/);
    var cores = navigator.hardwareConcurrency || "?";
    var lang = navigator.language || "en";
    var w = window.screen.width, h = window.screen.height;
    var conn = navigator.connection && navigator.connection.effectiveType;
    return [
      "ZUPER OS [concept build]",
      "────────────────────────────",
      "> checking runtime...",
      "  " + (m ? m[0] : "browser") + " · " + cores + " threads · " + lang,
      "  display " + w + "x" + h + (conn ? " · " + conn : ""),
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
      <RealBadge>Real cluster — sourced from labs.zuper.co</RealBadge>
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
      <RealBadge>Real content — names &amp; descriptions from labs.zuper.co</RealBadge>
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
      <ConceptBadge>Simulated output — node names are real, ports/latency are decorative</ConceptBadge>
      <div ref={logRef} className="flex-1 overflow-y-auto mt-3 space-y-0.5">
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
      <RealBadge>Real connection data — sourced from labs.zuper.co</RealBadge>
      <div className="flex-1 overflow-y-auto mt-3 space-y-1">
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
      <div className="flex items-center justify-between mb-1">
        <RealBadge>Real data, concept dashboard UI</RealBadge>
      </div>
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
      <RealBadge>Cluster/entity counts above are real</RealBadge>
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

/* ================= Games (unchanged mechanics, real cluster tags) ================= */
function RouteRacerGame({ onComplete }) {
  const GRID = 8, MOVE_LIMIT = 34, CELL = 42;
  const canvasRef = useRef(null);
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
      const jobs = prev.jobs.map((j) => (j.x === nx && j.y === ny ? Object.assign({}, j, { visited: true }) : j));
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
    state.jobs.forEach((j) => { ctx.fillStyle = j.visited ? "rgba(255,176,0,0.3)" : CRT_GREEN; ctx.beginPath(); ctx.arc(j.x * CELL + CELL / 2, j.y * CELL + CELL / 2, 10, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#fff3e0"; ctx.beginPath(); ctx.arc(state.pos.x * CELL + CELL / 2, state.pos.y * CELL + CELL / 2, 8, 0, Math.PI * 2); ctx.fill();
  }, [state]);
  useEffect(() => {
    function onKey(e) { const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }; if (map[e.key]) { e.preventDefault(); move(map[e.key]); } }
    const el = canvasRef.current; if (el) el.addEventListener("keydown", onKey);
    return () => { if (el) el.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line
  }, []);
  const remaining = state.jobs.filter((j) => !j.visited).length;
  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="w-full flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Moves: {state.moves} / {MOVE_LIMIT}</span><span>Jobs remaining: {remaining}</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => setState(makeState())}>Restart</button>
      </div>
      <canvas ref={canvasRef} tabIndex={0} width={GRID * CELL} height={GRID * CELL} className="outline-none" style={{ boxShadow: bevel("in-deep", CRT_GREEN) }} aria-label="Route Racer grid. Use arrow keys to move."></canvas>
      <div className="flex flex-col items-center gap-1">
        <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => move("up")} aria-label="Move up">&#8593;</button>
        <div className="flex gap-1">
          <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => move("left")} aria-label="Move left">&#8592;</button>
          <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => move("down")} aria-label="Move down">&#8595;</button>
          <button type="button" className="w-8 h-8" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => move("right")} aria-label="Move right">&#8594;</button>
        </div>
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{state.message}</p>
    </div>
  );
}

function DispatchTetrisGame({ onComplete }) {
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
  useEffect(() => { if (done) return; const timer = setInterval(() => setTimeLeft((t) => (t <= 1 ? 0 : t - 1)), 1000); return () => clearInterval(timer); }, [done]);
  useEffect(() => { if (!done && timeLeft === 0) { setDone(true); setMessage("Time's up. " + score + " job(s) scheduled, " + misses + " skipped."); } /* eslint-disable-next-line */ }, [timeLeft]);
  function place(t, s) {
    if (done || queue.length === 0) return;
    const dur = queue[0];
    if (!canPlace(schedule, t, s, dur)) { setInvalidCell(t + "," + s); setTimeout(() => setInvalidCell(null), 220); return; }
    const next = schedule.map((row) => row.slice());
    for (let i = s; i < s + dur; i++) next[t][i] = true;
    setSchedule(next);
    const newScore = score + 1; setScore(newScore);
    let nq = queue.slice(1); let nMisses = misses;
    if (nq.length > 0 && !anyValidSlot(next, nq[0])) { nMisses += 1; nq = nq.slice(1); }
    setMisses(nMisses); setQueue(nq);
    if (nq.length === 0) { setDone(true); const summary = newScore + " job(s) scheduled, " + nMisses + " skipped."; setMessage("Queue cleared. " + summary); setTimeout(() => onComplete("Dispatch Tetris complete", summary), 0); }
  }
  function restart() { setSchedule(TECHS.map(() => new Array(SLOTS).fill(false))); setQueue(makeQueue()); setScore(0); setMisses(0); setTimeLeft(TIME_LIMIT); setDone(false); setMessage("Click a slot to place the current job into that many consecutive open hours."); }
  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold" style={{ color: "#ffd98a" }}>
        <span>Placed: {score}</span><span>Skipped: {misses}</span><span>Time: {timeLeft}s</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={restart}>Restart</button>
      </div>
      <div>
        <div className="text-[11px] font-medium mb-1.5 font-mono" style={{ color: "#c98a2e" }}>Next job:</div>
        {queue.length > 0 && <div className="w-11 h-[34px] flex items-center justify-center font-mono font-semibold text-[13px]" style={{ background: CRT_GREEN, color: "#040200", boxShadow: bevel("out-shallow", CRT_GREEN) }}>{queue[0]}h</div>}
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
                    className="w-8 h-8"
                    style={{
                      background: isInvalid ? CRT_GREEN : schedule[t][s] ? "rgba(255,176,0,.25)" : "rgba(20,10,0,.4)",
                      boxShadow: bevel(isInvalid || schedule[t][s] ? "in-shallow" : "out-shallow", CRT_GREEN),
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

function WorkflowWiringGame({ onComplete }) {
  const pairsRef = useRef(WIRING_PAIRS);
  const actionsRef = useRef(shuffle(WIRING_PAIRS.map((p) => p.action)));
  const [selected, setSelected] = useState(null);
  const [wired, setWired] = useState({});
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("Click a trigger, then click its matching action.");
  const [flashWrong, setFlashWrong] = useState(null);
  function pickTrigger(t) { if (wired[t]) return; setSelected(t); setMessage("Now pick the action it should fire."); }
  function pickAction(a) {
    if (!selected) return;
    const correct = pairsRef.current.find((p) => p.trigger === selected).action;
    if (a === correct) {
      const nextWired = Object.assign({}, wired, { [selected]: a });
      setWired(nextWired); setSelected(null);
      setMessage("Wired: “" + selected + "” → “" + a + "”.");
      if (Object.keys(nextWired).length === pairsRef.current.length) {
        const summary = pairsRef.current.length + " trigger(s) wired, " + mistakes + " mistake(s).";
        setMessage("All triggers wired. " + summary);
        setTimeout(() => onComplete("Workflow Wiring complete", summary), 0);
      }
    } else {
      setMistakes((m) => m + 1); setFlashWrong(a); setTimeout(() => setFlashWrong(null), 220);
      setMessage("Not a match — try again.");
    }
  }
  const allWired = Object.keys(wired).length === pairsRef.current.length;
  return (
    <div className="p-4 flex flex-col gap-3">
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
                background: "rgba(20,10,0,.4)", color: "#ffd98a",
                boxShadow: bevel(wired[p.trigger] || selected === p.trigger ? "in-shallow" : "out-shallow", CRT_GREEN),
              }}>{p.trigger}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide font-mono" style={{ color: "#c98a2e" }}>Actions</div>
          {actionsRef.current.map((a) => {
            const isWiredAction = Object.values(wired).includes(a);
            const isWrong = flashWrong === a;
            return (
              <button key={a} type="button" disabled={isWiredAction} onClick={() => pickAction(a)}
                className="text-left text-[12px] font-semibold px-2.5 py-2 disabled:opacity-40"
                style={{
                  background: isWrong ? CRT_GREEN : "rgba(20,10,0,.4)", color: isWrong ? "#040200" : "#ffd98a",
                  boxShadow: bevel(isWiredAction || isWrong ? "in-shallow" : "out-shallow", CRT_GREEN),
                }}>{a}</button>
            );
          })}
        </div>
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {allWired && <p className="text-center text-[12px] font-semibold font-mono" style={{ color: CONCEPT }}>Done — see the achievement note below.</p>}
    </div>
  );
}

function SystemStabilizerGame({ onComplete }) {
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
        <button type="button" className="px-2 py-1" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={restart}>Restart</button>
      </div>
      <div className="flex flex-col gap-3">
        {METERS.map((m) => {
          const v = values[m]; const safe = v > 25 && v < 75;
          const meterColor = safe ? CRT_GREEN : "#fff3e0";
          return (
            <div key={m} className="flex items-center gap-3">
              <div className="w-20 text-[11px] font-medium font-mono" style={{ color: "#c98a2e" }}>{m}</div>
              <div className="flex-1 h-3 overflow-hidden" style={{ boxShadow: bevel("in-shallow", CRT_GREEN), background: "rgba(20,10,0,.5)" }}>
                <div className="h-full transition-[width]" style={{ width: v + "%", background: meterColor, opacity: safe ? 0.8 : 1, animation: safe ? "none" : "crt-icon-glow 1s ease-in-out infinite" }}></div>
              </div>
              <button type="button" className="w-7 h-7" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => nudge(m, -1)}>&#8722;</button>
              <button type="button" className="w-7 h-7" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => nudge(m, 1)}>+</button>
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
function PipeCell({ cell, size, solved }) {
  if (cell.type === "empty") return <div style={{ width: size, height: size }} />;
  const mid = size / 2, thick = size * 0.24;
  const color = solved ? "#ffe3b3" : (cell.type === "source" || cell.type === "dest") ? CONCEPT : CRT_GREEN;
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
function PipeFlowGame({ onComplete }) {
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
      pushPop("+" + gained, CRT_GREEN);
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
  const cellSize = cols >= 5 ? 44 : 52;
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
            style={{ width: cellSize, height: cellSize, background: cell.type === "empty" ? "transparent" : "rgba(20,10,0,.4)", boxShadow: cell.type === "empty" ? "none" : bevel("out-shallow", CRT_GREEN), cursor: cell.fixed || cell.type !== "pipe" ? "default" : "pointer" }}>
            <PipeCell cell={cell} size={cellSize - 8} solved={solved} />
          </button>
        )))}
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {done && <button type="button" className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: CRT_GREEN, color: "#040200", boxShadow: bevel("out-shallow", CRT_GREEN) }} onClick={restart}>Restart</button>}
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
function SpinningPlatesGame({ onComplete }) {
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
      if (wasCritical) { setSaves((s) => s + 1); pushPop("+15 SAVED!", CRT_GREEN); playArcadeSuccessSound(); }
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
              style={{ background: "rgba(20,10,0,.4)", boxShadow: bevel("out-shallow", CRT_GREEN) }}>
              <span className="w-24 text-[11px] font-medium font-mono truncate" style={{ color: "#c98a2e" }}>{p.name}</span>
              <span className="flex-1 h-3 overflow-hidden" style={{ boxShadow: bevel("in-shallow", CRT_GREEN), background: "rgba(20,10,0,.5)" }}>
                <span className="block h-full transition-[width]" style={{ width: p.value + "%", background: critical ? "#fff3e0" : CRT_GREEN, animation: critical ? "arcade-pulse-critical .5s ease-in-out infinite" : "none" }}></span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {done && <button type="button" className="self-center px-3 py-1.5 text-[13px] font-semibold" style={{ background: CRT_GREEN, color: "#040200", boxShadow: bevel("out-shallow", CRT_GREEN) }} onClick={restart}>Restart</button>}
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
function FraudOrFineGame({ onComplete }) {
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
      pushPop("+" + gained + (nextCombo > 1 ? "  x" + Math.min(nextCombo, 5) : ""), CRT_GREEN);
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
        <div className="p-3.5 flex flex-col gap-1.5" style={{ background: flash === "good" ? "rgba(255,176,0,.18)" : flash === "bad" ? "rgba(255,243,224,.32)" : "rgba(20,10,0,.4)", boxShadow: bevel("out-shallow", CRT_GREEN), transition: "background .2s" }}>
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-bold font-mono" style={{ color: "#ffd98a" }}>{txn.amount}</span>
            <span className="text-[11px] font-semibold font-mono" style={{ color: "#c98a2e" }}>{timeLeft}s</span>
          </div>
          <div className="text-[11px] font-medium font-mono" style={{ color: "#c98a2e" }}>{txn.location} · {txn.velocity}</div>
          <div className="text-[14px] font-medium" style={{ color: "#c98a2e" }}>{txn.note}</div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={done || locked} className="flex-1 px-3 py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: CRT_GREEN, color: "#040200", boxShadow: bevel("out-shallow", CRT_GREEN) }} onClick={() => decide("approve")}>Approve</button>
        <button type="button" disabled={done || locked} className="flex-1 px-3 py-2 text-[13px] font-semibold disabled:opacity-40" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => decide("flag")}>Flag</button>
      </div>
      <p className="text-[14px] font-medium text-center" style={{ color: "#c98a2e" }}>{message}</p>
      {done && <button type="button" className="self-center px-3 py-1.5 text-[13px] font-semibold" style={{ background: CRT_GREEN, color: "#040200", boxShadow: bevel("out-shallow", CRT_GREEN) }} onClick={restart}>Restart</button>}
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

function ArcadeWindow() {
  const [view, setView] = useState("menu");
  const [achievement, setAchievement] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  function onGameComplete(title, resultText) { setAchievement({ title: title, text: resultText + " (Concept only — nothing is transmitted anywhere; any high score shown is kept in this browser's localStorage only. In a real deployment this could offer a VIP demo booking link.)" }); }
  function skip(game) { setSummaryText(game.summary); setView("summary"); setAchievement(null); }
  function backToMenu() { setView("menu"); setAchievement(null); }
  return (
    <div className="p-4">
      <ConceptBadge>Concept mini-games — not simulations of real Zuper systems</ConceptBadge>
      {view === "menu" && (
        <div className="grid gap-3 mt-3">
          {GAMES.map((g) => (
            <div key={g.id} className="p-3.5 flex flex-col gap-2" style={{ background: "rgba(20,10,0,.4)", boxShadow: bevel("out-shallow", CRT_GREEN) }}>
              <h3 className="text-[16px] font-bold m-0 font-mono" style={{ color: "#ffd98a" }}>{g.title}{g.cluster && <span className="ml-2 text-[10px] font-medium" style={{ color: "#c98a2e" }}>({g.cluster})</span>}</h3>
              <p className="text-[14px] font-medium leading-relaxed m-0" style={{ color: "#c98a2e" }}>{g.desc}</p>
              <div className="flex gap-2 mt-1">
                <button type="button" className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: CRT_GREEN, color: "#040200", boxShadow: bevel("out-shallow", CRT_GREEN) }} onClick={() => { setAchievement(null); setView(g.id); }}>Play</button>
                <button type="button" className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: "rgba(20,10,0,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#ffd98a" }} onClick={() => skip(g)}>Skip &amp; Read Summary</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {view !== "menu" && (
        <div className="mt-3">
          <button type="button" className="text-[12px] font-semibold hover:brightness-125" style={{ color: "#c98a2e" }} onClick={backToMenu}>&larr; Back to Arcade</button>
          <div className="mt-1">
            {view === "route-racer" && <RouteRacerGame onComplete={onGameComplete} />}
            {view === "dispatch-tetris" && <DispatchTetrisGame onComplete={onGameComplete} />}
            {view === "workflow-wiring" && <WorkflowWiringGame onComplete={onGameComplete} />}
            {view === "system-stabilizer" && <SystemStabilizerGame onComplete={onGameComplete} />}
            {view === "pipe-flow" && <PipeFlowGame onComplete={onGameComplete} />}
            {view === "spinning-plates" && <SpinningPlatesGame onComplete={onGameComplete} />}
            {view === "fraud-or-fine" && <FraudOrFineGame onComplete={onGameComplete} />}
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

/* ================= Terminal.app (VFS-aware) ================= */
function TerminalWindow({ worldData, jumpTo, onOpenFolder }) {
  const [lines, setLines] = useState([{ text: "Zuper Web OS terminal (concept shell over real VFS data). Type 'help'.", kind: "out" }]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState(null); // null = /desktop root, else cluster id
  const logRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines, input]);

  /* Desktop icons open this terminal already cd'd into the clicked cluster (see
     handleIconOpen in App) — jumpTo is a fresh {cwd, nonce} object each time, even for
     repeat clicks on the same icon, so this effect always re-fires. */
  useEffect(() => {
    if (!jumpTo || !findCluster(worldData, jumpTo.cwd)) return;
    setLines((prev) => prev.concat([{ text: "guest@zuper-web-os:/desktop$ cd " + jumpTo.cwd, kind: "cmd" }]));
    setCwd(jumpTo.cwd);
  }, [jumpTo]);

  function promptPath() { return cwd ? "/desktop/" + cwd : "/desktop"; }
  function promptString() { return "guest@zuper-web-os:" + promptPath() + "$"; }

  function run(cmd) {
    const trimmed = cmd.trim();
    if (trimmed === "") return;
    const out = [{ text: promptString() + " " + trimmed, kind: "cmd" }];
    const [verb, ...rest] = trimmed.split(/\s+/);
    const arg = rest.join(" ");

    if (verb === "clear") { setLines([]); return; }
    if (verb === "help") { out.push({ text: "Commands: help, ls, cd <dir>, pwd, cat <file>, bash <file.sh>, whoami, date, clear", kind: "out" }); }
    else if (verb === "pwd") { out.push({ text: promptPath(), kind: "out" }); }
    else if (verb === "whoami") { out.push({ text: "guest@zuper-web-os", kind: "out" }); }
    else if (verb === "date") { out.push({ text: new Date().toString(), kind: "out" }); }
    else if (verb === "ls") {
      if (!cwd) out.push({ text: worldData.map((c) => c.id + "/").join("  "), kind: "out" });
      else {
        out.push({ text: "opening " + cwd + "/ …", kind: "out" });
        if (onOpenFolder) onOpenFolder(cwd);
      }
    } else if (verb === "cd") {
      if (arg === ".." || arg === "") setCwd(null);
      else if (findCluster(worldData, arg)) setCwd(arg);
      else out.push({ text: "cd: no such directory: " + arg, kind: "err" });
    } else if (verb === "cat") {
      if (!cwd) out.push({ text: "cat: not inside a cluster directory", kind: "err" });
      else if (arg === "readme.md") {
        const c = findCluster(worldData, cwd);
        out.push({ text: "# " + c.name, kind: "out" });
        c.entities.forEach((e) => { out.push({ text: "- " + e.name + " (" + e.type + "): " + e.description, kind: "out" }); });
      } else out.push({ text: "cat: no such file: " + arg, kind: "err" });
    } else if (verb === "bash") {
      if (!cwd) out.push({ text: "bash: not inside a cluster directory", kind: "err" });
      else if (arg === "status.sh") {
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

  /* The live prompt line lives INSIDE the scrolling log, right after the last output
     line — same as a real terminal (cmd.exe, a shell), where there's no separate
     "input box" below a divider and no placeholder hint; the prompt itself is where
     you type, and it scrolls up into history once you hit Enter. Clicking anywhere in
     the terminal refocuses the (invisible, borderless) input, same as a real one. */
  return (
    <div className="p-3 flex flex-col h-full font-terminal font-medium text-[14px]" onClick={() => inputRef.current && inputRef.current.focus()}>
      <div ref={logRef} className="flex-1 overflow-y-auto space-y-1">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "err" ? "text-red-400" : l.kind === "cmd" ? "text-white" : ""} style={l.kind === "out" ? { color: CRT_GREEN, opacity: 0.85 } : undefined}>{l.text}</div>
        ))}
        <div className="flex items-center gap-2">
          <span style={{ color: CRT_GREEN }}>{promptString()}</span>
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { run(input); setInput(""); } }}
            className="flex-1 bg-transparent outline-none text-white" style={{ caretColor: CRT_GREEN }} spellCheck={false} autoComplete="off" autoFocus aria-label="Terminal command input" />
        </div>
      </div>
    </div>
  );
}

/* ================= Taskbar / Start menu ================= */
function Taskbar({ onStartClick, running, onRunningClick, theme }) {
  const [clock, setClock] = useState("");
  const [telemetry, setTelemetry] = useState("");
  const t = theme || THEME;
  useEffect(() => {
    function tick() { const d = new Date(); setClock(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")); }
    tick(); const id = setInterval(tick, 15000); return () => clearInterval(id);
  }, []);
  useEffect(() => {
    function tick() { const t = Date.now() / 1000; setTelemetry("sys x:" + (Math.sin(t * 0.11) * 40 + 40).toFixed(1) + " y:" + (Math.cos(t * 0.07) * 12 + 12).toFixed(1) + " z:" + (Math.sin(t * 0.05) * 60 + 60).toFixed(1)); }
    tick(); const id = setInterval(tick, 800); return () => clearInterval(id);
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
      <span aria-hidden="true" className="hidden sm:inline font-mono text-[11px]" style={{ color: t.chromeTextDim, opacity: .6, fontFamily: t.fontChrome || undefined }}>{telemetry}</span>
      <span aria-hidden="true" className="font-mono font-semibold text-[11px]" style={{ color: t.chromeText, fontFamily: t.fontChrome || undefined }}>{clock}</span>
      <a href="https://labs.zuper.co/" target="_blank" rel="noopener" className="text-[11px] underline" style={{ color: t.accent }}>Subscribe</a>
    </div>
  );
}

function StartMenu({ open, onClose, onOpen, topApps, onFullscreen, onFind, onRun, onReboot, onSession, theme }) {
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
        <div className="px-4 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.chromeTextDim, opacity: .7 }}>Programs</div>
        {topApps.map((a) => (
          <button key={a.id} type="button" className="crt-item w-full text-left px-4 py-2 pl-5 flex items-center gap-2.5" style={{ color: t.chromeText }} onClick={() => onOpen(a.id)}>
            <IconImg icon={a.icon} size={20} className="w-5 text-center flex-shrink-0" />{a.title}
          </button>
        ))}
        <div className="my-1.5 border-t" style={{ borderColor: t.winBorder }}></div>
        {item("🖥️ Fullscreen", onFullscreen)}
        {item("🔎 Find", onFind)}
        {item("▶ Run...", onRun)}
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

function AssistantWidget({ theme, dockTarget, stageRef, worldData }) {
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
      playAssistantGreetSound();
      const id = setTimeout(() => setGreet(false), 700);
      prevOpenRef.current = open;
      return () => clearTimeout(id);
    }
    if (!open && prevOpenRef.current) {
      setBye(true);
      playAssistantByeSound();
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

  function defaultPos() {
    const rect = stageRef.current ? stageRef.current.getBoundingClientRect() : { width: 1400, height: 800 };
    return { x: rect.width - 110, y: rect.height - 210 };
  }
  const docked = !pos;
  const current = pos || dockTarget || defaultPos();

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
        <div className="absolute bottom-[166px] right-0 w-72 p-3 font-mono font-medium text-[13px] flex flex-col"
          style={{ background: t.panelBg, backdropFilter: t.panelBlur, borderRadius: t.winRadius === "0px" ? "0px" : "10px", boxShadow: bevel("out-deep", t.winBorder) + ", 0 16px 40px rgba(0,0,0,.5)" }}>
          <div className="flex items-start justify-between gap-2">
            <ConceptBadge>Claude when configured, else local real-data search</ConceptBadge>
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
      <button type="button" onClickCapture={onClickCapture} onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => { setHover(true); playAssistantGlitchSound(); }} onMouseLeave={() => setHover(false)}
        className="flex items-center justify-center relative focus-visible:outline focus-visible:outline-2"
        style={{ width: 80, height: 160, animation: "zuper-bob 3s ease-in-out infinite", outlineColor: t.accent, overflow: "visible" }}
        aria-label="Zuper OS assistant — real platform data, Claude when configured">
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
            {/* ambient glow ring — brighter/faster on greet, goodbye, or a fresh reply */}
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              background: "radial-gradient(circle, " + t.accent + "50 0%, transparent 72%)",
              animation: (greet || bye || excited) ? "dot-pulse .5s ease-in-out 3" : "crt-flicker 3.5s ease-in-out infinite",
            }} />
            <img src="./assets/zuper-logo.png" alt="Zuper Labs" draggable={false} style={{
              position: "relative", width: 42, height: 42, objectFit: "contain",
              filter: "drop-shadow(0 0 6px " + t.accent + "a0)",
              transform: bye ? "scale(.7) translateY(6px)" : greet ? "scale(1.18)" : "scale(1)",
              opacity: bye ? 0.35 : 1,
              transition: "transform .35s ease, opacity .35s ease",
            }} />
            {/* thinking indicator — same three-dot pulse the terminal-screen version used */}
            {thinking && (
              <div style={{ position: "absolute", bottom: 8, display: "flex", gap: 3 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent, filter: "drop-shadow(0 0 2px " + t.accent + ")", animation: "dot-pulse 1s ease-in-out infinite" }} />
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent, filter: "drop-shadow(0 0 2px " + t.accent + ")", animation: "dot-pulse 1s ease-in-out infinite", animationDelay: "0.15s" }} />
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent, filter: "drop-shadow(0 0 2px " + t.accent + ")", animation: "dot-pulse 1s ease-in-out infinite", animationDelay: "0.3s" }} />
              </div>
            )}
            {/* hover glint — the same "get attention" scan-sweep the old screen used, now a bright bar over the logo */}
            {hover && (
              <div style={{ position: "absolute", left: 4, right: 4, height: 10, background: t.accent, opacity: 0.35, borderRadius: 4, animation: "screen-scan-sweep .7s ease-in-out 1" }} />
            )}
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
        onDoubleClick={() => onOpen(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(id); } }}>
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
    { id: "zuper-arcade", title: "Zuper_Arcade.exe", icon: CLUSTER_ICONS["zuper-arcade"], kind: "arcade", rect: { x: 480, y: 30, w: 480, h: 580 } },
    { id: "terminal", title: "Terminal.app", icon: CLUSTER_ICONS["terminal"], kind: "terminal", rect: { x: 640, y: 320, w: 380, h: 340 } },
  ], []);

  const hiddenWindows = useMemo(() => [
    { id: "desktop-properties", title: "Properties", kind: "properties", rect: { x: 300, y: 160, w: 380, h: 320 } },
    { id: "display-settings", title: "Display settings", kind: "display-settings", rect: { x: 340, y: 140, w: 360, h: 320 } },
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
  function showToast(text) { setToast(text); }

  const [iconSize, setIconSize] = useState(() => { try { return localStorage.getItem("zuper-os-icon-size") || "md"; } catch (e) { return "md"; } });
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
    showToast("Moved to Trash — “Arrange icons” restores it");
  }

  const desktopIcons = useMemo(() => desktopIconDefs.filter((a) => !hiddenIconIds.has(a.id)), [desktopIconDefs, hiddenIconIds]);

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
  const assistantDockTarget = focusedWinState && !focusedWinState.maximized
    ? { x: clamp(focusedWinState.x + focusedWinState.w - 60, 4, 4000), y: Math.max(4, focusedWinState.y - 20) }
    : null;
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
        <GlitchWatermark color={theme.accent} />
        <ScreenGlitch color={theme.accent} />

        {desktopIcons.map((a, i) => (
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
              {w.kind === "arcade" && <ArcadeWindow />}
              {w.kind === "terminal" && <TerminalWindow worldData={worldData} jumpTo={terminalJump} onOpenFolder={wm.open} />}
              {w.kind === "properties" && <PropertiesWindow worldData={worldData} />}
              {w.kind === "display-settings" && <DisplaySettingsWindow iconSize={iconSize} setIconSize={setIconSize} textSize={textSize} setTextSize={setTextSize} />}
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
            { label: "Select all", icon: "▦", onSelect: () => showToast(desktopIcons.length + " icon(s) on this desktop") },
            { divider: true },
            { label: "Properties", icon: "ℹ️", onSelect: () => wm.open("desktop-properties") },
          ]} />
        )}

        <AssistantWidget theme={theme} dockTarget={assistantDockTarget} stageRef={stageRef} worldData={worldData} />

        {toast && <Toast text={toast} onDone={() => setToast(null)} />}
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
        onSession={closeAllWindows} />

      <Taskbar onStartClick={() => setStartOpen((o) => !o)} theme={theme}
        running={runningWindows.map((a) => ({ id: a.id, title: iconNames[a.id] || winDefById[a.id].title, focused: wm.focusedId === a.id }))}
        onRunningClick={toggleFromTaskbar} />
    </React.Fragment>
  );
}

/* ================= Root: load real data, then boot ================= */
function Root() {
  const [worldData, setWorldData] = useState(null);
  const [bootDone, setBootDone] = useState(false);
  const [bootKey, setBootKey] = useState(0);

  useEffect(() => {
    fetch("./zuper-world-data.json").then((r) => r.json()).then(setWorldData).catch(() => setWorldData([]));
  }, []);

  function reboot() { setBootDone(false); setBootKey((k) => k + 1); }

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
