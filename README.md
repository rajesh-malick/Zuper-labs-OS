# Zuper Labs OS

**Live demo: https://zuper-labs-os.vercel.app**

A design-concept prototype that reimagines [labs.zuper.co](https://labs.zuper.co/)
— Zuper's real cluster/entity map of its own platform — as a retro,
green-phosphor desktop operating system. Instead of browsing a 3D spatial
map, you boot into a CRT-styled desktop, open the same 14 real product
clusters as folders, read their real entities and data-flows as files, run
a terminal with a handful of real VFS commands, and poke around a few
throwaway arcade mini-games styled to match.

**The whole idea:** most "explore our platform" pages are either a static
diagram or a fly-through 3D map — fun once, then forgotten. This asks
"what if it were a place you could actually *use*, the way people already
know how to use a desktop?" Windows, icons, a start menu, a terminal, drag
and resize — muscle memory people already have, repurposed to surface real
product information (what Zuper's clusters are, what they contain, how
they talk to each other) instead of a generic OS demo. It's a prototype,
not a shipped product — see **What's real** vs **What's concept** below for
exactly which parts are genuine Zuper data and which are UI invention.

Pure client-side build, no npm install or build step: React 18, Babel
Standalone (in-browser JSX transform), and Tailwind are all loaded from CDN
in `index.html`. Open `index.html` through a static server (not `file://`)
and it runs — it also does a `fetch('./zuper-world-data.json')` on load, so
that file must sit next to `index.html`. This makes it deployable as-is to
any static host (Vercel, Netlify, GitHub Pages) with zero build step.

## Mono CRT — the only theme

An earlier pass added a 3-way theme switcher (Zuper Dark / Retro Flat / Mono
CRT). Per direction, that was collapsed down to **Mono CRT only** — the dead
Zuper Dark / Retro Flat code (canvas background, glossy-3D and flat-Win95
icon styles) was removed rather than left unused. The single `THEME` object
now drives everything: green-on-black desktop, window chrome, taskbar, start
menu, context menus, and icon tiles. Every icon tile and window accent is
uniformly green now too (previously each cluster kept its own accent hue,
which read as "colorful," not "mono" — removed for genuine monochrome).
Original green/black CRT palette — not copied from any specific trademarked
terminal product.

**Window content** (readme text, dashboards, terminal, games) intentionally
stays on a dark panel rather than being fully re-themed — full per-pixel
CRT-ification of every content pane was out of scope; this reskins the OS
shell. Terminal-flavored content (`Terminal.app`, `status.sh`,
`connections.sh`, the boot screen) *does* use the CRT green now — those
were still hardcoded orange from the old multi-theme version, which read as
a mismatch once Mono CRT became the only look, so that got fixed too.

### CRT authenticity details (added after reviewing further green-terminal
### references — Videotex-style UIs, Severance-style monochrome consoles,
### classic green Winamp skins)
- A `CRTOverlay` layered on top of everything: a moving horizontal scanline
  sweep, a subtle flicker, and a pronounced screen-curvature vignette
  (darkened corners), all pure CSS/keyframe, no canvas.
- Icon tiles use a real glow-pulse animation (`crt-icon-glow`), not just a
  static shadow.
- Menu/list rows (Start menu, context menus, the Find/Run launcher) get a
  bright-green hover highlight and a classic `> ` selection-cursor prefix on
  hover, instead of the earlier generic white overlay.
- `Terminal.app`'s input has a green `caretColor` for an authentic blinking
  cursor.

## Desktop assistant

An original alien-cat mascot (pointy ears, twin antennae, big glossy
eyes — own hand-drawn SVG design, inspired by the *vibe* of a green
alien-cat meme reference shared during design, not a copy of that photo or
any specific artwork/likeness) that docks near the currently focused
window until you manually drag it, then stays where you put it.

Click it to open a small chat panel with real capability: type any
question and it keyword-searches the **actual** cluster/entity/data-flow
data loaded from `zuper-world-data.json` (the same real labs.zuper.co data
used everywhere else in this app) and answers from it — e.g. "what is
ai-intelligence", an entity's name, "how many clusters are there?", or
"what does workflows-cluster connect to?". Suggested-question chips and a
"give me a tip" fallback (the old canned usage tips) are included.

Explicitly badged **"Real-data Q&A — local search, not a live LLM"** —
this is deterministic string/keyword matching against the real local JSON,
not a language model. No backend, no API key, no network call; everything
it "knows" is the same static data file already shipped in this repo.

## Icon licensing note

Desktop/app icons are **hand-authored, original shapes** — not traced or
copied from any icon set, marketplace, or specific artist's pack. They
started as inline SVG line-art, then moved to a small canvas-based
pixel-art renderer (`PixelIcon` in app.jsx): each shape is drawn at native
24x24 resolution with three offset stroke passes (dark shadow, light
highlight, mid-green main line) to fake the classic embossed-bevel look of
a Win95-era icon pack, then upscaled with `image-rendering: pixelated` for
a chunky, blocky finish. The construction *convention* (chunky beveled
tiles) takes inspiration from Windows-95-parody icon packs shared as
references, but no artwork, file, or pixel data from those packs was
copied — only the original shape library already in this file, re-rendered.
Kept strictly mono CRT-green — no new colors introduced.

This replaced two earlier passes: first Microsoft's Fluent Emoji 3D set
(MIT licensed) — dropped because glossy 3D renders didn't read as
"vintage," only "desaturated photo" — then plain single-color SVG line-art,
upgraded to the current pixel-art/bevel treatment per direct reference.
`@react95/icons` was also considered early on and rejected: React95's own
LICENSE file explicitly excludes "Windows and all associated images...
property of Microsoft Corp" from its MIT grant.

## OS mechanics (added after a "make it more lively" pass, refs: windows93.net, dustinbrett.com/daedalOS, posthog.com)

- **Draggable desktop icons** — free-position, persisted to `localStorage`
  (`zuper-os-icon-pos`). Right-click the desktop → "Arrange icons" resets them.
- **Resizable windows** — drag the right edge, bottom edge, or bottom-right
  corner. Double-click the titlebar (or the ▢ button) to maximize/restore.
- **Right-click context menus** — on the desktop (arrange icons, refresh,
  jump to the real site) and on any window's titlebar (maximize/minimize/close).
- **Live animated background** — a canvas of slowly drifting colored gradient
  blobs, a faint grid, and twinkling stars, behind everything. Purely
  decorative, in Zuper's own orange/dark palette (not a copy of any
  reference site's specific wallpaper/branding).
- **Per-cluster accent colors** — each of the 14 real clusters gets a
  distinct color for its icon tile and window glow, purely for visual
  variety; not a real Zuper brand system.
- **Two-tier typography**: window titles, desktop icon labels, badges, and
  the taskbar use a clean readable mono (Inconsolata) with a drop shadow for
  contrast against the animated background. Only genuine terminal/shell
  surfaces — the boot screen, `Terminal.app`, `status.sh`, and
  `connections.sh` output — use VT323, the same pixel-terminal font
  windows93.net's terminal uses. (An earlier pass applied VT323 everywhere,
  including small icon labels, which made them illegible — that's what
  prompted this split.)

