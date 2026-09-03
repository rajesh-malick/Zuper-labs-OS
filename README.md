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
- `CRTOverlay` (the old moving scanline sweep + flicker + screen-curvature
  vignette, all layered on top of everything) was removed entirely — it
  visually darkened/shadowed open windows and the assistant, a real bug,
  not a style choice. In its place, `ScreenGlitch` brings back the
  continuous sweep + flicker motion (a first attempt at a brief/occasional
  glitch burst turned out not to be what was wanted — this is the
  always-on version instead) without the vignette, which stays removed —
  that part was disliked on its own, separately from the z-index bug.
  Parked at z-index 2, nowhere near the z:1990 that caused the original
  bug. Strictly mono accent color, no RGB channel-split.
- Icon tiles use a real glow-pulse animation (`crt-icon-glow`), not just a
  static shadow.
- Menu/list rows (Start menu, context menus, the Find/Run launcher) get a
  bright-green hover highlight and a classic `> ` selection-cursor prefix on
  hover, instead of the earlier generic white overlay.
- `Terminal.app`'s input has a green `caretColor` for an authentic blinking
  cursor.
- A large watermark (`GlitchWatermark`) is stamped behind the desktop
  icons: the real Zuper Labs logo (`assets/zuper-logo.png`, faint, ~8%
  opacity) sits behind the plain "ZUPER LABS" text, both centered on the
  same point — logo at the back, text overlaid on top, per direct
  request. Still plain and static, no animation — the screen glitching
  independently of it is deliberate: see `ScreenGlitch` above.

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

The assistant's visual identity is now the real Zuper Labs logo mark
(`assets/zuper-logo.png`) — direct request, replacing the earlier
hand-drawn CRT-terminal-robot character entirely. It sits in a small
dark device-style bezel (the same case gradient/material the old robot
head used) so it still reads as a physical desktop widget with real
depth rather than a flat pasted image, glows in the OS's own CRT accent
color, and keeps the same genuine CSS 3D idle tilt
(`perspective` + `rotateY`) the previous character had.

This assistant exists because internal feedback pushed hard for "a
Clippy-like character" — Microsoft's actual Clippy asset can't be used
regardless of internal risk-tolerance (a fixed constraint, not a
judgment call anyone here can waive; it didn't change no matter how many
times it came back up, including a standalone `Clippy.exe` Electron
build that turned out to bundle the same real character artwork under
different packaging — see below). What the pushback was actually asking
for, once talked through, was Clippy's *reactivity* — a small thing
that's always a little alive, that reacts to touch/click/idle — not its
specific likeness. That reactivity is what carried forward into this
logo-based redesign: the logo still greets, says goodbye, perks up on
hover, idle-fidgets, and pulses while thinking, exactly as the earlier
character did, just expressed as transforms/opacity/glow on the logo
image itself instead of swapping SVG sub-parts.

Earlier passes (alien-cat → humanoid → head-only golden-dog → head-only
otter → full-body otter → orange wrench → CRT-terminal-robot) were all
clipped to a small circular badge, because the `<button>` itself
visually *was* a 64x64 circle (background + border + boxShadow all
circle-shaped) — that's the actual reason only a head ever fit, and why
it kept reading as "a face inside a circular icon." The button is now
just an invisible hit-box; every visible pixel is drawn at whatever size
the design needs, with the glow as a `drop-shadow` filter (hugs the real
silhouette) instead of a `boxShadow` on the button. It docks near the
currently focused window until you manually drag it, then stays where
you put it.

