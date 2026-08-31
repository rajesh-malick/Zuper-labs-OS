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
const CRT_GREEN = "#3fe676";

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

/* ---------- Win9x-style bevel texture — technique inspired by 1j01/os-gui's
   .inset-deep/.outset-deep utility classes (MIT licensed), re-implemented here as
   original layered box-shadow CSS in our own CRT green/black palette — not that
   library's Windows-98 gray/blue skin, icons, or JS window engine. Two-tone light
   (top-left) / dark (bottom-right) edges fake a raised or sunken 3D edge; "deep" stacks
   two rings for chunkier chrome (windows), "shallow" is one ring for small controls. */
function bevel(kind, accentHex) {
  const hi2 = "#eafff0", hi = shade(accentHex, 0.2), lo = shade(accentHex, -0.6), lo2 = "#020402";
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
   kept strictly mono CRT-green (no borrowed artwork, no new colors). ---------- */
function vintage(shape, fallback) { return { shape: shape, fallback: fallback }; }

const CLUSTER_ICONS = {
  "command-center": vintage("desktop", "\u{1F5A5}️"),
  "core-platform": vintage("chip", "\u{1F9E0}"),
  "ai-intelligence": vintage("robot", "\u{1F916}"),
  "workflows-cluster": vintage("cycle", "\u{1F501}"),
  "field-operations": vintage("satellite", "\u{1F6F0}️"),
  "security-compliance": vintage("lock", "\u{1F512}"),
  "careers": vintage("briefcase", "\u{1F4BC}"),
  "blog": vintage("memo", "\u{1F4DD}"),
  "customer-portal": vintage("person", "\u{1F464}"),
  "data-pipeline": vintage("bars", "\u{1F4CA}"),
  "payment-processing": vintage("card", "\u{1F4B3}"),
  "inventory-management": vintage("box", "\u{1F4E6}"),
  "integration-hub": vintage("link", "\u{1F517}"),
  "predictive-analytics": vintage("orb", "\u{1F52E}"),
  "zuper-arcade": vintage("joystick", "\u{1F3AE}"),
  "terminal": vintage("prompt", "⌨️"),
};
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
const PIXEL_SHADOW = "#04180b";
const PIXEL_HIGHLIGHT = "#c9ffe0";

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
   the classic embossed icon-pack bevel, all in mono CRT green. */
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

/* Renders a vintage pixel-art icon (or a plain emoji glyph fallback for stray strings). */
function IconImg({ icon, size, className, color }) {
  if (!icon || typeof icon === "string") return <span className={className} style={{ fontSize: size }}>{icon}</span>;
  if (!icon.shape || !VINTAGE_ICON_SHAPES[icon.shape]) return <span className={className} style={{ fontSize: size, color: color || CRT_GREEN }}>{icon.fallback}</span>;
  return <PixelIcon shape={icon.shape} size={size} className={className} color={color} />;
}

/* ---------- Mono-CRT icon tile visuals ---------- */
function iconTileVisuals(color, pressed) {
  return {
    background: "rgba(0,20,8,.55)", borderRadius: "0px", overlay: false,
    border: "1px solid " + color,
    boxShadow: bevel(pressed ? "in-shallow" : "out-shallow", color) + (pressed ? "" : ", 0 0 12px " + color + "55"),
    glow: !pressed,
  };
}

/* ---------- Per-cluster accent color — purely cosmetic variety, not real Zuper branding ---------- */

/* ---------- Desktop display settings (icon/text size) — persisted, purely cosmetic ---------- */
const ICON_TILE_PX = { sm: 38, md: 52, lg: 70 };
const ICON_GLYPH_REM = { sm: "1.05rem", md: "1.35rem", lg: "1.75rem" };
const ICON_LABEL_REM = { sm: "0.72rem", md: "0.82rem", lg: "0.96rem" };
const ICON_CELL_PX = { sm: 78, md: 100, lg: 128 };
const SIZE_OPTIONS = [{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }];

/* ---------- Mono CRT theme — the OS shell's only look. Reskins desktop bg, window
   chrome, taskbar, start menu, context menus, and icon tiles. Window CONTENT (readme/
   dashboard/game text) stays on a dark panel — full re-theming of every content pane
   was out of scope. Original green/black CRT palette, not copied from any specific
   trademarked terminal product. ---------- */
const THEME = {
  label: "Mono CRT", osBg: "#020402", winBg: "rgba(2,8,4,.94)",
  winBorder: "#2fbf5f", winBorderFocused: "#6dffa0",
  winRadius: "0px", winShadowFocused: () => "0 0 0 1px #6dffa0, 0 0 24px rgba(109,255,160,.35)",
  winShadow: "0 0 0 1px rgba(47,191,95,.5)", winBlur: "none",
  titlebar: () => "linear-gradient(180deg, rgba(47,191,95,.18), transparent)",
  accent: CRT_GREEN, chromeText: "#8fffb0", chromeTextDim: "#4fbf7a",
  taskbarBg: "#020402", panelBg: "rgba(2,8,4,.97)", panelBlur: "none",
  fontChrome: "'VT323','Inconsolata',monospace",
};
/* ================= CRT desktop background: static scanlines + green vignette ================= */
function ScanlineBackground({ color }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
      zIndex: 0,
      background: "repeating-linear-gradient(0deg, " + color + "12 0px, " + color + "12 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 30%, " + color + "14, #000 75%)",
    }} />
  );
}