## Important correction from an earlier version of this README

An earlier pass of this build badged the cluster names (`workflows-cluster`,
`core-platform`, `field-operations`, etc.) as an "invented concept
taxonomy." **That was wrong.** Partway through this session the real
labs.zuper.co site was re-checked directly — its `/assets/js/zuper-world.js`
bundle was fetched and parsed — and all 14 cluster names, their 39 entities,
and each entity's name/type/description/details are **real, verbatim data
from Zuper's own site**, not invented. `zuper-world-data.json` in this folder
is that extracted data (regex-parsed from the real bundle, values untouched).

## What's real

- **All 14 cluster names** and their **39 entities** (name, type, category,
  one-line description, and detail bullets) — `command-center`,
  `core-platform`, `ai-intelligence`, `workflows-cluster`, `field-operations`,
  `security-compliance`, `careers`, `blog`, `customer-portal`,
  `data-pipeline`, `payment-processing`, `inventory-management`,
  `integration-hub`, `predictive-analytics`. Shown in `readme.md` (per
  folder), the `*.app`/`*.exe`/`*.sys` dashboard, and `cat readme.md` in the
  terminal — all marked with a green "real" badge.
- **The `connections.sh` data** — each cluster's real `flows` (which entity
  sends what signal type to which other entity) is the real `flows` array
  from the same source file, not invented.
