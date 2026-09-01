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
- A large, faint "ZUPER LABS" watermark (`GlitchWatermark`) is stamped
  behind the desktop icons. Its glitch burst is timed to the same 7s period
  as the scanline sweep, peaking right as the sweep band crosses the
  screen's vertical center — the watermark visibly glitches "when the
  light touches it" — plus a second, shorter independent cycle for extra
  ambient glitchiness in between. Strictly mono green/black; no RGB
  channel-split, to stay consistent with the mono-CRT-only rule.

### Bevel texture (technique borrowed from 1j01/os-gui, recolored)

Flat 1px borders on window frames, menus, the taskbar, and buttons were
replaced with a genuine raised/sunken **bevel** — a two-tone light
(top-left) / dark (bottom-right) box-shadow edge, the classic Win9x "3D
button" technique. This is a re-implementation of the *technique* used by
[1j01/os-gui](https://github.com/1j01/os-gui)'s `.inset-deep`/`.outset-deep`
utility classes (MIT licensed) — written here as original CSS
(`bevel()` in app.jsx) in our own CRT green/black palette, not that
library's actual code, its Windows-98 gray/blue skin, or its jQuery-based
window engine (which would have meant a second, competing window manager —
out of scope; this app keeps its own hand-built one). Applied to: window
frames and title-bar buttons, the Start menu and context menus, the
taskbar and its Start/running-app buttons (a focused taskbar button now
looks genuinely *pressed*, sunken rather than just recolored), the
assistant's chat input (sunken) and buttons, and the scrollbar thumb/track.

## Desktop assistant

An original CRT-terminal-robot mascot — a monitor head on tank treads
with a real CRT silhouette (a thick bottom control-panel "chin" with
two dummy buttons and the power LED, corner screws, and a diagonal
glass-glare highlight on the curved screen, instead of reading as a
plain rectangle), its screen glowing in the OS's own CRT accent color
with a pixel-block smiley and a blinking `>_` cursor, plus a small
power-LED in Zuper's real brand orange (`#ff4919`) as the one
brand-color touch (own hand-drawn SVG design, own proportions and
colors).

This design exists because internal feedback pushed hard for "a
Clippy-like character" — Microsoft's actual Clippy asset can't be used
regardless of internal risk-tolerance (that's a fixed constraint, not a
judgment call anyone here can waive, and it didn't change no matter how
many times it came back up, including a standalone `Clippy.exe`
Electron build that turned out to bundle the same real character
artwork under a different packaging). What the pushback was actually
asking for, once we talked it through, was Clippy's *reactivity* — a
small object with a face that's always a little alive, that reacts to
touch/click/idle — not its specific likeness. A retro CRT terminal on
treads gets there as a genuinely original character, and it has a bonus
the earlier orange-wrench design didn't: it's built entirely from the
OS's own mono-CRT visual language (phosphor glow, scanlines, terminal
cursor), so it actually ties into the rest of the desktop instead of
just standing next to it. The concept direction (not the specific
character) came from a reference screenshot the user shared of a
different retro-CRT-robot design — used purely for style/vibe, not
traced, with no names or branding carried over.

Earlier passes (alien-cat → humanoid → head-only golden-dog → head-only
otter → full-body otter → orange wrench) were all clipped to a small circular badge, because the `<button>`
itself visually *was* a 64x64 circle (background + border + boxShadow all
circle-shaped) — that's the actual reason only a head ever fit, and why
it kept reading as "a face inside a circular icon." The button is now
just an invisible hit-box; every visible pixel is drawn by the SVG at
whatever size the full figure needs, and the glow is a `drop-shadow`
filter on the SVG (hugs the real silhouette) instead of a `boxShadow` on
the button. The whole SVG also gets a genuine CSS 3D transform
(`perspective` + `rotateY` — real 3D, not just gradient shading) as an
idle animation, for visible dimensionality without the cost of a full
WebGL rewrite (the Three.js attempt at real 3D for the whole Zuper Quest
town, in the sibling side project, got reverted for being too big a
swing — this is the lighter-weight version of that idea, scoped to one
character). It docks near the currently focused window until you
manually drag it, then stays where you put it.