**Animation states.** Classic assistant-character libraries like
`@react95/clippy` expose a named set of animations (`Wave`, `Greeting`,
`GoodBye`, `GetAttention`, `Idle*`, `Thinking`/`Processing`, ...) and are
reactive to touch, click, and idle time, not just clicks — that
interaction-design vocabulary was used as design reference (not code or
assets), reimplemented from scratch on the logo image: a scale-up pulse
on greet; a scale-down/fade dip on goodbye; a slight scale-up on hover;
an ambient ring glow around the bezel that brightens on greet, goodbye,
or right after a fresh reply; a "perk up" 3D notice on pointer-enter; a
small randomized idle fidget wobble every ~12-22s so it stays alive even
when nobody's touching it; a head-tilt while a question is being
answered; and three pulsing loading dots under the logo while thinking.
A continuous, gentle scale "breathing" pulse (`mascot-breathe`) runs at
all times, on top of every other state — direct request, after the
switch to a flat logo mark made the mascot read as a static app icon
rather than something alive; this is the one thing that's always
running, regardless of state, to keep it feeling like a living object.
The old CRT-robot's screen-content states (a hand-drawn smiley/wave/
"GOODBYE!!!" text, ambient scanline flicker, and a bright scan bar
sweeping over the screen on hover) are gone along with that character —
they were specific to its terminal-screen conceit and don't apply to a
flat logo mark; direct request removed the last of them (the hover scan
bar and the screen's ambient flicker) once they no longer made sense.
`@react95/clippy` itself was **not used** — inspecting the
published npm package confirmed it ships ~16.6MB of actual extracted
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
cue — synthesized from scratch with the Web Audio API, no sampled/
recorded clip at all, so there's nothing to license here either. The
first version was a flat oscillator pitch-glide, which read as a plain
notification "ping" rather than a character; fixed by giving each note
a fast vibrato wobble (an LFO modulating its own pitch) and playing
short multi-note runs instead of one glide — that's what actually reads
as a cute, chirpy little robot (R2-D2-style trills) instead of a UI
chime.

**Proactive nudge.** After 90s of no interaction with the assistant
while its chat panel is closed, a comic-style speech bubble pops up
next to it — direct request, since the flat logo mark can't pull
attention toward itself the way an animated character screen could.
Per a direct visual reference, it's an organic "cloud" shape (an
asymmetric blob `border-radius`, not a plain rounded rectangle) with a
thick accent-colored border, a warm off-white fill, a faint halftone-
dot texture, and a pointed tail aimed down at the mascot — a pop-art
speech-bubble look, not the OS's usual sharp CRT chrome. Its wording is
deliberately casual/talked-out-loud ("hey, know how many clusters
there are? wanna know!") rather than the plain question text the chat
panel's own suggestion chips use — both a chatty label and the real
underlying question are defined together per entry (`nudgeSuggestions`
in app.jsx), so the bubble can sound conversational while still asking
the assistant something real underneath. It auto-hides itself after
~9s either way, and any hover, click, or drag resets the idle clock, so
it shows at most once per idle stretch rather than repeatedly nagging.
Clicking the bubble opens the chat panel and immediately asks that
underlying question.

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

The first crop pass left each PNG with its source sheet's own white
card background and a lot of dead padding around the actual glyph, so
inside the tile it read as a small floating picture instead of a
compact icon. Fixed by chroma-keying the near-white background to real
alpha transparency, auto-cropping tight to the remaining artwork's
bounding box, and re-centering on a square canvas — `IconImg` also
renders PNG icons at 88% of the tile now (up from 66%, which was tuned
for the vector icons' own internal padding, not these).

That first fixed-percentage crop then turned out to clip real artwork
on several icons (a pipe, a location pin, connector dots, card corners)
before the transparency pass ever ran, since it cut into the source
sheet's cell before anything else happened — there was nothing left to
recover afterward. Fixed with a two-stage re-crop: stage 1 takes the
full, generous cell (no side insets, just the top ~60-70% to exclude
the baked-in label text — row 3's smaller cells needed a tighter 60%
than rows 1-2's 70%), guaranteeing nothing is clipped; stage 2 is the
same chroma-key/auto-crop/re-center pass as before, now with the full
artwork actually available to crop tight to.

Desktop icons also dropped the bordered/background square tile
(`iconTileVisuals`, removed) that used to sit behind every icon —
direct feedback that it read as "a window/frame around the icon,"
rather than just an icon. `DesktopIcon` now renders the bare icon
image plus its own green `crt-icon-glow` drop-shadow, with the label
underneath — no card, no border, no bevel box.

**Second update:** the full-color pixel-art PNG set above was replaced
entirely by a fresh, hand-drawn minimalist single-stroke line-icon set
(`MINIMAL_ICON_SHAPES`/`MinimalIcon` in app.jsx), per direct reference —
PostHog's own app-launcher icons (plain single-color outlines, no fill,
no detail, generous whitespace). This isn't a simplification of the PNG
set, it's a different rendering philosophy entirely: a new shape library
(one bespoke 24x24 outline per cluster — a broadcast beacon for
Command Center, stacked layers for Core Platform, a sparkle for AI
Intelligence, a map pin for Field Operations, and so on) drawn as plain
flat SVG (`fill="none"`, thin uniform stroke, round joins) with no
canvas rasterization, no embossed shadow/highlight passes, and no
pixelation — the deliberate opposite of `PixelIcon`'s chunky retro
treatment. The 16 PNGs and the AI-generated reference sheet crop are
gone from the repo (`icons/` removed); `ENTITY_ICONS` still uses the
original embossed vintage/PixelIcon system unchanged, since this
change was scoped to desktop/app icons specifically, not the
entity-type badges inside cluster detail windows.

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
- **Platform-wide typography**: every piece of UI text — window titles,
  desktop icon labels, badges, the taskbar, body copy, and the terminal —
  now uses [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (OFL
  licensed, freely usable), per direct reference. The one deliberate
  exception is the "ZUPER LABS" background watermark (`GlitchWatermark`
  in app.jsx), which keeps its own VT323 treatment. This replaced an
  earlier two-tier split (Inconsolata for chrome, VT323 for genuine
  terminal/shell surfaces) that itself replaced an even earlier pass
  where VT323 was applied everywhere, including small icon labels, which
  made them illegible.
  - **Type scale**: a follow-up pass tightened every text size/weight to
    a dense-desktop-OS scale, per a direct spec — `--text-xs` (10px)
    through `--text-xl` (20px) as CSS vars in `index.html`, applied per
    element category throughout app.jsx: desktop icon labels and window
    titles at 13px/600, terminal text at 14px/500, system labels/status
    (taskbar clock, badges) at 10-11px/500-600, buttons at 12-13px/600,
    small metadata/footnotes at 10px/500, dialog headings at 16-18px/700,
    dialog body at 13-14px/500-600. The boot screen keeps its own larger
    20px display size — a one-time full-screen splash, not part of the
    dense desktop chrome this scale targets.

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
- The "Subscribe" link in the taskbar opens the **real** Ghost member-
  signup modal for labs.zuper.co, in place — not a copy of it, and not
  just a link that navigates away (direct correction after it was a
  plain outbound link). It's Ghost's actual "Portal" widget, embedded
  with the exact same script and site key labs.zuper.co's own page uses
  (see `index.html`); clicking Subscribe really does sign the visitor up
  on the real site, via `openGhostSignup` in app.jsx, which reaches into
  Portal's own iframe and clicks its real internal trigger directly —
  needed because Portal wires up `[data-portal]` elements by scanning
  the DOM once at its own script-init time, before this app's own
  React-rendered Subscribe link exists yet, so Portal's usual
  auto-wiring never sees it. Its own default floating trigger button is
  hidden (cosmetic) and, separately, kept from swallowing real clicks
  aimed at the taskbar (the actual bug in an earlier version of this
  fix): while collapsed it sits at fixed bottom-right with a very high
  z-index, right on top of the taskbar's own Subscribe link, so
  `index.html` toggles `pointer-events` on that iframe off while
  collapsed and on once the modal is actually open — watching
  `#ghost-portal-root` itself for the iframe being swapped for a new
  element (which Portal does at least once during its own startup on a
  slower connection), not just the first one found, since attaching the
  fix once to an iframe that later gets replaced silently stops working.
  href/target stay as
  a fallback if the embed script hasn't loaded. (The redundant "Open
  real labs.zuper.co" links that used to sit in the Start menu and the
  desktop right-click menu were removed earlier, per a separate direct
  request — Subscribe already covers that.)
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
- **Seven Arcade mini-games**: Route Racer, Dispatch Tetris, Workflow Wiring,
  System Stabilizer, Pipe Flow, Spinning Plates, Fraud or Fine?. Illustrative
  analogies only (grid navigation, slot-fitting, trigger-to-action matching,
  meter-balancing, rotate-the-pipe, real-time attention-splitting,
  judgment-under-uncertainty) — **none simulate or represent Zuper's real
  algorithms**, stated explicitly on every game screen, the post-game
  achievement banner, and the "Skip & Read Summary" copy. Restyled to match
  the mono-CRT look: the old orange brand accent and red/yellow/blue state
  colors (invalid moves, warning meters, visited markers) are gone, replaced
  by brightness/fill variation within the same green — e.g. an invalid
  Dispatch Tetris slot flashes to a solid green "invert" instead of turning
  red, and the three newer games' critical/miss states use a bright
  near-white-green pulse (`#eafff0`, the same value System Stabilizer
  already used for unsafe meters) rather than red, matching how a real
  green-phosphor terminal signals an error. Same bevel-textured
  buttons/panels as the rest of the OS chrome.
  - **The three newer games add real scoring/juice** on top of that:
    a per-game best score kept in this browser's `localStorage`
    (`loadHighScore`/`saveHighScore` in app.jsx), a letter grade (S/A/B/C)
    on the end-of-run summary, floating "+N"/"MISS" pop-up feedback
    (`FloatPops`), a screen-shake on failure, and distinct square/sawtooth
    "8-bit" success/fail sound cues (`playArcadeSuccessSound`/
    `playArcadeFailSound`) — synthesized the same way as the assistant's
    sounds (Web Audio only, nothing sampled) but flatter/punchier, on
    purpose, to feel distinct from the assistant's cute vibrato chirps.
    Pipe Flow (`data-pipeline`) is a rotate-the-segment puzzle that grows
    each level; Spinning Plates (`command-center`) is a real-time
    attention-splitting survival game where pinging a gauge already in its
    critical zone is a bonus "save"; Fraud or Fine? (`payment-processing`)
    is a fast approve/flag judgment call where a few transactions are
    deliberately legit-but-unusual, baiting an over-eager flag.
- **Achievement banner** after a win is local UI only — nothing scored,
  stored, or transmitted anywhere off this browser; any high score shown
  lives in `localStorage` only. Notes a VIP-demo link as an unbuilt idea.

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
