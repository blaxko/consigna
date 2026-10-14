# Design system: calm, frosted, one blue

**Source of truth:** `src/index.css` (tokens, buttons), `src/styles/glass.css` (frosted cards), `src/styles/motion.css` (motion), `src/styles/theme.css` (fonts and the Tailwind theme).

## Type
- Display and body: **Wix Madefor Display Variable** (OFL, self-hosted via `@fontsource-variable/wix-madefor-display`).
- Addresses, amounts, tx hashes: **Geist Mono** (self-hosted via `@fontsource/geist-mono`).
- Headlines weight 500 to 600, slightly tight tracking. Hero 34px mobile, 56px desktop.

## Colour tokens (`:root`)
| Token | Value | Use |
|---|---|---|
| `--color-accent` | `rgb(45 100 214)` | Primary buttons and links. White on it is about 5.4:1. |
| `--color-ink` | `#111418` | Body and headline text. |
| `--color-muted` | `#5b6170` | Secondary text. 5.8:1 on the off-white field, 6.2:1 on white. |
| `--color-line` | `rgb(17 20 24 / 0.09)` | Hairlines and card borders. |
| `--color-navy` | `#111b33` | The one contrasting band (closing CTA). White text on it is 17:1. |
| `--color-warm` | `rgb(232 150 52)` | Icons only. |
| red | `red-700` / `red-50` | The "Blocked by contract" state only, plus form error text. |

## Surfaces
- **Field:** `#f7f7f8` with a faint dot texture (`body::before`).
- **Cards:** white, 1rem radius, one soft shadow (`--shadow-card`). Bento cards are solid white.
- **Frosted panels (`.glass`):** real content panels only. `blur(12px) saturate(120%)`, a translucent white gradient, a soft shadow.
- **Never glass:** the header, the menu panel, inputs, the invoice paper, the ledger table, the red BlockedCard.
- **Coloured sections:** the dashboard preview sits in a soft blue panel that fades out at the bottom; the closing CTA is the navy band.

## Motion
- Reveals 450ms ease-out. Route fade 300ms. Status fades 280ms.
- The hero demo loop shows the payment story. Hero floats stop under reduced motion.
- Nothing delays a payment action. Reduced motion shows final states.

## Spacing and radius
- Spacing on a 4/8 scale. Radius family: cards 1rem, inner tiles 0.75rem, inputs and chips 0.5rem, pills for labels and primary buttons only.
