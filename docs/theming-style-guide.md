# Theming Style Guide

This guide documents the visual system used by React Web Utilities so the same look can be reused in a new app. The theme is intentionally quiet, dense, and tool-focused: dark by default, low contrast surfaces, cyan as the main action color, small typography, tight spacing, and flat UI with minimal visual noise.

## Design Principles

- Build the app as a utility surface, not a marketing page.
- Use dark mode as the default experience and light mode as a token override.
- Prefer functional density over decorative layout.
- Keep panels flat: borders define structure, not shadows.
- Use cyan only for primary actions, active states, and focus affordances.
- Use semantic colors for meaning: green for success, amber or orange for warning, red for failure, blue for informational states.
- Use compact controls with clear labels, icons, and predictable hover states.
- Keep card radius small. The app token is `4px`, even when component defaults say `rounded-lg` or `rounded-xl`.

## Technology

- React + TypeScript + Vite
- Tailwind CSS v4 through `@tailwindcss/vite`
- shadcn/Radix primitives
- CSS variables in [src/index.css](../src/index.css)
- Lucide React icons
- Utility merging through `cn()` in [src/lib/utils.ts](../src/lib/utils.ts)

There is no separate `tailwind.config.*` file. Tailwind theme tokens are declared inline in `src/index.css` with `@theme inline`.

## Theme Architecture

The app defines its own semantic tokens first, then maps shadcn variables onto those tokens.

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

Use app tokens for product-specific choices and shadcn tokens for component styling:

- App tokens: `--bg-main`, `--bg-card`, `--accent-cyan`
- Tailwind/shadcn tokens: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `focus-visible:ring-ring`

If a new app needs Tailwind utility classes for extra app tokens, expose them in `@theme inline`:

```css
@theme inline {
  --color-card-hover: var(--bg-card-hover);
  --color-border-active: var(--border-active);
}
```

Without those mappings, use bracket utilities such as `hover:bg-[var(--bg-card-hover)]` and `hover:border-[var(--border-active)]`.

## Color Tokens

### Dark Theme

| Token | Value | Usage |
| --- | --- | --- |
| `--bg-main` | `#121212` | Page background |
| `--bg-sidebar` | `#1a1a1a` | Popovers, sidebars, secondary navigation |
| `--bg-card` | `#222222` | Cards, input surfaces, raised tool panels |
| `--bg-card-hover` | `#2d2d2d` | Hovered cards, muted blocks |
| `--border-color` | `#3a3a3a` | Default borders and input outlines |
| `--border-active` | `#38bdf8` | Focus rings, active borders |
| `--text-primary` | `#e2e8f0` | Main text |
| `--text-secondary` | `#94a3b8` | Descriptions and secondary labels |
| `--text-muted` | `#64748b` | Footnotes and quieter metadata |
| `--accent-cyan` | `#38bdf8` | Primary action and active state |
| `--bg-terminal` | `#070a0f` | Code and terminal-style panels |
| `--text-terminal` | `#38bdf8` | Terminal accent text |

### Light Theme

Light mode is a `:root.light` override. Do not duplicate component styles when a token override is enough.

| Token | Value | Usage |
| --- | --- | --- |
| `--bg-main` | `#f4f4f5` | Page background |
| `--bg-sidebar` | `#e4e4e7` | Popovers, sidebars |
| `--bg-card` | `#ffffff` | Cards and controls |
| `--bg-card-hover` | `#f4f4f5` | Hovered cards, muted blocks |
| `--border-color` | `#d4d4d8` | Default borders |
| `--border-active` | `#0ea5e9` | Focus rings, active borders |
| `--text-primary` | `#09090b` | Main text |
| `--text-secondary` | `#52525b` | Secondary text |
| `--text-muted` | `#71717a` | Muted text |
| `--accent-cyan` | `#0ea5e9` | Primary action and active state |
| `--bg-terminal` | `#e4e4e7` | Code panels |
| `--text-terminal` | `#0ea5e9` | Terminal accent text |

## Theme Switching

The app stores the selected theme in `localStorage` and applies either `.dark` or `.light` to the document root. Use the same pattern in new apps:

```tsx
const [theme, setTheme] = useState<'dark' | 'light'>(() => {
  const saved = localStorage.getItem('theme');
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
});

useEffect(() => {
  const root = window.document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
}, [theme]);
```

