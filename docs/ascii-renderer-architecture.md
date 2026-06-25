# ASCII Renderer Architecture & Pattern Fidelity

A deep dive into **how the ASCII Shader Sandbox actually turns a shader into
text art**, and an honest assessment of **how well that pipeline renders
different kinds of patterns**.

Where [`ascii-shader-sandbox.md`](./ascii-shader-sandbox.md) is the feature
reference (controls, themes, presets, how to extract the tool), this document is
the *rendering* reference: the glyph-grid pipeline, the two quantization stages
that define its quality ceiling, and what those mean for each effect.

---

## Table of contents

- [The renderer in one sentence](#the-renderer-in-one-sentence)
- [The pipeline, stage by stage](#the-pipeline-stage-by-stage)
- [The two quantizations that define quality](#the-two-quantizations-that-define-quality)
- [The font atlas: bridging CPU glyphs and GPU sampling](#the-font-atlas-bridging-cpu-glyphs-and-gpu-sampling)
- [Why this architecture (design rationale)](#why-this-architecture-design-rationale)
- [How well it renders patterns](#how-well-it-renders-patterns)
- [Per-effect fidelity notes](#per-effect-fidelity-notes)
- [Tuning for fidelity](#tuning-for-fidelity)
- [Known limitations](#known-limitations)

---

## The renderer in one sentence

> Every effect computes a single scalar **intensity** per character cell, that
> intensity picks a **glyph** from a ramp, and the glyph's own bitmap is
> sampled at sub-cell resolution and tinted by the theme — so the screen is
> never pixels, it is always a grid of lit characters.

That sentence hides two lossy steps (cell sampling and glyph quantization) that
together set the entire quality envelope. Everything below unpacks them.

---

## The pipeline, stage by stage

The whole renderer lives in the fragment shader's `main()`
([`ascii-shader.tsx:336-385`](../src/components/tools/ascii-shader.tsx#L336-L385)).
For **every screen pixel** the GPU runs:

```glsl
void main() {
  vec2 gridCoords  = floor(gl_FragCoord.xy / u_grid_size);  // which cell
  vec2 localCoords = fract(gl_FragCoord.xy / u_grid_size);  // where in the cell (0..1)
  vec2 uv          = (gridCoords + 0.5) * u_grid_size / u_resolution; // cell CENTER

  float val = /* effect-specific intensity, evaluated at the cell center */;
  val *= u_brightness;

  float charIdx = clamp(floor(val * u_char_count), 0.0, u_char_count - 1.0); // pick glyph
  vec2  fontUv  = vec2((charIdx + localCoords.x) / u_char_count, localCoords.y);
  float charIntensity = texture2D(u_font_atlas, fontUv).r; // sample the glyph bitmap

  vec3 color = getColor(val, uv, origImgColor, r);          // theme tint
  gl_FragColor = vec4(mix(u_color_bg, color, charIntensity), 1.0); // composite
}
```

Reading top to bottom:

| Stage | What happens | Resolution it works at |
|-------|--------------|------------------------|
| **1. Cell address** | `floor(coord / grid_size)` snaps the pixel to a character cell. | Grid cells |
| **2. Intensity** | The effect is evaluated **once per cell, at the cell center** (`uv`). All pixels in a cell share one `val`. | Grid cells |
| **3. Glyph pick** | `val` is multiplied by brightness and quantized to an integer `charIdx`. | Ramp steps |
| **4. Glyph sample** | The chosen glyph's bitmap is read at the **sub-cell** position `localCoords`. This is the *only* per-pixel detail. | Screen pixels |
| **5. Color + composite** | `getColor()` produces an RGB tint; `mix(bg, color, charIntensity)` lays the lit glyph over the background. | Screen pixels |

The crucial subtlety is in stages 2 and 4. The **pattern** is sampled at grid
resolution (one value per cell), but the **glyph shape** is sampled at pixel
resolution. So a cell looks crisp (you see the actual edges of `@` or `#`), yet
the information content of the image is only as rich as the grid is dense.

---

## The two quantizations that define quality

Pattern fidelity is gated by exactly two lossy reductions. Everything good or
bad about the output traces back to one of them.

### 1. Spatial quantization — the grid

The intensity is sampled at `uv = (gridCoords + 0.5) * u_grid_size`, i.e. **the
center of each cell, once**. A 1920×1080 canvas with the default 8×14 cell is
only **240 × 77 ≈ 18,500 samples** — regardless of how much detail the shader
could produce. Anything finer than one cell is **point-sampled, not averaged**,
so sub-cell detail is simply dropped (and can alias/shimmer when it moves).

- Smaller cells → more samples → more faithful, but more "pixely" and less
  "type-y," and the per-cell glyph shape matters less.
- Larger cells → chunkier, more legibly textual, but coarse patterns only.

### 2. Tonal quantization — the ramp

`charIdx = floor(val * u_char_count)` maps a continuous `[0,1]` intensity onto a
**discrete glyph index**. The default ramp `' .,:;+*?%S#@'` has 12 glyphs, so the
renderer has **12 brightness levels, full stop**. Smooth gradients become
visible bands (posterization); the only dithering is whatever spatial noise the
effect already contains.

> **The fidelity formula.** Effective image quality ≈
> *(canvas area ÷ cell area)* spatial samples × *(ramp length)* tonal levels.
> Both are cheap to raise and both are the user's to set, which is why the same
> renderer can look like a coarse toy or a detailed engraving.

The glyph's own bitmap (stage 4) adds *texture* but **no new tonal information** —
a `#` cell is always the `#` shape, no matter whether `val` was 0.71 or 0.79.

---

## The font atlas: bridging CPU glyphs and GPU sampling

The GPU can't render fonts, so glyphs are pre-baked on a 2D canvas and uploaded
as a texture (`buildFontAtlas`,
[`ascii-shader.tsx:478-510`](../src/components/tools/ascii-shader.tsx#L478-L510)):

1. An off-screen canvas of `charWidth × rampLength` by `charHeight` is filled
   black.
2. Each glyph is drawn in white, bold monospace, centered in its cell — so the
   atlas is a **horizontal strip**: cell 0 = first ramp glyph … cell N-1 = last.
3. It is uploaded as a `LUMINANCE` texture (one channel = coverage) with
   `NEAREST` filtering and `CLAMP_TO_EDGE`.

The shader then indexes it with
`fontUv.x = (charIdx + localCoords.x) / u_char_count`: `charIdx` selects the
strip cell, `localCoords` walks across that one glyph. `NEAREST` keeps glyph
edges crisp rather than blurring between adjacent characters in the strip.

The atlas is **rebuilt only when the ramp or character size changes**, never per
frame — so the per-pixel cost of "being ASCII" is a single texture lookup.

---

## Why this architecture (design rationale)

| Decision | Why | Pattern-fidelity consequence |
|----------|-----|------------------------------|
| **All effects emit a single `val ∈ [0,1]`** | One uniform pipeline (color, ramp, export, CRT) serves every shader. | Anything you want as ASCII must reduce cleanly to brightness; inherently chromatic patterns lose their hue (except image-color passthrough). |
| **Sample at cell center, not averaged** | One shader evaluation per cell is cheap; no expensive area integration. | Sharp, fast, but **prone to aliasing** on high-frequency moving patterns. |
| **Pre-baked font atlas + `NEAREST`** | GPU can't draw text; texture lookup is ~free per pixel. | Crisp glyph edges; glyph choice is purely tonal, never adds detail. |
| **Three WebGL contexts** (0–4 shared, 5 Gargantua, 6 Turing) | Stateless modes share one `u_mode`-switched program; the ray-marcher and the stateful sim each need their own setup. | All three converge on the *same* glyph-grid output, so fidelity characteristics are identical regardless of how the pattern was generated. |
| **Props mirrored into refs** | The render loop reads live values without recompiling shaders. | Cell size, ramp, brightness, speed all retune fidelity **instantly**, encouraging interactive tuning. |

The deeper point: the renderer is **pattern-source agnostic**. fBm noise, a
Schwarzschild geodesic trace, and a reaction-diffusion sim all funnel into the
identical "intensity → glyph" back end. Quality is therefore a property of *the
grid and the ramp*, not of which effect you picked.

---

## How well it renders patterns

The honest summary: **the renderer is excellent at organic, continuous-tone,
low-to-mid spatial-frequency patterns, and progressively worse as a pattern
relies on fine detail, hard edges, or color.**

### What it renders well

- **Smooth scalar fields** — fBm clouds, sine plasma, the galaxy's dust and
  core. These are *built* from continuous intensity, so the 12-step ramp reads
  as natural shading and the grid coarseness looks intentional.
- **Patterns with built-in spatial noise** — fBm and dust hide tonal banding
  because adjacent cells already vary; the noise acts as free dithering.
- **Large coherent structures** — spiral arms, the black-hole shadow and disk,
  Turing labyrinth ridges. Features many cells wide survive both quantizations
  intact.
- **Slow motion** — drift, Keplerian rotation, reaction-diffusion growth. With
  little sub-cell movement per frame, point-sampling doesn't shimmer.

### What it renders poorly

- **Fine high-frequency detail** — anything thinner than a cell is point-sampled
  and either vanishes or flickers. Detailed uploaded photos at large cell sizes
  turn to mush.
- **Smooth wide gradients on a short ramp** — a clean sky gradient posterizes
  into visible bands; there is no dithering unless the pattern supplies it.
- **Hard thin edges** — a one-pixel line falls between cell centers and breaks
  up; the renderer has no edge detection, only luminance.
- **Color-defined patterns** — two regions of equal brightness but different hue
  collapse to the same glyph (outside image-color mode), because `val` is
  luminance only.
- **Fast sub-cell motion** — rapid movement smaller than a cell aliases into
  crawling/twinkling, since each frame is an independent point sample.

### The mental model

Think of it as a **low-resolution, low-bit-depth, monochrome display whose
pixels happen to be typographic glyphs.** It shares the strengths and weaknesses
of dithered 1-bit art and early text-mode demos: gorgeous for procedural,
organic, tonal content; unforgiving for crisp, detailed, or chromatic content.

---

## Per-effect fidelity notes

| Effect | Fidelity | Why |
|--------|----------|-----|
| **fBm Noise (0)** | ★★★★★ | Continuous tone + intrinsic noise = ideal match; banding is masked, grid coarseness looks natural. |
| **Sine Plasma (1)** | ★★★★☆ | Beautifully smooth, but its *very* smoothness exposes ramp banding on long, slow gradients. Helped by a longer ramp. |
| **Matrix Rain (2)** | ★★★★★ | Designed *for* a grid — each column is one cell wide, the fade trail maps straight onto the ramp, glyph identity is the whole point. |
| **Image Mode (3)** | ★★★☆☆ | Quality swings hardest with cell size; large cells lose detail, small cells recover it. Color mode bypasses tonal limits but then it's barely "ASCII." |
| **Galaxy (4)** | ★★★★☆ | Core and dust read superbly; thin outer arm filaments can thin out below one cell and shimmer slightly when rotating. |
| **Gargantua (5)** | ★★★★☆ | Large lensed structures and the Doppler-bright disk edge render with real punch; the thinnest lensed disk slivers and starfield can twinkle from point-sampling. |
| **Turing (6)** | ★★★★★ | Reaction-diffusion produces cell-scale ridges and basins that the grid resolves cleanly; smooth chemical falloff maps gracefully onto the ramp. |

The pattern is consistent: **effects whose natural feature size sits at or above
one cell, and whose tone varies continuously, score highest.** Effects that push
detail below a cell or demand crisp edges lose the most.

---

## Tuning for fidelity

Concrete knobs, in rough order of impact:

1. **Shrink the cell.** The single biggest lever — more cells = more spatial
   samples. Drop to ~6×10 px for detail; raise to ~12×20 px for a chunkier,
   more legibly *textual* look. (Character size sliders.)
2. **Lengthen the ramp.** A 16–20 glyph ramp roughly doubles the tonal levels of
   the 12-glyph default, smoothing gradients. The block ramp `' ░▒▓█'` is short
   but each glyph has high, even coverage — good for posterized "shaded" looks.
3. **Match ramp coverage to the content.** Ramps should rise *monotonically* in
   ink coverage (dark→light). A ramp with non-monotonic glyphs (e.g. a sparse
   `*` denser than a `%`) introduces false tonal jumps.
4. **Lean on patterns with intrinsic noise** when you need apparent smoothness on
   a short ramp — fBm/dust dither for free.
5. **Brightness as exposure.** `val *= u_brightness` before quantization shifts
   which part of the ramp the midtones land on — use it to pull detail out of
   crushed shadows or blown highlights, not just to "brighten."
6. **CRT overlay** is purely cosmetic (a CSS scanline/RGB-shift layer); it does
   not change sampling or add real detail, though scanlines can visually mask
   banding.

---

## Known limitations

- **No area averaging / anti-aliasing of the pattern.** Each cell is one point
  sample at its center. There is no supersampling or mipmap-style averaging, so
  sub-cell detail is lost and can alias. (A future improvement would be to
  average a few taps per cell before quantizing.)
- **Tonal resolution is hard-capped by ramp length.** No error-diffusion or
  ordered dithering is applied, so smooth gradients band unless the source is
  noisy.
- **Luminance-only.** Patterns distinguished by hue rather than brightness
  collapse, except image mode's color passthrough.
- **Text export of GPU-only effects is a resample.** Modes 5/6 have no CPU model;
  their text snapshot is read back from the framebuffer at one pixel per cell, so
  it inherits exactly the grid/ramp limits above. Image-mode text export is a
  known gap (falls back to noise). See the Exports section of the feature doc.
- **Fixed glyph bitmap per level.** A cell's glyph shape is determined entirely
  by its quantized level, so the *shape* carries no extra tonal information —
  it's decorative texture, not data.

---

*Companion document: [`ascii-shader-sandbox.md`](./ascii-shader-sandbox.md) —
controls, themes, presets, screensaver, and how to extract the sandbox into a
standalone app.*
