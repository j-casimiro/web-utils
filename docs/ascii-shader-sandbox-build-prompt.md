# Build Prompt — ASCII Shader Sandbox (Standalone App)

A copy-paste **prompt** for an AI coding agent (or a human) to build **ASCII
Shader Sandbox** as a standalone web app from scratch. It is distilled from the
existing [`ascii-shader-sandbox.md`](./ascii-shader-sandbox.md) feature
reference, the [`ascii-renderer-architecture.md`](./ascii-renderer-architecture.md)
rendering deep-dive, and the [`theming-style-guide.md`](./theming-style-guide.md)
visual system — but it is **self-contained**: nothing here assumes access to the
original repository.

Hand the agent everything from [The prompt](#the-prompt) onward.

---

## How to use this document

- Paste the entire [The prompt](#the-prompt) section into your coding agent as
  the initial instruction, or give it to a developer as a spec.
- The prompt is **greenfield** — it builds a new repo, it does not extract from
  an existing one. (If you instead want to lift the tool out of the current
  monorepo, follow "Extracting into a standalone app" in
  [`ascii-shader-sandbox.md`](./ascii-shader-sandbox.md) instead.)
- Sections after the prompt ([Acceptance checklist](#acceptance-checklist),
  [Build phases](#suggested-build-order)) are for *you* to verify the result.

---

## The prompt

> **Role.** You are building a standalone, single-page web app called **ASCII
> Shader Sandbox**: a real-time, GPU-accelerated ASCII-art generator. Procedural
> and simulated visuals are rendered with WebGL, then resampled onto a grid of
> monospace glyphs so the output always reads as terminal-style text art.
>
> Build it as a polished, self-contained product. Favor correctness, a tight
> visual identity, and live interactivity over feature sprawl.

### Tech stack (use exactly this)

- **React 19 + TypeScript + Vite.**
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.*`; declare
  theme tokens inline in `src/index.css` with `@theme inline`).
- **shadcn/ui** primitives over **Radix**, with `class-variance-authority`,
  `clsx`, and `tailwind-merge` (provide a `cn()` helper in `src/lib/utils.ts`).
- **lucide-react** for icons.
- **Hand-written GLSL only** — no shader/math/WebGL helper libraries.
- Set up the `@/` path alias in Vite so imports like `@/components/ui/button`
  resolve to `src/`.

### The core rendering idea (do not deviate)

Every effect funnels into one identical back end:

1. A fragment shader computes a single scalar **intensity** `val ∈ [0,1]` **once
   per character cell**, evaluated **at the cell center** — not per pixel and
   not area-averaged.
2. `val` is multiplied by brightness, then **quantized** to an integer glyph
   index: `charIdx = clamp(floor(val * charCount), 0, charCount - 1)`.
3. `charIdx` selects a glyph from a **pre-baked font-atlas texture** (a
   horizontal strip of every ramp glyph). The glyph's own bitmap is sampled at
   the **sub-cell** position — this is the only per-pixel detail.
4. The lit glyph is tinted by the active **color theme** and composited over the
   theme background: `gl_FragColor = mix(bg, color, charIntensity)`.

The canonical fragment `main()` to implement (shared modes):

```glsl
void main() {
  vec2 gridCoords  = floor(gl_FragCoord.xy / u_grid_size);   // which cell
  vec2 localCoords = fract(gl_FragCoord.xy / u_grid_size);   // where in the cell (0..1)
  vec2 uv          = (gridCoords + 0.5) * u_grid_size / u_resolution; // cell CENTER

  float val = /* effect-specific intensity at uv, branched on u_mode */;
  val *= u_brightness;

  float charIdx = clamp(floor(val * u_char_count), 0.0, u_char_count - 1.0);
  vec2  fontUv  = vec2((charIdx + localCoords.x) / u_char_count, localCoords.y);
  float charIntensity = texture2D(u_font_atlas, fontUv).r;   // glyph coverage

  vec3 color = getColor(val, uv);                            // theme tint
  gl_FragColor = vec4(mix(u_color_bg, color, charIntensity), 1.0);
}
```

**Font atlas** (`buildFontAtlas`): an off-screen 2D canvas
`(charWidth * rampLength) × charHeight`, filled black; each glyph drawn in white
bold monospace, centered in its cell. Upload as a `LUMINANCE` texture with
`NEAREST` filtering and `CLAMP_TO_EDGE` so glyph edges stay crisp. **Rebuild
only when the ramp or character size changes — never per frame.**

**Create every WebGL context with `preserveDrawingBuffer: true`** so the text /
PNG exports can read back the framebuffer.

### Architecture (three contexts, one output)

```
AsciiShader  (src/components/ascii-shader.tsx)   ← container + shared control panel
├── WebGL1 context + one fragment shader          → modes 0–4 (u_mode integer switch)
├── <BlackholeShader> (blackhole-shader.tsx)      → mode 5  (own WebGL1 context)
└── <TuringShader>    (turing-shader.tsx)         → mode 6  (own WebGL2 context)
```

- Modes 0–4 are stateless single-pass shaders → **one shared program** switched
  by a `u_mode` int.
- Mode 5 (Gargantua) is a heavy per-pixel ray-marcher → isolated component for
  clarity/perf.
- Mode 6 (Turing) is **stateful** (each frame depends on the last) → needs
  ping-pong float-buffer framebuffers, so it gets its own **WebGL2** context.
- All three emit the **same glyph-grid output** and accept the **same control
  props**, so they feel identical to the user.
- **Mirror props into refs** so the render loop reads live values without
  recompiling shaders or re-subscribing — every slider retunes instantly.

Shared prop contract for the separate-component effects:

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

### Shader catalog — implement all seven

| # | Name | Technique | Notes |
|---|------|-----------|-------|
| 0 | **fBm Noise** | 4-octave rotated value-noise fractal Brownian motion, scrolling on Y | Slow organic clouds. Honors **Scale** + **Speed**. |
| 1 | **Sine Plasma** | Three sine terms (x, y, radial) averaged into `[0,1]` | Smooth interfering ripples. Honors **Scale**. |
| 2 | **Matrix Rain** | Per-column falling "head" at a hashed per-column speed, ~20-cell fade trail, occasional full-bright glitch cells | Digital rain. Ignores Scale. |
| 3 | **Image Mode** | Sample an uploaded image texture; luminance → `val` | Optional **Use colors** toggle keeps source pixel color instead of theme tint. |
| 4 | **Galaxy** | Tilted logarithmic-spiral disk: volumetric exponential core, 2 differential-rotation arms, FBM dust, ambient star field | Has its own white→gold→red palette when not in solid mode. Honors **Scale**. |
| 5 | **Gargantua Black Hole** | Schwarzschild null-geodesic ray tracer; integrate `accel = -1.5·h²·pos / r⁵` | Gravitational lensing wraps the (infinitely thin, equatorial) accretion disk over/under the shadow; Keplerian rotation + Doppler beaming (bright white approaching, dim red receding) + lensed starfield. **Separate component.** |
| 6 | **Turing Patterns** | Gray-Scott reaction-diffusion; A/B chemicals in `RGBA32F`, ~14 ping-pong steps/frame, display maps chemical B onto the ramp | Default `FEED 0.0545 / KILL 0.062` ("coral"). **Separate component, WebGL2 + `EXT_color_buffer_float`.** Gate behind a capability check and hide the option if unsupported. |

### Controls (right-hand sidebar, all live)

| Control | Range / values | Applies to |
|---------|----------------|------------|
| **Shader Algorithm** | the 7 modes above | — |
| **Source Image** (upload) + **Use colors** toggle | any image | Mode 3 only |
| **Character size** | width 5–24 px, height 8–36 px | All |
| **Glyph Ramp** | any string, ordered dark→light; quick-pick ramp buttons | All |
| **Noise Zoom / Scale** | 0.5–12.0 | Modes 0, 1, 4 only (hide for 2, 3, 5, 6) |
| **Animation Speed** | 0.0–4.0× (drives sim step count for mode 6) | All |
| **Brightness Gain** | 0.2–2.0 (applied before quantization) | All |
| **CRT Scanlines** | on/off (pure CSS overlay) | All |
| **Color Theme** | the 8 themes below | All |

Ship quick-pick glyph ramps: `' .:-=+*#%@'`, `' ░▒▓█'`, `' 01'`, `'█'`,
`' .xX*#@'`. Default ramp `' .,:;+*?%S#@'`.

### Color themes

`COLOR_THEMES` — each defines a background, a solid color, a gradient pair, and
a `mode` (0 solid · 1 vertical gradient · 2 multivalue heat ramp · 3 matrix
green) that selects how `getColor()` colorizes intensity.

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

> **No presets for now.** Ship the raw controls and themes only — each effect
> simply starts at sensible default values. (Preset bundles will be authored
> later, one at a time, so do not build a preset system or auto-apply behavior.)

### Exports (three sidebar actions)

- **Copy Text Art** — plain-text snapshot of the current frame.
- **Copy Styled HTML Embed** — a `<pre>` block with theme colors baked in.
- **Download PNG Image** — saves the current canvas as a PNG.

For the JS-modeled effects (0, 1, 2, 4) regenerate the text snapshot on the CPU
from the same math the shader uses. For the GPU-only effects (**5, 6**) there is
no closed-form CPU model, so produce the snapshot by **reading back the rendered
framebuffer**: downscale the canvas to one pixel per glyph cell and map
luminance onto the ramp. (Image-mode text export may fall back to noise — a
known, acceptable gap.)

### Screensaver mode

A top-right button takes any effect fullscreen (`fixed inset-0 z-50`), covering
the viewport; it exits on **any key press or mouse click**. The
separate-component effects accept `isParentScreensaver` /
`onExitParentScreensaver` so the parent container remains the single source of
truth for screensaver state.

### Visual identity / theming (match this exactly)

The app is a **utility surface, not a marketing page**: dark by default, flat
panels (borders define structure, **no shadows**), cyan as the only action
color, small typography, tight spacing, **immediate interactions (no transition
animations by default)**.

Define semantic tokens first in `src/index.css`, then map shadcn variables onto
them. Keep `@custom-variant dark (&:is(.dark *));`. Card radius token is `4px`.

```css
:root {
  --bg-main: #121212;
  --bg-sidebar: #1a1a1a;
  --bg-card: #222222;
  --bg-card-hover: #2d2d2d;
  --border-color: #3a3a3a;
  --border-active: #38bdf8;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent-cyan: #38bdf8;

  --background: var(--bg-main);
  --foreground: var(--text-primary);
  --card: var(--bg-card);
  --card-foreground: var(--text-primary);
  --primary: var(--accent-cyan);
  --primary-foreground: #000000;
  --border: var(--border-color);
  --input: var(--border-color);
  --ring: var(--border-active);
  --radius: 4px;
}
```

Provide a `:root.light` override (page `#f4f4f5`, card `#ffffff`, border
`#d4d4d8`, accent `#0ea5e9`, text `#09090b`). Store the choice in `localStorage`
and toggle `.dark` / `.light` on `document.documentElement`. Prefer token
classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`,
`border-border`, `text-primary`, `focus-visible:ring-ring`) so the root class
does the work.

**Typography.** System UI sans (`-apple-system, BlinkMacSystemFont, "Segoe UI",
Roboto, Helvetica, Arial, sans-serif`); mono (`SFMono-Regular, Consolas,
"Liberation Mono", Menlo, monospace`). App/tool title `text-[18px] font-semibold
tracking-tight`; body `text-[13px] text-muted-foreground`; controls `text-xs` /
`text-sm`; section labels `text-xs font-semibold uppercase tracking-wider
font-mono`; use mono for numeric values, hashes, and ramp strings.

**Layout.** Full-bleed canvas + a constrained right sidebar of controls. This is
a canvas-heavy tool, so use the wide shell — `min-h-screen bg-background
text-foreground flex flex-col font-sans`, main `w-full max-w-none px-4 md:px-8
lg:px-12 py-6`. Do **not** wrap the canvas in an extra card; give it room. Group
controls into bordered token-first panels (`bg-card border border-border
rounded-lg p-4 space-y-4`).

**Components.** Reuse shadcn `Button`, `Input`, `Card`, `Select`, `Switch`,
`Slider`, `Label`. Most controls are `variant="outline"`; reserve
`variant="default"` for the single primary action. Every icon-only button needs
an `sr-only` label and a visible `focus-visible` ring. Preserve native controls
where they're best (`input type="color"`, `input type="range"`). Use semantic
colors only for status (info blue / success emerald / warning amber / error
red), always as full `bg-…/10 text-…-600 dark:text-…-400 border-…/20` sets,
never decoratively.

### Constraints & honesty

- Keep the renderer **pattern-source agnostic**: every effect must reduce to a
  single luminance `val`. Inherently chromatic patterns lose hue (except image
  color passthrough) — that is by design, don't fight it.
- Do **not** add area averaging / anti-aliasing of the pattern or
  error-diffusion dithering. The two quantizations (grid + ramp) are the
  intended quality envelope. Tonal resolution is hard-capped by ramp length;
  smooth gradients band unless the source is noisy — acceptable.
- The glyph bitmap adds texture, never tonal information.

### Deliverables

- A runnable Vite app (`npm install && npm run dev`) that renders all 7 effects,
  all controls live, all 8 themes, all 3 exports, and screensaver mode.
- `README.md` covering run/build and a one-paragraph description of the
  render pipeline.
- Clean TypeScript (no `any` in the public prop contracts), components split as
  in the architecture diagram above.

---

## Acceptance checklist

Use this to grade the built app.

- [ ] All 7 shader modes render and are visually distinct.
- [ ] Every control (char size, ramp, scale, speed, brightness, CRT, theme)
      retunes the output **live**, with no visible recompile stutter.
- [ ] Scale slider is hidden for modes 2, 3, 5, 6; image controls show only for
      mode 3.
- [ ] Font atlas rebuilds only on ramp/char-size change (verify it is not rebuilt
      per frame).
- [ ] Mode 6 is gated behind a WebGL2 + `EXT_color_buffer_float` check and hidden
      when unsupported.
- [ ] All three contexts use `preserveDrawingBuffer: true`.
- [ ] Text, HTML, and PNG exports all work; GPU-only modes (5, 6) export via
      framebuffer readback.
- [ ] Screensaver covers the viewport and exits on any key/click, for all modes.
- [ ] Dark and light themes both look correct; theme persists across reloads.
- [ ] Visual identity matches the style guide: flat, borderless-shadow, cyan
      actions, compact type, `4px` radius.

## Suggested build order

1. **Skeleton + theme.** Vite + React + Tailwind v4 + shadcn primitives + the
   token CSS and theme toggle. Empty full-bleed canvas + sidebar shell.
2. **Shared renderer.** WebGL1 context, full-screen quad, `buildFontAtlas`, the
   `main()` above with mode 0 (fBm) only. Wire char size + ramp + brightness.
3. **Stateless modes 1–4.** Add `u_mode` branches; add Scale/Speed and image
   upload. Add themes + `getColor()`.
4. **Controls + exports.** Full sidebar and the three export actions (CPU
   snapshot for 0/1/2/4). No presets.
5. **Gargantua (mode 5).** Separate WebGL1 component, geodesic tracer,
   framebuffer-readback export.
6. **Turing (mode 6).** Separate WebGL2 component, ping-pong float buffers,
   capability gate.
7. **Screensaver + polish.** Fullscreen, light-mode pass, acceptance checklist.

---

*Companion documents (in the source repo): the feature reference
[`ascii-shader-sandbox.md`](./ascii-shader-sandbox.md), the rendering deep-dive
[`ascii-renderer-architecture.md`](./ascii-renderer-architecture.md), and the
[`theming-style-guide.md`](./theming-style-guide.md).*
