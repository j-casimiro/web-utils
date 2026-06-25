# ASCII Shader Sandbox

A real-time, GPU-accelerated **ASCII art generator**. Procedural and simulated
visuals are rendered with WebGL, then resampled onto a grid of monospace glyphs
so the output always reads as terminal-style text art. Every effect shares one
control panel (glyph ramp, character size, speed, brightness, color theme, CRT
overlay) and can be exported as text, styled HTML, or a PNG.

This document is the reference for spinning the sandbox out into a **standalone
app**.

---

## Table of contents

- [How it works](#how-it-works)
- [Shader catalog](#shader-catalog)
- [Controls](#controls)
- [Color themes](#color-themes)
- [Presets](#presets)
- [Exports](#exports)
- [Screensaver mode](#screensaver-mode)
- [Architecture](#architecture)
- [Extracting into a standalone app](#extracting-into-a-standalone-app)
- [Adding a new shader](#adding-a-new-shader)
- [Roadmap ideas](#roadmap-ideas)

---

## How it works

The core idea is the same across every shader:

1. A fragment shader computes a scalar **intensity** `val ∈ [0, 1]` for each
   cell of a character grid (`gl_FragCoord.xy / u_grid_size`).
2. `val` indexes into a **font atlas** — a texture strip containing every glyph
   in the active ramp, rendered once on a 2D canvas. Brighter cells pick denser
   glyphs (`' .,:;+*?%S#@'` goes from empty space to solid `@`).
3. The chosen glyph is tinted by the **color theme** and composited over the
   theme background.

Two of the effects (Gargantua, Turing) are heavy enough or stateful enough that
they live in their own components with their own WebGL context, but they emit
the exact same glyph-grid output and accept the same control props, so they feel
identical to the user.

---

## Shader catalog

Seven effects, selected by the **Shader Algorithm** switch. `mode` is the
internal index.

| # | Name | Technique | Notes |
|---|------|-----------|-------|
| 0 | **fBm Noise** | Fractal Brownian motion (4-octave value noise) | Slowly drifting organic clouds. Honors **Scale**. |
| 1 | **Sine Plasma** | Summed sine waves (classic demoscene plasma) | Smooth interfering ripples. Honors **Scale**. |
| 2 | **Matrix Rain** | Per-column falling-head generator | Digital rain; randomized column speeds + bright leading glyph. |
| 3 | **Image Mode** | Samples an uploaded image texture | Converts any image to ASCII; optional original-color passthrough. |
| 4 | **Galaxy** | Logarithmic-spiral galaxy model | Andromeda-style: volumetric core, 2 spiral arms, dust, halo. Honors **Scale**. |
| 5 | **Gargantua Black Hole** | Schwarzschild null-geodesic ray tracer | Gravitational lensing wraps the accretion disk over/under the shadow; Keplerian rotation + Doppler beaming. *Separate component.* |
| 6 | **Turing Patterns** | Gray-Scott reaction-diffusion | Ping-pong float-buffer simulation; grows an evolving coral/labyrinth. *Separate component, WebGL2.* |

### Effect details

**fBm Noise (0)** — `fbm()` sums four octaves of rotated value noise scrolling
on the Y axis. `Scale` sets zoom; `Speed` sets drift rate.

**Sine Plasma (1)** — Three sine terms (x, y, radial) averaged into `[0,1]`.
Cheap, smooth, hypnotic.

**Matrix Rain (2)** — `matrixRain()` treats each grid column independently:
a "head" falls at a hashed per-column speed, trailing a 20-cell fade, with
occasional full-bright glitch cells. Ignores Scale.

**Image Mode (3)** — Uploads an image to a texture, samples per cell, and uses
luminance as `val`. Toggle **Use colors** to keep the source pixel color
instead of the theme tint.

**Galaxy (4)** — `galaxy()` builds a tilted disk: a volumetric exponential
core, two logarithmic-spiral arms with differential rotation, FBM dust, and an
ambient star field. Has its own white-core → gold → red palette when not in
solid mode.

**Gargantua Black Hole (5)** — Integrates the Schwarzschild photon geodesic
(`accel = -1.5·h²·pos / r⁵`) so light bends near the photon sphere and the far
side of the accretion disk wraps above and below the event-horizon shadow. The
disk is sampled at exact equatorial-plane crossings (infinitely thin), with a
Keplerian rotation profile, Doppler beaming (bright-white approaching side, dim
red receding side), and a lensed background starfield. Lives in
`blackhole-shader.tsx`.

**Turing Patterns (6)** — A Gray-Scott reaction-diffusion simulation. Two
chemical concentrations (A, B) are stored in an `RGBA32F` texture and stepped
~14 times per frame using ping-pong framebuffers; the display pass maps
chemical B onto the glyph ramp. Default `FEED 0.0545 / KILL 0.062` ("coral")
grows to fill the field with a slowly-evolving labyrinth. Lives in
`turing-shader.tsx`. Requires **WebGL2** + `EXT_color_buffer_float`.

---

## Controls

All controls live in the right-hand sidebar and apply live.

| Control | Range / values | Applies to |
|---------|----------------|------------|
| **Shader Algorithm** | 7 modes (above) | — |
| **Source Image** (upload) | any image; "Use colors" toggle | Mode 3 only |
| **Character size** | width 5–24 px, height 8–36 px | All |
| **Glyph Ramp** | any string, ordered dark→light; quick presets included | All |
| **Noise Zoom / Scale** | 0.5–12.0 | Modes 0, 1, 4 only (hidden for 2, 3, 5, 6) |
| **Animation Speed** | 0.0–4.0× | All (drives sim step count for mode 6) |
| **Brightness Gain** | 0.2–2.0 | All |
| **CRT Scanlines** | on/off | All (CSS overlay) |
| **Color Theme** | 8 themes (below) | All |

The glyph ramp ships with quick-pick sets: `' .:-=+*#%@'`, `' ░▒▓█'`, `' 01'`,
`'█'`, `' .xX*#@'`.

---

## Color themes

`COLOR_THEMES` — each defines a background, a solid color, a gradient pair, and
a `mode` that selects how the shader colorizes intensity (0 = solid, 1 =
vertical gradient, 2 = multivalue heat ramp, 3 = matrix green).

| Theme | Background | Accent | Color mode |
|-------|-----------|--------|-----------|
| Matrix Neon | `#000000` | `#00ff33` | 3 (matrix) |
| Amber CRT *(default)* | `#0b0600` | `#ffb000` | 0 (solid) |
| Cyberpunk Flame | `#0e0012` | `#ff0055` | 1 (gradient) |
| Ocean Currents | `#000914` | `#0088ff` | 1 (gradient) |
| Volcanic Glow | `#0a0100` | `#ff3300` | 2 (multivalue) |
| Classic B&W | `#000000` | `#ffffff` | 0 (solid) |
| Terminal Green | `#000801` | `#33ff33` | 0 (solid) |
| Paper Print (Light) | `#f4f4f6` | `#1b1b22` | 0 (solid) |

---

## Presets

One-click `PRESETS` bundle a mode + ramp + sizing + speed + brightness + theme +
CRT. Selecting a shader from the switch auto-applies its matching preset.

| Preset | Mode | Theme | Vibe |
|--------|------|-------|------|
| Gargantua Black Hole | 5 | Volcanic Glow | Lensed accretion disk |
| Andromeda Galaxy | 4 | Ocean Currents | Spiral galaxy |
| Matrix Digital Rain | 2 | Matrix Neon | Falling code |
| Amber Terminal Flow | 0 | Amber CRT | Retro noise drift |
| Ocean Plasma Waves | 1 | Ocean Currents | Calm plasma |
| Volcanic Clouds | 0 | Volcanic Glow | Block-shaded smoke |
| Sleek Cyber Matrix | 1 | Cyberpunk Flame | Fast neon plasma |
| Turing Patterns | 6 | Amber CRT | Reaction-diffusion coral |

---

## Exports

Three export actions in the sidebar:

- **Copy Text Art** — plain-text snapshot of the current frame.
- **Copy Styled HTML Embed** — a `<pre>` block with the theme colors baked in,
  ready to paste into a page.
- **Download PNG Image** — saves the current canvas as a PNG.

For the JS-modeled effects (0, 1, 2, 4) the text snapshot is regenerated on the
CPU. For the GPU-only effects (**5 Gargantua, 6 Turing**) there is no
closed-form CPU model, so the snapshot is produced by **reading back the
rendered framebuffer**: the canvas is downscaled to one pixel per glyph cell and
luminance is mapped onto the ramp. (Image mode's text snapshot is the one known
gap — it currently falls back to noise.)

> **Standalone note:** framebuffer readback requires the WebGL context to be
> created with `preserveDrawingBuffer: true`, which all three contexts already
> set.

---

## Screensaver mode

Any effect can go fullscreen as a screensaver (button top-right). It covers the
viewport (`fixed inset-0 z-50`) and exits on any key press or mouse click. The
separate-component effects (5, 6) accept `isParentScreensaver` /
`onExitParentScreensaver` so the parent stays the single source of truth.

---

## Architecture

```
AsciiShader  (ascii-shader.tsx)         ← container + shared control panel
├── WebGL1 context + FRAGMENT_SHADER_SOURCE   → modes 0–4 (u_mode switch)
├── <BlackholeShader>  (blackhole-shader.tsx) → mode 5  (own WebGL1 context)
└── <TuringShader>     (turing-shader.tsx)    → mode 6  (own WebGL2 context)
```

**Shared rendering recipe** (every effect):
- Full-screen quad, single `position` attribute.
- A font-atlas texture rebuilt whenever the ramp or character size changes
  (`buildFontAtlas`): glyphs drawn on a 2D canvas, uploaded as a `LUMINANCE`
  texture, sampled with `NEAREST`.
- Per-frame uniforms for resolution, grid size, char count, speed, brightness,
  and the five color-theme values.
- Props are mirrored into refs so the render loop reads live values without
  re-subscribing.

**Why three contexts:**
- Modes 0–4 are stateless single-pass shaders → one shared program with a
  `u_mode` integer switch.
- Gargantua is a heavy per-pixel ray-marcher → isolated for clarity/perf.
- Turing is **stateful** (each frame depends on the last) → needs ping-pong
  framebuffers and float textures, which only fit cleanly in their own WebGL2
  context.

**Key files**

| File | Responsibility |
|------|----------------|
| `src/components/tools/ascii-shader.tsx` | Container, control panel, modes 0–4, themes, presets, exports |
| `src/components/tools/blackhole-shader.tsx` | Mode 5 (Gargantua) |
| `src/components/tools/turing-shader.tsx` | Mode 6 (Turing) |

**Shared prop contract** for separate-component effects:

```ts
interface ShaderProps {
  chars?: string;
  charWidth?: number;
  charHeight?: number;
  speed?: number;
  brightness?: number;
  crt?: boolean;
  colorMode?: number;        // 0 solid | 1 gradient | 2 multivalue | 3 matrix
  colorSolid?: string;       // hex
  colorGradStart?: string;   // hex
  colorGradEnd?: string;     // hex
  colorBg?: string;          // hex
  isParentScreensaver?: boolean;
  onExitParentScreensaver?: () => void;
  externalCanvasRef?: React.RefObject<HTMLCanvasElement | null>; // for exports
}
```

---

## Extracting into a standalone app

The sandbox is self-contained and pulls in very little. To lift it out:

**Files to copy**
- `src/components/tools/ascii-shader.tsx`
- `src/components/tools/blackhole-shader.tsx`
- `src/components/tools/turing-shader.tsx`
- The shadcn UI primitives it imports: `@/components/ui/button`,
  `@/components/ui/card`, `@/components/ui/input` (+ their `cn` util).

**Dependencies actually used** (from the current `package.json`)
- `react`, `react-dom` (v19)
- `lucide-react` (icons)
- `radix-ui` + `class-variance-authority` + `clsx` + `tailwind-merge`
  (only via the shadcn Button/Card/Input)
- `tailwindcss` v4 (+ `@tailwindcss/vite`) for styling

No external shader, math, or WebGL libraries — everything is hand-written GLSL.

**Decoupling work**
1. `AsciiShader` takes no props and manages all state internally, so it drops
   into any page as `<AsciiShader />`.
2. Replace the `@/` path alias or keep it (Vite `resolve.alias`).
3. If you want to shed shadcn/Radix entirely, the only primitives used are a
   button, a card container, and a file/text input — trivial to reimplement.
4. Layout hooks in the host (`src/App.tsx`) widen the tool to full width
   (`noCard`, `max-w-none`) — replicate that so the canvas gets room.

**Browser support**
- Modes 0–5: WebGL1.
- Mode 6 (Turing): WebGL2 + `EXT_color_buffer_float`. Gate it behind a
  capability check and hide the option if unsupported.

---

## Adding a new shader

**Single-pass, stateless effect** (cheapest path):
1. Add a branch to `FRAGMENT_SHADER_SOURCE` under a new `u_mode` value that
   writes `val`.
2. Extend the `mode` union type, the **Shader Algorithm** button array (and the
   grid column count), and the info-badge label.
3. Optionally add a CPU model in `getSnapshotText()` for text export, plus a
   preset and `modePresets` entry.

**Heavy or stateful effect** (like Gargantua / Turing):
1. Create a new component mirroring `turing-shader.tsx`'s shell (screensaver
   logic, ref-synced props, font atlas, `externalCanvasRef`).
2. Render it from the container's mode switch.
3. Wire exports to treat its mode as "self-rendered" (framebuffer readback) and
   hide the **Scale** slider for it.

---

## Roadmap ideas

Effects that would fit the same glyph-grid pipeline:

- **Tunnel / Wormhole** — radial UV warp with scrolling rings (great companion
  to Gargantua).
- **Voronoi / Cellular** — animated cells, "data crystal" look.
- **Curl-noise flow field** — smoky directional streaks.
- **Mandelbrot / Julia zoom** — infinite fractal dive.
- **Starfield warp** — hyperspace streaks (cheap crowd-pleaser).
- **Audio-reactive** — drive brightness/scale from a mic `AnalyserNode`.

Turing variants worth exposing as presets via the `FEED`/`KILL` constants:
mitosis (`0.0367 / 0.0649`), worms/maze (`0.046 / 0.063`), waves (`0.014 /
0.054`).
