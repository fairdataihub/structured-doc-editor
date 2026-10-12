// The one style every plan is laid out in (see app/assets/css/paper.css). It is fixed: nobody picks
// fonts, sizes, bold, italic or underline. Wherever a block sits, it takes its type's style and number.

export const PAPER_STYLE = {
  name: "NIH standard",
  paper: { w: 8.5, h: 11, label: "US Letter" },
  /** Page margin in inches. */
  margin: 0.75,
  font: "Arimo",
  fontNote: "Arial-compatible",
  spec: {
    title: "13 pt bold · all caps · centred · rule below",
    section:
      "12 pt bold · “Element 1:” · 14 pt above · stays with the next block",
    description: "11 pt · dark grey · 1.25 line spacing · 6 pt after",
    question: "11 pt bold · “1.” · hanging indent",
    answer: "11 pt · 1.25 line spacing · 6 pt after",
  } satisfies Record<BlockType, string>,
} as const;

/** Page geometry in CSS pixels (96 per inch). */
export function pageGeometry() {
  const { paper, margin } = PAPER_STYLE;
  const w = paper.w * 96;
  const h = paper.h * 96;
  const m = margin * 96;

  return { w, h, m, contentW: w - 2 * m, contentH: h - 2 * m, paper };
}