/* ================= Background watermark imprint — "ZUPER LABS" faintly stamped behind
   the icons, with an occasional glitch pop (position-jittered, clipped-band copies that
   flash in and cut out). Stays strictly mono green/black — no RGB channel-split, since
   that would break the "mono CRT only" rule; the glitch reads through jitter + clipping
   + brightness instead of color separation. ================= */
function GlitchWatermark({ color }) {
  const text = "ZUPER LABS";
  const common = {
    position: "absolute", left: "50%", top: "50%",
    fontFamily: "'VT323','Inconsolata',monospace", fontWeight: 700,
    fontSize: "min(15vw, 200px)", letterSpacing: "0.04em", whiteSpace: "nowrap", lineHeight: 1,
  };
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
      <span style={{ ...common, color: color, transform: "translate(-50%,-50%)", animation: "watermark-breathe 7s ease-in-out infinite" }}>{text}</span>
      <span style={{ ...common, color: "#eafff0", clipPath: "inset(38% 0 42% 0)", animation: "watermark-glitch-a 7s linear infinite" }}>{text}</span>
      <span style={{ ...common, color: color, clipPath: "inset(8% 0 78% 0)", animation: "watermark-glitch-b 3.3s linear infinite" }}>{text}</span>
    </div>
  );
}

/* ================= CRT overlay: moving scanline sweep + screen curvature vignette +
   subtle flicker, layered on top of everything (pointer-events-none so it never blocks
   interaction). Pure CSS/keyframe animation, no canvas. ================= */