Prefer token classes such as `bg-background`, `bg-card`, and `text-foreground` so this root class does the work.

## Typography

The app uses system UI fonts for speed and native polish:

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-mono: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
```

Recommended type scale:

| Role | Class pattern | Notes |
| --- | --- | --- |
| Home title | `text-[36px] font-semibold tracking-tight` | Use only for the app name or top-level title |
| Tool title | `text-[18px] font-semibold tracking-tight` | Used inside `ToolWrapper` |
| Card title | `text-[15px] font-bold` | Good for grid cards |
| Body and descriptions | `text-[13px] leading-normal text-muted-foreground` | Default explanatory copy |
| Control text | `text-xs` or `text-sm` | Keep controls compact |
| Metadata/code | `text-[11px]` or `text-xs font-mono` | Use mono for values, hashes, URLs, JSON, and counters |
| Section label | `text-xs font-semibold uppercase tracking-wider font-mono` | Use sparingly for tool panels |

Avoid large type inside compact panels. Hero-scale text belongs only on the home screen or major empty states.

## Radius, Borders, and Motion

The style guide token sets `--radius: 4px`. Existing shadcn components may use `rounded-lg` or `rounded-xl`, but the intended visual language is still compact and slightly squared.

Rules:

- Default border: `border border-border`
- Active border: `border-primary`, `border-ring`, or `border-active` when using raw CSS
- Focus: `focus-visible:ring-ring` with a narrow ring where possible
- Shadows: avoid relying on shadows. Global base styles suppress box shadows.
- Transitions: keep interactions immediate. Global base styles suppress transitions.

If a new app needs motion, introduce it locally and deliberately. Do not make motion a background styling habit.

## Layout

### App Shell

Use a full-height shell with a constrained main area:

```tsx
<div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
  <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-16">
    ...
  </main>
</div>
```

Use wider layouts only for tools that need canvas space, split panes, or dense inspection UIs:

```tsx
<main className="flex-1 w-full max-w-none mx-auto px-4 md:px-8 lg:px-12 py-6">
```

### Home Grid

Use a simple responsive grid:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

Tool cards should be equal in tone and easy to scan:

```tsx
<Card className="border border-border bg-card text-card-foreground hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-active)] flex flex-col justify-between">
```

### Tool Workspace

For standard tools, wrap content in `ToolWrapper` and let it provide the header, back button, theme toggle, and card container.

Use `noCard` for full-bleed tools such as shader sandboxes where an extra card would make the experience feel cramped.

## Component Recipes

### Buttons

Use the shared `Button` primitive for normal commands.

Primary action:

```tsx
<Button>Generate</Button>
```

Secondary or neutral action:

```tsx
<Button
  variant="outline"
  className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
>
  Open Tool
</Button>
```

Icon button:

```tsx
<Button
  variant="outline"
  size="icon"
  className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9"
>
  <Sun className="h-4 w-4" />
  <span className="sr-only">Toggle theme</span>
</Button>
```

Guidelines:

- Use Lucide icons for actions when available.
- Include `sr-only` text for icon-only buttons.
- Keep button text short.
- Use `variant="outline"` for most utility actions.
- Reserve `variant="default"` for the primary action in a local workflow.

### Inputs

Base input:

```tsx
<Input className="border-border bg-card text-foreground placeholder-muted-foreground focus-visible:ring-ring" />
```

Search input:

```tsx
<div className="relative max-w-md w-full">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input className="pl-10 border-border bg-card text-foreground placeholder-muted-foreground" />
</div>
```

Use mono text for code, tokens, hashes, encoded strings, and JSON:

```tsx
<textarea className="font-mono text-xs bg-zinc-950 border border-zinc-800 text-zinc-100" />
```

### Cards and Panels

Use `Card` for repeated items and standard tool containers. Use plain `div` panels for internal tool sections.

Standard card:

```tsx
<Card className="border border-border bg-card text-card-foreground">
  <CardHeader>
    <CardTitle className="text-[15px] font-bold">Title</CardTitle>
    <CardDescription className="text-muted-foreground text-[13px] leading-normal">
      Description
    </CardDescription>
  </CardHeader>