- The accent color (`#ff4919`) — Zuper's brand orange.
- The two outbound links ("Open real labs.zuper.co" in the Start menu, and
  "Subscribe" in the taskbar) point at the actual `https://labs.zuper.co/`.
- The boot-screen "runtime check" lines (browser, core count, language,
  screen size) — read from the visitor's real `navigator`/`screen` APIs.

## What's concept

- **The desktop-OS shell itself** — windows, taskbar, start menu, terminal
  chrome, the `.app`/`.exe`/`.sys` file-extension convention. labs.zuper.co
  is a 3D spatial map, not a desktop OS; this is a reinterpretation of that
  real data through an OS metaphor, not a copy of the real site's UI.
- **The concept app names** (`CorePlatform.app`, `WorkflowBuilder.exe`,
  `LiveDispatch.app`, `PartsTracker.app`, `APIGateway.sys`, `ZuperAI.app`,
  `InvoicingPortal.app`, `AuditLogs.exe`, `CommandConsole.app`) — reasonable
  UI-convenience names for the dashboard windows, not confirmed real Zuper
  product names. Each dashboard is badged "Real data, concept dashboard UI."
- **`status.sh` output** — streams real entity names but simulated port
  numbers/latency; badged "Simulated output" inline.
- **Four Arcade mini-games**: Route Racer, Dispatch Tetris, Workflow Wiring,
  System Stabilizer. Illustrative analogies only (grid navigation,
  slot-fitting, trigger-to-action matching, meter-balancing) — **none
  simulate or represent Zuper's real algorithms**, stated explicitly on
  every game screen, the post-game achievement banner, and the "Skip & Read
  Summary" copy.
- **Achievement banner** after a win is local UI only — nothing scored,
  stored, or transmitted; notes a VIP-demo link as an unbuilt idea.
- **Taskbar telemetry** is decorative sine/cosine motion, not real data.

## Structure

```
zuper-web-os-react/
  index.html               React/ReactDOM/Babel-standalone/Tailwind via CDN
  app.jsx                   Boot screen, VFS window manager, folder/markdown/
                             shell/dashboard windows, 4 games, terminal, taskbar
  zuper-world-data.json     Real cluster/entity/flow data, extracted from
                             labs.zuper.co's own zuper-world.js this session
```

Each of the 14 real clusters is a desktop folder containing `readme.md`,
`status.sh`, `connections.sh`, and (where mapped) one concept app file.
`Terminal.app` supports a small VFS command set: `ls`, `cd <dir>`, `pwd`,
`cat readme.md`, `bash status.sh`, `bash connections.sh`, `whoami`, `date`,
`clear`.

## Deployment

Hosted on [Vercel](https://vercel.com/), connected directly to this repo's
`main` branch via Vercel's GitHub integration — every push to `main`
triggers a new production deployment automatically, no manual redeploy
step or CI config needed. Zero build command (static `index.html`), so
there's nothing to configure beyond pointing Vercel at the repo root.

## Running locally

```
node %TEMP%\claude\static-server-2.js <path-to-this-folder> 8748
```

Then open `http://localhost:8748/`. Requires internet access (CDN scripts +
fonts) and the bundled `zuper-world-data.json` file.
