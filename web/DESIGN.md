# Design system: liquid glass

**Source of truth:** `src/index.css` (tokens and glass), `src/styles/motion.css` (motion), `src/styles/theme.css` (fonts and Tailwind theme).

## Type

- Display and body: **Plus Jakarta Sans Variable** (self-hosted via `@fontsource-variable/plus-jakarta-sans`).
- Addresses, amounts, tx hashes: **Geist Mono** (self-hosted via `@fontsource/geist-mono`, weights 400, 500, 600).
- Replaces the previous Inter/system stack. Not the reference site's typeface.

## Colour tokens (`:root`)

| Token | Value | Use |
|---|---|---|
| `--color-ink` | `#14122b` | Body text. About 16:1 on the backdrop. |
| `--color-muted` | `#55526e` | Secondary text. At least 4.5:1 on the glass and on the backdrop. |
| `--color-line` | `rgb(20 18 43 / 0.12)` | Hairlines. |
| `--color-accent` | `rgb(105 65 198)` | Primary buttons and links. White text on it is about 7:1. |

## Surfaces

- **Backdrop:** fixed mesh gradient plus a faint SVG noise layer (`body::before` and `body::after`). It exists so the glass has something to refract.
- **`.glass`:** `backdrop-filter: blur(18px) saturate(170%)`, a translucent white gradient, a 1px light border, and an inset highlight. With no backdrop-filter support it falls back to 96% opaque white.
- **Solid, never glass:** the site nav (opaque white, no blur, sticky), the invoice paper, form fields, the ledger table, and the red "Blocked by contract" card (`bg-red-50`, 2px `red-700` border, `red-950` text).
- **Blur budget:** at most about three glass layers in one viewport. The landing hero uses one, the stats band one, and section cards one each.

## Motion

- CSS keyframes plus IntersectionObserver (`src/components/motion.tsx`). No animation library.
- Entrance and scroll reveal: 700ms, ease-out `cubic-bezier(.2,.7,.2,1)`, staggered with `--d`.
- Hero visual: slow float, 7s.
- Route change: a 450ms fade-and-rise on the page wrapper.
- Stats: count-up over 900ms, once.
- App screens: only the route fade. No motion on payment actions.
- `prefers-reduced-motion`: animations are cut to 0.01ms, reveals show at once, counters show their final value.
