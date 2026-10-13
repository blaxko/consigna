import type { CSSProperties } from "react";

// Mark geometry from docs/brand/consigna-mark.svg (viewBox 0 0 245 259).
const MARK_VIEWBOX = "0 0 245 259";
const MARK_PATH =
  "M20 0 L173 0 A72 72 0 0 1 245 72 L245 136 A10 10 0 0 1 235 146 L123 146 A10 10 0 0 1 113 136 L113 36.65 A8 8 0 0 0 101.57 29.42 L22.7 66.82 A8 8 0 0 0 18.66 76.92 L56.02 174.15 A6 6 0 0 0 61.62 178 L160.1 178 A14 14 0 0 1 170.12 182.23 L245 259 L72 259 A72 72 0 0 1 0 187 L0 20 A20 20 0 0 1 20 0 Z";

// Plus Jakarta Sans cap height, 745 units per 1000 em (read from the self-hosted font).
const CAP_HEIGHT_EM = 0.745;
// Mark height is 1.3x the cap height. Gap is 0.3x the mark height.
const MARK_TO_CAP = 1.3;
const GAP_TO_MARK = 0.3;

/**
 * Consigna logo: the inline mark plus live "Consigna" text in the site's display font.
 * `size` is the mark height in px. The mark is centred on the cap height, so it lines up with the caps.
 * The mark is currentColor, so it follows the text colour. `markOnly` drops the wordmark.
 */
export function Logo({ size = 28, markOnly = false, className = "" }: { size?: number; markOnly?: boolean; className?: string }) {
  const markH = size;
  const markW = (markH * 245) / 259;
  const capH = markH / MARK_TO_CAP;
  const fontPx = capH / CAP_HEIGHT_EM;
  // Baseline-aligned mark. Its bottom would sit on the baseline, so it drops by half the difference to centre on the caps.
  const drop = (markH - capH) / 2;

  const wrapper: CSSProperties = { display: "inline-flex", alignItems: "baseline", lineHeight: 1, color: "inherit" };

  return (
    <span role="img" aria-label="Consigna" className={`align-middle ${className}`} style={wrapper}>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={MARK_VIEWBOX}
        width={markW}
        height={markH}
        fill="currentColor"
        style={{ position: "relative", top: drop, flexShrink: 0, alignSelf: "baseline" }}
      >
        <path d={MARK_PATH} />
      </svg>
      {!markOnly && (
        <span
          aria-hidden="true"
          className="font-display font-bold tracking-tight"
          style={{ fontSize: fontPx, marginLeft: markH * GAP_TO_MARK, whiteSpace: "nowrap" }}
        >
          Consigna
        </span>
      )}
    </span>
  );
}