**Animation states.** Classic assistant-character libraries like
`@react95/clippy` expose a named set of animations (`Wave`, `Greeting`,
`GoodBye`, `GetAttention`, `Idle*`, `Thinking`/`Processing`, ...) and are
reactive to touch, click, and idle time, not just clicks — that
interaction-design vocabulary was used as design reference (not code or
assets), reimplemented from scratch as CSS/SVG transforms on this
original character: an idle eye-blink; a real hard-cut terminal cursor
blink (`>_`, distinct from the eye-blink's soft squash, and always
visible in the screen's corner regardless of state); ambient CRT
scanline flicker; a tread-rock wave on opening the panel and a wave
goodbye on closing it; a tread-rock right after a fresh reply; a
hover-notice "perk up" on pointer-enter; a small randomized idle fidget
(a head glance) every ~12-22s so the character stays alive even when
nobody's touching it; and a head-tilt while a question is being
answered. The **screen's own content swaps per state**, on top of all of
that — a small pixel-block hand waving on greet (`Wave`/`Greeting`);
"GOODBYE!!!" rendered in the VT323 terminal font on close (`GoodBye`); a
bright scan-bar sweeping down the screen as a "glitch" cue on hover
(`GetAttention`); three pulsing loading dots while thinking
(`Processing`); and the default pixel-block smiley otherwise.
`@react95/clippy` itself was **not used** — inspecting
the published npm package confirmed it ships ~16.6MB of actual extracted
Microsoft Office character sprites/sounds (Clippy, Merlin, Bonzi, Rover,
etc.), with upstream docs stating outright those assets "remain property
of Microsoft." Same reasoning as rejecting `@react95/icons` earlier, as
rejecting `felixrieseberg/clippy` (its own `LICENSE.md` admits the
bundled Clippy spritesheet has no real grant, only a self-asserted
fair-use claim) when it came up again later, and as rejecting a
standalone `Clippy.exe` Electron build inspected still later — its
`app.asar` bundled the same character as individual named PNG frames
(`Greeting`, `GoodBye`, `GetAttention`, `Idle1_1`, etc.) instead of a
sprite sheet, same underlying asset, same answer.

**Sound effects.** Greet, goodbye, and hover each have a matching sound
cue — synthesized from scratch with the Web Audio API (an oscillator
pitch-glide through a gain envelope, no sampled/recorded clip at all, so
there's nothing to license here either), tuned as soft sine/triangle
tones for a cute, curious-little-robot character rather than harsh
alarm beeps.

Click it to open a small chat panel: type any question and it tries a real
Claude model first, falling back to deterministic local keyword search over
`zuper-world-data.json` if Claude isn't configured or the call fails.
Suggested-question chips and a "give me a tip" fallback (the old canned
usage tips) are included. Every answer is tagged with where it actually
came from — "via Claude" or "local search" — so it's never ambiguous which
one answered.

**Backend:** `api/ask.js` is a small Vercel serverless function — the only
backend component in this otherwise fully static project. It holds the
Anthropic API key server-side (an environment variable, never shipped to
the browser) and forwards the question plus the real cluster/entity/flow
data as context, instructing the model to answer only from that real data.
To enable it:
1. Create an Anthropic API key at [console.anthropic.com](https://console.anthropic.com/).
2. In the Vercel project's Settings → Environment Variables, add
   `ANTHROPIC_API_KEY` with that value, then redeploy.
3. **Set a spend limit on the Anthropic account.** This endpoint is public
   once deployed — anyone on the live site can trigger a Claude call. A
   client-side session cap (`LLM_SESSION_LIMIT` in app.jsx, currently 30
   calls per browser tab) guards against one runaway tab, but it is *not*
   real abuse protection (no server-side per-IP rate limiting) — treat the
   Anthropic account's own spend limit as the real safety net.

Without the key configured (e.g. running the plain static file server
locally, or before the env var is set on Vercel), `/api/ask` 404s or
returns 503 and the assistant transparently falls back to local search —
the app never breaks, it just answers from the local data instead.

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

**Update:** the 16 cluster/app desktop icons (`command-center`,
`customer-portal`, `core-platform`, `data-pipeline`, `ai-intelligence`,
`payment-processing`, `workflows-cluster`, `inventory-management`,
`field-operations`, `integration-hub`, `careers`, `blog`,
`security-compliance`, `zuper-arcade`, `terminal`, `predictive-analytics`)
now render as full-color pixel-art PNGs (`icons/*.png`) instead of the
mono-CRT vector glyphs above — a user-supplied, AI-generated reference
sheet made specifically for this project's own 16 cluster names (each
labeled and branded with Zuper's "Z", not sourced from any existing icon
pack or franchise), cropped and downscaled per-icon into this folder. The
`vintage()`/`IconImg`/`PixelIcon` system stays in place underneath as the
fallback path — `ENTITY_ICONS` (used inside cluster detail views, not on
the desktop) still renders the original mono pixel-art vectors, and any
future cluster added without matching PNG art automatically falls back to
the vector/emoji chain the same way it always did.

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
  Summary" copy. Restyled to match the mono-CRT look: the old orange brand
  accent and red/yellow/blue state colors (invalid moves, warning meters,
  visited markers) are gone, replaced by brightness/fill variation within
  the same green — e.g. an invalid Dispatch Tetris slot flashes to a solid
  green "invert" instead of turning red, matching how a real green-phosphor
  terminal signals an error. Same bevel-textured buttons/panels as the rest
  of the OS chrome.
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
  api/ask.js                Vercel serverless function — Claude proxy for the
                             desktop assistant (the only backend component)
```

Each of the 14 real clusters is a desktop folder containing `readme.md`,
`status.sh`, `connections.sh`, and (where mapped) one concept app file.
`Terminal.app` supports a small VFS command set: `ls`, `cd <dir>`, `pwd`,
`cat readme.md`, `bash status.sh`, `bash connections.sh`, `whoami`, `date`,
`clear`.

**Clicking a cluster icon opens `Terminal.app` cd'd straight into that
cluster** (instead of directly opening a folder window). From there, `ls`
pops open a window/card showing that cluster's actual files — the same
folder view as before, just reached through the shell instead of a direct
double-click. `cd ..` (or `cd` with no argument) returns to `/desktop`.
However it's opened — a cluster icon, the `Terminal.app` icon itself, or
reopening it from the taskbar — the window re-centers on the stage every
time, rather than sitting wherever it was last left. The prompt itself
also behaves like a real terminal now: there's no separate input box below
a divider with a "type 'help'" placeholder hint — the live prompt is just
the last line of the same scrolling log, auto-focused, exactly the way
`cmd.exe` or a real shell works.

## Deployment

Hosted on [Vercel](https://vercel.com/), connected directly to this repo's
`main` branch via Vercel's GitHub integration — every push to `main`
triggers a new production deployment automatically, no manual redeploy
step or CI config needed. Zero build command (static `index.html`), so
there's nothing to configure beyond pointing Vercel at the repo root.
The one exception is `api/ask.js` — Vercel auto-detects it as a serverless
function with zero extra config, but it needs `ANTHROPIC_API_KEY` set in
the project's environment variables to actually call Claude (see Desktop
assistant above).

## Running locally

```
node %TEMP%\claude\static-server-2.js <path-to-this-folder> 8748
```

Then open `http://localhost:8748/`. Requires internet access (CDN scripts +
fonts) and the bundled `zuper-world-data.json` file.