</Card>
```

Internal utility panel:

```tsx
<div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
```

Token-first panel:

```tsx
<div className="bg-card border border-border rounded-lg p-4 space-y-4">
```

Prefer token-first panels in new work. Existing `zinc-*` classes are supported by light-mode overrides, but new components should use semantic tokens unless they specifically need a terminal/code surface.

### Filter Chips

Use compact button chips for local filters:

```tsx
<button
  className={
    selected
      ? 'px-3 py-1.5 rounded-full text-xs font-semibold border bg-foreground text-background border-foreground'
      : 'px-3 py-1.5 rounded-full text-xs font-semibold border bg-background text-muted-foreground hover:bg-muted border-border'
  }
>
  All Codes
</button>
```

For semantic chips, use low-alpha backgrounds and colored text:

```tsx
const STATUS_STYLES = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};
```

### Split Panes

For explorer-style tools, use a fixed-height bordered workspace:

```tsx
<div className="flex flex-col h-162.5 bg-card text-card-foreground border border-border rounded-xl overflow-hidden">
  <div className="p-4 border-b border-border bg-muted/20">Filters</div>
  <div className="flex flex-1 overflow-hidden">
    <aside className="w-1/3 min-w-50 max-w-70 border-r border-border overflow-y-auto bg-muted/10" />
    <section className="flex-1 overflow-y-auto bg-background p-6 lg:p-10" />
  </div>
</div>
```

Use this pattern for browsers, inspectors, logs, file-like navigators, and dashboards with a selected detail pane.

## Semantic Color Usage

Use colors to communicate status, not decoration.

| Meaning | Class pattern |
| --- | --- |
| Info | `bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20` |
| Success | `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20` |
| Warning | `bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20` |
| Caution | `bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20` |
| Error | `bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20` |
| Primary/action | `bg-primary text-primary-foreground` or `text-primary` |

Use these combinations as full sets. Avoid mixing a semantic background with unrelated text colors.

## Light Mode Compatibility

The app includes hardcoded `zinc-*` overrides for legacy tool panels. This keeps old components readable in light mode, but new code should prefer semantic tokens:

Prefer:

```tsx
className="bg-card border-border text-foreground"
```

Avoid for new code unless creating a code/terminal panel:

```tsx
className="bg-zinc-950 border-zinc-800 text-zinc-100"
```

When raw semantic colors are needed, pair them with explicit dark variants:

```tsx
className="text-emerald-700 dark:text-emerald-400"
```

## Accessibility

- Every icon-only button needs an `sr-only` label.
- Focusable controls should retain a visible `focus-visible` ring.
- Use `text-muted-foreground` only for nonessential text.
- Do not place critical information in color alone. Pair color with labels or icons.
- Keep placeholder text descriptive but short.
- Preserve native controls when they are better for the task, such as `input type="color"` or `input type="range"`.

## New App Starter Checklist

1. Copy the imports and token blocks from `src/index.css`.
2. Keep `@custom-variant dark (&:is(.dark *));`.
3. Use the same `:root` and `:root.light` token strategy.
4. Install or keep `tailwindcss`, `@tailwindcss/vite`, `shadcn`, `radix-ui`, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge`.
5. Add the `@` alias to Vite so imports like `@/components/ui/button` work.
6. Reuse `Button`, `Input`, `Card`, `Select`, `Switch`, `Slider`, and `Label` primitives.
7. Implement root theme toggling with `.dark` and `.light`.
8. Build screens from bordered panels, compact controls, and semantic token classes.
9. Test both light and dark modes before shipping a new tool.

## Quick Class Reference

| Need | Use |
| --- | --- |
| Page shell | `min-h-screen bg-background text-foreground font-sans` |
| Centered app content | `w-full max-w-5xl mx-auto px-4` |
| Standard vertical rhythm | `space-y-6` |
| Compact panel | `bg-card border border-border rounded-lg p-4` |
| Code panel | `bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono` |
| Card hover | `hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-active)]` |
| Muted block | `bg-muted/20 border border-border` |
| Primary text | `text-foreground` |
| Secondary text | `text-muted-foreground` |
| Primary action | `bg-primary text-primary-foreground` |
| Neutral action | `border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground` |
| Focus state | `focus-visible:ring-ring focus-visible:border-ring` |
| Icon size | `h-4 w-4` |
| Dense label | `text-xs font-semibold uppercase tracking-wider font-mono` |