function CRTOverlay({ color }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1990]" aria-hidden="true">
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.35) 78%, rgba(0,0,0,.8) 100%)",
      }} />
      <div className="absolute inset-0" style={{
        boxShadow: "inset 0 0 140px 40px rgba(0,0,0,.75)",
      }} />
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
      className="fixed z-[1900] min-w-[190px] py-1.5 font-mono text-[0.92rem] overflow-hidden"
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
    <div className="fixed bottom-[64px] left-1/2 z-[1950] px-4 py-2 rounded-lg font-mono text-[0.86rem] text-white/92"
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
        <div className="px-4 py-3 border-b border-white/10 font-mono text-[0.86rem] text-white/68">{title}</div>
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
          placeholder={placeholder} spellCheck={false} autoComplete="off"
          className="w-full px-4 py-3 bg-transparent outline-none text-white/92 font-mono text-[0.94rem] placeholder-white/40 border-b border-white/10" />
        <div className="max-h-[260px] overflow-y-auto py-1.5">
          {matches.length === 0 && <div className="px-4 py-2 text-white/48 font-mono text-[0.86rem]">No matching app.</div>}
          {matches.map((a) => (
            <button key={a.id} type="button" onClick={() => openAndClose(a.id)}
              className="crt-item w-full text-left px-4 py-2 pl-5 flex items-center gap-2.5 text-white/85 hover:text-white font-mono text-[0.9rem]">
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
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.78rem] uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: REAL, borderColor: "rgba(126,230,163,.45)", background: "rgba(126,230,163,.12)" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: REAL }}></span>{children}
    </span>
  );
}
function ConceptBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.78rem] uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: CONCEPT, borderColor: "rgba(126,203,255,.45)", background: "rgba(126,203,255,.12)" }}>
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
        <span className="flex-1 truncate font-mono text-[0.9rem] tracking-wide" style={{ color: t.chromeTextDim, fontFamily: t.fontChrome || undefined }}>{title}</span>
        <div className="flex gap-1">
          <button data-winbtn type="button" onClick={(e) => { e.stopPropagation(); onMinimize(id); }} className="w-[22px] h-[22px] flex items-center justify-center hover:scale-110 transition-transform" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>&#8211;</button>
          <button data-winbtn type="button" onClick={(e) => { e.stopPropagation(); onToggleMaximize(id); }} className="w-[22px] h-[22px] flex items-center justify-center hover:scale-110 transition-transform" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>&#9723;</button>
          <button data-winbtn type="button" onClick={(e) => { e.stopPropagation(); onClose(id); }} className="w-[22px] h-[22px] flex items-center justify-center hover:scale-110 transition-transform" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>&times;</button>
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
      <div className="text-[0.82rem] uppercase tracking-wider text-white/58 mb-1">/desktop/{clusterId}/</div>
      <RealBadge>Real cluster — sourced from labs.zuper.co</RealBadge>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {files.map((f) => (
          <button key={f.key} type="button" className="flex flex-col items-center gap-1.5 p-2 rounded hover:bg-white/5" onDoubleClick={() => onOpenFile(clusterId, f.key)}>
            <span className="text-3xl">{f.glyph}</span>
            <span className="text-[0.82rem] text-white/85 text-center leading-tight break-words">{f.label}</span>
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
      <h1 className="text-white text-[1.5rem] mt-3 mb-1 font-mono">{c.name}</h1>
      <p className="text-white/58 text-[0.88rem] font-mono mb-4">readme.md · {c.entities.length} entit{c.entities.length === 1 ? "y" : "ies"}</p>
      {c.entities.map((e) => (
        <div key={e.id} className="mb-4">
          <h2 className="text-white text-[1.05rem] mb-1 flex items-center gap-2"><IconImg icon={ENTITY_ICONS[e.type] || "■"} size={22} className="inline-block" /> {e.name} <span className="text-white/48 text-[0.82rem] font-mono uppercase align-middle">{e.type}</span></h2>
          <p className="text-white/85 text-[0.98rem] leading-relaxed mb-1.5">{e.description}</p>
          {e.details && (
            <ul className="text-white/72 text-[0.94rem] leading-loose pl-5 list-disc">
              {e.details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      ))}
      <p className="text-white/40 text-[0.86rem] italic mt-4 border-t border-white/10 pt-3">Source: labs.zuper.co /assets/js/zuper-world.js (fetched and verified this session). This reader's chrome is a concept UI; the entity names, types, descriptions, and details above are Zuper's real data, unedited.</p>
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
    <div className="p-3 flex flex-col h-full font-terminal text-[1.15rem]">
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
    <div className="p-3 flex flex-col h-full font-terminal text-[1.15rem]">
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
      <h1 className="text-white text-[1.3rem] mt-3 mb-3 font-mono">{appName}</h1>
      <div className="grid grid-cols-2 gap-3">
        {c.entities.map((e) => (
          <div key={e.id} className="border border-white/10 rounded-lg p-3">
            <div className="mb-1.5"><IconImg icon={ENTITY_ICONS[e.type] || "■"} size={30} /></div>
            <div className="text-white text-[1.0rem] font-mono">{e.name}</div>
            <div className="text-white/58 text-[0.8rem] uppercase font-mono mb-1.5">{e.type} · {e.category}</div>
            <p className="text-white/78 text-[0.9rem] leading-relaxed">{e.description}</p>
          </div>
        ))}
      </div>
      <p className="text-white/40 text-[0.84rem] italic mt-4">"{appName}" is a concept UI shell wrapping labs.zuper.co's real entity data — not a confirmed real Zuper product name.</p>
    </div>
  );
}

function PropertiesWindow({ worldData }) {
  const totalEntities = worldData.reduce((s, c) => s + c.entities.length, 0);
  const totalFlows = worldData.reduce((s, c) => s + c.flows.length, 0);
  return (
    <div className="p-5 font-mono">
      <h1 className="text-white text-[1.2rem] mb-3">Zuper Web OS — Properties</h1>
      <div className="flex flex-col gap-1.5 text-[0.9rem] text-white/78 mb-4">
        <div>Clusters: <span className="text-white/92">{worldData.length}</span> (real, from labs.zuper.co)</div>
        <div>Entities: <span className="text-white/92">{totalEntities}</span></div>
        <div>Connection flows: <span className="text-white/92">{totalFlows}</span></div>
        <div>Build: <span className="text-white/92">concept prototype</span> (React + Tailwind, no backend)</div>
      </div>
      <RealBadge>Cluster/entity counts above are real</RealBadge>
      <p className="text-white/48 text-[0.84rem] italic mt-4">This is a static desktop metaphor over real Zuper Labs scene data — no actual file system, accounts, or persistence beyond your browser's localStorage (icon positions/names only).</p>
    </div>
  );
}

function SizeRadioRow({ label, value, onChange, options }) {
  const opts = options || SIZE_OPTIONS;
  return (
    <div className="mb-5">
      <div className="text-white/68 text-[0.86rem] font-mono mb-2">{label}</div>
      <div className="flex gap-2 flex-wrap">
        {opts.map((o) => {
          const active = value === o.value;
          return (
            <button key={o.value} type="button" onClick={() => onChange(o.value)}
              className="px-3.5 py-1.5 rounded-lg border font-mono text-[0.86rem] transition-colors"
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
      <h1 className="text-white text-[1.15rem] mb-4 font-mono">Display settings</h1>
      <SizeRadioRow label="Icon size" value={iconSize} onChange={setIconSize} />
      <SizeRadioRow label="Text size" value={textSize} onChange={setTextSize} />
      <p className="text-white/48 text-[0.82rem] italic mt-2">Changes apply immediately and are saved to this browser (localStorage) — nothing is sent anywhere.</p>
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
    ctx.fillStyle = "#020402"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(63,230,118,0.14)";
    for (let i = 0; i <= GRID; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke(); }
    ctx.fillStyle = "rgba(2,20,10,0.9)"; ctx.strokeStyle = "rgba(63,230,118,0.4)";
    state.blocked.forEach((b) => { ctx.fillRect(b.x * CELL + 3, b.y * CELL + 3, CELL - 6, CELL - 6); ctx.strokeRect(b.x * CELL + 3, b.y * CELL + 3, CELL - 6, CELL - 6); });
    state.jobs.forEach((j) => { ctx.fillStyle = j.visited ? "rgba(63,230,118,0.3)" : CRT_GREEN; ctx.beginPath(); ctx.arc(j.x * CELL + CELL / 2, j.y * CELL + CELL / 2, 10, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#eafff0"; ctx.beginPath(); ctx.arc(state.pos.x * CELL + CELL / 2, state.pos.y * CELL + CELL / 2, 8, 0, Math.PI * 2); ctx.fill();
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
      <div className="w-full flex items-center justify-between text-[0.9rem] font-mono" style={{ color: "#8fffb0" }}>
        <span>Moves: {state.moves} / {MOVE_LIMIT}</span><span>Jobs remaining: {remaining}</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => setState(makeState())}>Restart</button>
      </div>
      <canvas ref={canvasRef} tabIndex={0} width={GRID * CELL} height={GRID * CELL} className="outline-none" style={{ boxShadow: bevel("in-deep", CRT_GREEN) }} aria-label="Route Racer grid. Use arrow keys to move."></canvas>
      <div className="flex flex-col items-center gap-1">
        <button type="button" className="w-8 h-8" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => move("up")} aria-label="Move up">&#8593;</button>
        <div className="flex gap-1">
          <button type="button" className="w-8 h-8" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => move("left")} aria-label="Move left">&#8592;</button>
          <button type="button" className="w-8 h-8" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => move("down")} aria-label="Move down">&#8595;</button>
          <button type="button" className="w-8 h-8" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => move("right")} aria-label="Move right">&#8594;</button>
        </div>
      </div>
      <p className="text-[0.92rem] text-center" style={{ color: "#4fbf7a" }}>{state.message}</p>
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
      <div className="flex items-center justify-between text-[0.9rem] font-mono" style={{ color: "#8fffb0" }}>
        <span>Placed: {score}</span><span>Skipped: {misses}</span><span>Time: {timeLeft}s</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={restart}>Restart</button>
      </div>
      <div>
        <div className="text-[0.84rem] mb-1.5 font-mono" style={{ color: "#4fbf7a" }}>Next job:</div>
        {queue.length > 0 && <div className="w-11 h-[34px] flex items-center justify-center font-mono text-[0.94rem]" style={{ background: CRT_GREEN, color: "#020402", boxShadow: bevel("out-shallow", CRT_GREEN) }}>{queue[0]}h</div>}
      </div>
      <div className="flex flex-col gap-1.5">
        {TECHS.map((name, t) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-14 text-[0.88rem] font-mono" style={{ color: "#4fbf7a" }}>{name}</div>
            <div className="flex gap-1">
              {Array.from({ length: SLOTS }).map((_, s) => {
                const isInvalid = invalidCell === t + "," + s;
                return (
                  <button key={s} type="button" aria-label={name + " hour " + (s + 1) + (schedule[t][s] ? " (booked)" : " (open)")} onClick={() => place(t, s)}
                    className="w-8 h-8"
                    style={{
                      background: isInvalid ? CRT_GREEN : schedule[t][s] ? "rgba(63,230,118,.25)" : "rgba(0,20,8,.4)",
                      boxShadow: bevel(isInvalid || schedule[t][s] ? "in-shallow" : "out-shallow", CRT_GREEN),
                    }}></button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[0.92rem] text-center" style={{ color: "#4fbf7a" }}>{message}</p>
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
      <div className="flex items-center justify-between text-[0.9rem] font-mono" style={{ color: "#8fffb0" }}>
        <span>Wired: {Object.keys(wired).length} / {pairsRef.current.length}</span><span>Mistakes: {mistakes}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="text-[0.82rem] uppercase tracking-wide font-mono" style={{ color: "#4fbf7a" }}>Triggers</div>
          {pairsRef.current.map((p) => (
            <button key={p.trigger} type="button" disabled={!!wired[p.trigger]} onClick={() => pickTrigger(p.trigger)}
              className="text-left text-[0.92rem] px-2.5 py-2 disabled:opacity-40"
              style={{
                background: "rgba(0,20,8,.4)", color: "#8fffb0",
                boxShadow: bevel(wired[p.trigger] || selected === p.trigger ? "in-shallow" : "out-shallow", CRT_GREEN),
              }}>{p.trigger}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[0.82rem] uppercase tracking-wide font-mono" style={{ color: "#4fbf7a" }}>Actions</div>
          {actionsRef.current.map((a) => {
            const isWiredAction = Object.values(wired).includes(a);
            const isWrong = flashWrong === a;
            return (
              <button key={a} type="button" disabled={isWiredAction} onClick={() => pickAction(a)}
                className="text-left text-[0.92rem] px-2.5 py-2 disabled:opacity-40"
                style={{
                  background: isWrong ? CRT_GREEN : "rgba(0,20,8,.4)", color: isWrong ? "#020402" : "#8fffb0",
                  boxShadow: bevel(isWiredAction || isWrong ? "in-shallow" : "out-shallow", CRT_GREEN),
                }}>{a}</button>
            );
          })}
        </div>
      </div>
      <p className="text-[0.92rem] text-center" style={{ color: "#4fbf7a" }}>{message}</p>
      {allWired && <p className="text-center text-[0.88rem] font-mono" style={{ color: CONCEPT }}>Done — see the achievement note below.</p>}
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
      <div className="flex items-center justify-between text-[0.9rem] font-mono" style={{ color: "#8fffb0" }}>
        <span>Time: {timeLeft}s</span>
        <button type="button" className="px-2 py-1" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={restart}>Restart</button>
      </div>
      <div className="flex flex-col gap-3">
        {METERS.map((m) => {
          const v = values[m]; const safe = v > 25 && v < 75;
          const meterColor = safe ? CRT_GREEN : "#eafff0";
          return (
            <div key={m} className="flex items-center gap-3">
              <div className="w-20 text-[0.88rem] font-mono" style={{ color: "#4fbf7a" }}>{m}</div>
              <div className="flex-1 h-3 overflow-hidden" style={{ boxShadow: bevel("in-shallow", CRT_GREEN), background: "rgba(0,20,8,.5)" }}>
                <div className="h-full transition-[width]" style={{ width: v + "%", background: meterColor, opacity: safe ? 0.8 : 1, animation: safe ? "none" : "crt-icon-glow 1s ease-in-out infinite" }}></div>
              </div>
              <button type="button" className="w-7 h-7" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => nudge(m, -1)}>&#8722;</button>
              <button type="button" className="w-7 h-7" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => nudge(m, 1)}>+</button>
            </div>
          );
        })}
      </div>
      <p className="text-[0.92rem] text-center" style={{ color: "#4fbf7a" }}>{message}</p>
    </div>
  );
}

const GAMES = [
  { id: "route-racer", title: "Route Racer", cluster: "field-operations", desc: "Grid-navigation puzzle. Visit every job site before you run out of moves.", summary: "Concept takeaway: Zuper's real dispatch system routes technicians around live traffic and job constraints automatically — this mini-game is an illustrative analogy, not a simulation of the real routing engine." },
  { id: "dispatch-tetris", title: "Dispatch Tetris", cluster: null, desc: "Schedule-fitting puzzle. Place each incoming job into an open technician slot.", summary: "Concept takeaway: Zuper's real scheduling tools fit incoming jobs into technician availability automatically — this mini-game is an illustrative analogy, not a simulation of the real scheduling engine." },
  { id: "workflow-wiring", title: "Workflow Wiring", cluster: "workflows-cluster", desc: "Connect event triggers to automated actions in a logic puzzle.", summary: "Concept takeaway: Zuper's real workflow automation connects triggers to actions behind the scenes — this mini-game is an illustrative analogy, not a simulation of the real automation engine." },
  { id: "system-stabilizer", title: "System Stabilizer", cluster: "core-platform", desc: "Resource-management mini-game. Keep every system meter in range.", summary: "Concept takeaway: Zuper's real platform monitors and balances system load automatically — this mini-game is an illustrative analogy, not a simulation of real infrastructure telemetry." },
];

function ArcadeWindow() {
  const [view, setView] = useState("menu");
  const [achievement, setAchievement] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  function onGameComplete(title, resultText) { setAchievement({ title: title, text: resultText + " (Concept only — no score is saved or transmitted; in a real deployment this could offer a VIP demo booking link.)" }); }
  function skip(game) { setSummaryText(game.summary); setView("summary"); setAchievement(null); }
  function backToMenu() { setView("menu"); setAchievement(null); }
  return (
    <div className="p-4">
      <ConceptBadge>Concept mini-games — not simulations of real Zuper systems</ConceptBadge>
      {view === "menu" && (
        <div className="grid gap-3 mt-3">
          {GAMES.map((g) => (
            <div key={g.id} className="p-3.5 flex flex-col gap-2" style={{ background: "rgba(0,20,8,.4)", boxShadow: bevel("out-shallow", CRT_GREEN) }}>
              <h3 className="text-[1rem] m-0 font-mono" style={{ color: "#8fffb0" }}>{g.title}{g.cluster && <span className="ml-2 text-[0.78rem] font-normal" style={{ color: "#4fbf7a" }}>({g.cluster})</span>}</h3>
              <p className="text-[0.94rem] leading-relaxed m-0" style={{ color: "#4fbf7a" }}>{g.desc}</p>
              <div className="flex gap-2 mt-1">
                <button type="button" className="px-3 py-1.5 text-[0.92rem]" style={{ background: CRT_GREEN, color: "#020402", boxShadow: bevel("out-shallow", CRT_GREEN) }} onClick={() => { setAchievement(null); setView(g.id); }}>Play</button>
                <button type="button" className="px-3 py-1.5 text-[0.92rem]" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", CRT_GREEN), color: "#8fffb0" }} onClick={() => skip(g)}>Skip &amp; Read Summary</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {view !== "menu" && (
        <div className="mt-3">
          <button type="button" className="text-[0.92rem] hover:brightness-125" style={{ color: "#4fbf7a" }} onClick={backToMenu}>&larr; Back to Arcade</button>
          <div className="mt-1">
            {view === "route-racer" && <RouteRacerGame onComplete={onGameComplete} />}
            {view === "dispatch-tetris" && <DispatchTetrisGame onComplete={onGameComplete} />}
            {view === "workflow-wiring" && <WorkflowWiringGame onComplete={onGameComplete} />}
            {view === "system-stabilizer" && <SystemStabilizerGame onComplete={onGameComplete} />}
            {view === "summary" && <p className="text-[0.96rem] leading-relaxed p-4" style={{ color: "#8fffb0" }}>{summaryText}</p>}
          </div>
        </div>
      )}
      {achievement && (
        <div className="mt-4 p-3.5" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-deep", CRT_GREEN) }}>
          <h4 className="m-0 text-[1.02rem] font-mono" style={{ color: "#8fffb0" }}>{achievement.title}</h4>
          <p className="m-0 mt-1 text-[0.92rem] leading-relaxed" style={{ color: "#4fbf7a" }}>{achievement.text}</p>
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
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines]);

  /* Desktop icons open this terminal already cd'd into the clicked cluster (see
     handleIconOpen in App) — jumpTo is a fresh {cwd, nonce} object each time, even for
     repeat clicks on the same icon, so this effect always re-fires. */
  useEffect(() => {
    if (!jumpTo || !findCluster(worldData, jumpTo.cwd)) return;
    setLines((prev) => prev.concat([{ text: "guest@zuper-web-os:/desktop$ cd " + jumpTo.cwd, kind: "cmd" }]));
    setCwd(jumpTo.cwd);
  }, [jumpTo]);

  function promptPath() { return cwd ? "/desktop/" + cwd : "/desktop"; }

  function run(cmd) {
    const trimmed = cmd.trim();
    if (trimmed === "") return;
    const out = [{ text: "guest@zuper-web-os:" + promptPath() + "$ " + trimmed, kind: "cmd" }];
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

  return (
    <div className="p-3 flex flex-col h-full font-terminal text-[1.18rem]">
      <div ref={logRef} className="flex-1 overflow-y-auto space-y-1 mb-2">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "err" ? "text-red-400" : l.kind === "cmd" ? "text-white" : ""} style={l.kind === "out" ? { color: CRT_GREEN, opacity: 0.85 } : undefined}>{l.text}</div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 pt-2">
        <span style={{ color: CRT_GREEN }}>{promptPath()}&gt;</span>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { run(input); setInput(""); } }}
          className="flex-1 bg-transparent outline-none text-white placeholder-white/30" style={{ caretColor: CRT_GREEN }} placeholder="type 'help'" spellCheck={false} autoComplete="off" aria-label="Terminal command input" />
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
      <button type="button" onClick={onStartClick} className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[0.94rem]" style={{ background: t.accent, color: "#020402", fontWeight: "bold", boxShadow: bevel("out-shallow", t.accent) }}>&#9635; Start</button>
      <div className="flex-1 flex gap-1.5 overflow-x-auto">
        {running.map((r) => (
          <button key={r.id} type="button" onClick={() => onRunningClick(r.id)}
            className="px-2.5 py-1 font-mono text-[0.88rem] whitespace-nowrap"
            style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel(r.focused ? "in-shallow" : "out-shallow", r.focused ? t.accent : t.winBorder), color: r.focused ? t.chromeText : t.chromeTextDim, fontFamily: t.fontChrome || undefined }}>{r.title}</button>
        ))}
      </div>
      <span aria-hidden="true" className="hidden sm:inline text-[0.84rem] font-mono" style={{ color: t.chromeTextDim, opacity: .6, fontFamily: t.fontChrome || undefined }}>{telemetry}</span>
      <span aria-hidden="true" className="text-[0.94rem] font-mono" style={{ color: t.chromeText, fontFamily: t.fontChrome || undefined }}>{clock}</span>
      <a href="https://labs.zuper.co/" target="_blank" rel="noopener" className="text-[0.92rem] underline" style={{ color: t.accent }}>Subscribe</a>
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
      <div className="fixed left-3 bottom-[60px] w-72 max-h-[70vh] overflow-y-auto py-2 z-[850] font-mono text-[0.92rem]"
        style={{ background: t.panelBg, backdropFilter: t.panelBlur, borderRadius: t.winRadius === "0px" ? "0px" : "8px", boxShadow: bevel("out-deep", t.winBorder), fontFamily: t.fontChrome || undefined }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-4 pt-1 pb-1.5 text-[0.78rem] uppercase tracking-wide" style={{ color: t.chromeTextDim, opacity: .7 }}>Programs</div>
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
        <div className="my-1.5 border-t" style={{ borderColor: t.winBorder }}></div>
        <a href="https://labs.zuper.co/" target="_blank" rel="noopener" className="crt-item block px-4 py-2 pl-5" style={{ color: t.accent }}>Open real labs.zuper.co &#8599;</a>
      </div>
    </React.Fragment>
  );
}

/* ================= Desktop assistant — an original Zuper-branded wrench mascot
   (own design: a wrench head with cartoon eyes, coated in Zuper's real brand orange
   ACCENT with chrome/silver jaw-tip and wire-arm accents — own proportions/colors,
   not a trace of any reference image; earlier passes were an alien-cat, a humanoid,
   a head-only golden-dog, a head-only otter, then a full-body otter, replaced in
   turn per direction). Chosen deliberately as "an object with a personality" in the
   spirit of a classic desktop-assistant character, WITHOUT using that character:
   Microsoft's actual Clippy asset/sprite (investigated via felixrieseberg/clippy,
   whose own LICENSE.md admits the bundled Office Assistant spritesheet has no real
   grant, only a self-asserted fair-use claim) can't be reused here regardless of
   internal risk-tolerance — so instead of an office paperclip, this is a genuinely
   different, on-brand field-service tool. No hard cartoon outlines anywhere — every
   part is a gradient fill plus soft translucent shadows, which is what actually
   reads as "soft 3D" rather than a flat outlined icon. The outer <button>
   used to visually BE a 64x64 circular badge (background+border+boxShadow all
   circle-shaped) — that's why only a head ever fit and why it always read as "a face
   in a circular badge"; the button is now just an invisible hit-box, and every visible
   pixel is drawn by the SVG at whatever size the figure actually needs. The glow is a
   drop-shadow filter on the SVG (hugs the actual drawn silhouette) instead of a
   boxShadow on the button. On top of that, the whole SVG gets a genuine CSS 3D
   transform (perspective + rotateY, real 3D, not just shading) as an idle animation —
   visible dimensionality without the cost/complexity of a full WebGL rewrite, which is
   what got reverted earlier when tried for the whole Zuper Quest town. Has its own
   small set of original animation "states" — idle blink, a wire-arm wiggle on opening
   or on a fresh reply, a head-tilt while thinking — in the same interaction-design
   vocabulary classic assistant characters use (a named greeting/thinking/idle
   animation set, the kind @react95/clippy exposes), but hand-built as CSS/SVG
   transforms on this original character, not any borrowed sprite frames —
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
     assistant characters use (a greeting gesture on open, a thinking pose while
     waiting, an excited response) but hand-built here as CSS/SVG transforms on our own
     original character, not any borrowed sprite frames. */
  const [greet, setGreet] = useState(false);
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setGreet(true);
      const id = setTimeout(() => setGreet(false), 700);
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
        <div className="absolute bottom-[166px] right-0 w-72 p-3 font-mono text-[0.82rem] flex flex-col"
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
                  <span style={{ color: t.chromeTextDim, fontSize: "0.7rem" }}>{m.source === "claude" ? "  — via Claude" : "  — local search"}</span>
                )}
              </p>
            ))}
            {thinking && <p className="leading-relaxed" style={{ color: t.chromeTextDim }}>…thinking</p>}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestions.map((s, i) => (
              <button key={i} type="button" disabled={thinking} onClick={() => ask(s)} className="px-2 py-0.5 text-[0.72rem] disabled:opacity-40" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeTextDim }}>{s}</button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="flex gap-1.5">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" autoComplete="off" disabled={thinking}
              className="flex-1 px-2 py-1 text-[0.82rem] bg-transparent outline-none disabled:opacity-40" style={{ border: "none", boxShadow: bevel("in-shallow", t.winBorder), color: t.chromeText, caretColor: t.accent }} />
            <button type="submit" disabled={thinking} className="px-2.5 py-1 text-[0.8rem] disabled:opacity-40" style={{ background: "rgba(0,20,8,.5)", boxShadow: bevel("out-shallow", t.winBorder), color: t.chromeText }}>Ask</button>
          </form>
        </div>
      )}
      <button type="button" onClickCapture={onClickCapture} onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center relative focus-visible:outline focus-visible:outline-2"
        style={{ width: 80, height: 160, animation: "zuper-bob 3s ease-in-out infinite", outlineColor: t.accent, overflow: "visible" }}
        aria-label="Zuper OS assistant — real platform data, Claude when configured">
        {/* An original full-body otter mascot in roofer/field-tech workwear — head as
            before (wide/flat face, small round ears, whiskers, a cap in Zuper's real
            brand orange), now with a body: overalls, arms, legs, boots, a tool belt.
            Own proportions/design, not a trace of any reference image. The outer
            <button> used to BE the 64x64 circular badge (background+border+boxShadow
            all shaped like a circle), which is why showing more than a head felt
            impossible — it's now just an invisible hit-box; every visible pixel is
            drawn by this SVG, sized to fit the full figure, not clipped to a small
            round icon. Genuine CSS 3D (perspective + rotateY, real 3D transforms, not
            just flat shading) gives it visible depth as it idles — a lighter-weight
            way to get real dimensionality than a full WebGL rewrite, which is what got
            reverted earlier when tried for the whole Zuper Quest town. */}
        <svg width={80} height={160} viewBox="0 0 80 160" style={{
          position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none",
          filter: "drop-shadow(0 10px 14px rgba(0,0,0,.5)) drop-shadow(0 0 7px " + t.accent + "90)",
          animation: "mascot-3d-tilt 5s ease-in-out infinite",
        }}>
          <defs>
            <radialGradient id="assistantBody" cx="35%" cy="25%" r="85%">
              <stop offset="0%" stopColor={shade(ACCENT, 0.5)} />
              <stop offset="50%" stopColor={ACCENT} />
              <stop offset="100%" stopColor={shade(ACCENT, -0.35)} />
            </radialGradient>
            <linearGradient id="assistantMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eef2f5" />
              <stop offset="50%" stopColor="#b9c2c9" />
              <stop offset="100%" stopColor="#7c868d" />
            </linearGradient>
          </defs>
          {/* An original Zuper-branded wrench mascot — the "object with a face"
              charm that made Clippy iconic, without touching Microsoft's actual
              character: a real field-service tool (not an office paperclip), coated
              in Zuper's own real brand orange with chrome jaw tips, expressive
              wire-thin arms for gesture (Clippy's signature trait, reimplemented
              from scratch as our own shapes), and classic white-sclera cartoon eyes. */}
          <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: thinking ? "dog-think-tilt 1.6s ease-in-out infinite" : "none" }}>
            <ellipse cx="40" cy="30" rx="20" ry="18" fill="url(#assistantBody)" />
            <path d="M22 24 A20 18 0 0 1 58 24" fill="none" stroke={shade(ACCENT, 0.55)} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <path d="M30 20 L23 15 Q20 13 22 17 L28 24 Z" fill="none" />
            <path d="M25 26 Q22 20 27 18" fill="none" stroke="#7a2c0d" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M55 26 Q58 20 53 18" fill="none" stroke="#7a2c0d" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse className="assistant-eye" cx="31" cy="30" rx="6" ry="7" fill="#fdfaf4" />
            <ellipse className="assistant-eye" cx="49" cy="30" rx="6" ry="7" fill="#fdfaf4" />
            <circle cx="32.5" cy="31.5" r="3" fill="#241a10" />
            <circle cx="50.5" cy="31.5" r="3" fill="#241a10" />
            <circle cx="31" cy="29.5" r="1" fill="#ffffff" />
            <circle cx="49" cy="29.5" r="1" fill="#ffffff" />
            <path d="M32 42 Q40 47 48 42" fill="none" stroke="#7a2c0d" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* shaft */}
          <path d="M31 46 L31 108 Q31 112 35 112 L45 112 Q49 112 49 108 L49 46 Z" fill="url(#assistantBody)" />
          <rect x="32" y="60" width="4" height="44" rx="2" fill={shade(ACCENT, 0.4)} opacity="0.55" />

          {/* wire-thin arms — Clippy's signature expressive trait, our own shapes.
              One raised in a wave gesture (wiggles on open / on a fresh reply), one
              resting. */}
          <path d="M49 66 Q66 70 70 88" fill="none" stroke="url(#assistantMetal)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="70.5" cy="90" r="4.5" fill="url(#assistantMetal)" />
          <path d="M31 66 Q13 62 8 44" fill="none" stroke="url(#assistantMetal)" strokeWidth="3" strokeLinecap="round"
            style={{ transformBox: "fill-box", transformOrigin: "31px 66px", animation: (greet || excited) ? "dog-ear-wiggle .35s ease-in-out 2" : "none" }} />
          <circle cx="7.5" cy="41" r="4.5" fill="url(#assistantMetal)"
            style={{ transformBox: "fill-box", transformOrigin: "31px 66px", animation: (greet || excited) ? "dog-ear-wiggle .35s ease-in-out 2" : "none" }} />

          {/* open-end jaw — the wrench's business end, doubling as "feet" */}
          <path d="M28 112 L28 142 Q28 148 22 148 L18 148 Q14 148 14 152 L14 156 L30 156 L30 130 L34 130 L34 156 L46 156 L46 130 L50 130 L50 156 L66 156 L66 152 Q66 148 62 148 L58 148 Q52 148 52 142 L52 112 Z" fill="url(#assistantMetal)" />
        </svg>
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
  const v = iconTileVisuals(color, pressed);

  return (
    <div className="absolute pointer-events-auto" style={{ left: pos.x, top: pos.y, width: Math.max(92, tile + 24) }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY }); }}>
      <button type="button" onClickCapture={onClickCapture}
        className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/10 transition-transform focus-visible:outline focus-visible:outline-2"
        style={{ width: Math.max(92, tile + 24), outlineColor: color, transform: pressed ? "scale(.93)" : "scale(1)", borderRadius: v.borderRadius }}
        onDoubleClick={() => onOpen(id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(id); } }}>
        <span className="relative flex items-center justify-center overflow-hidden transition-transform"
          style={{
            width: tile, height: tile, fontSize: glyphSize, background: v.background, borderRadius: v.borderRadius,
            border: v.border,
            boxShadow: v.boxShadow,
          }}>
          <span className="relative" style={{ color: color, animation: v.glow ? "crt-icon-glow 2.4s ease-in-out infinite" : "none" }}>
            <IconImg icon={icon} size={typeof icon === "string" ? glyphSize : Math.round(tile * 0.66)} color={color} />
          </span>
        </span>
        <span className="text-center leading-tight font-mono break-words" style={{ fontSize: labelSize, color: t.chromeText, fontFamily: t.fontChrome || undefined, textShadow: "0 0 6px " + color + "80" }}>{title}</span>
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
  const desktopIconDefs = useMemo(() => clusterApps.concat(staticApps), [clusterApps, staticApps]);

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

  function toggleFromTaskbar(id) {
    const w = wm.state[id];
    if (!w.open || w.minimized) wm.open(id);
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
      wm.open("terminal");
      wm.focus("terminal");
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
        <CRTOverlay color={theme.accent} />

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
            { divider: true },
            { label: "Open real labs.zuper.co", icon: "↗", onSelect: () => window.open("https://labs.zuper.co/", "_blank") },
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
