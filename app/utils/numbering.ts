// Numbers are never typed by people: they are generated from position. Sections are
// "Element 1:", "Element 2:"…; questions are numbered "1.", "2."… again in each section.

export const sectionName = (n: number) => `Element ${n}`;
export const sectionPrefix = (n: number) => `${sectionName(n)}:`;
export const questionPrefix = (n: number) => `${n}.`;

export interface Numbering {
  /** Prefix printed on the page, e.g. "Element 4:" or "2." */
  pre: Record<string, string>;
  /** Short form for the outline, e.g. "4" or "2" */
  short: Record<string, string>;
  secNum: Record<string, number>;
}

export function buildNumbering(blocks: Block[]): Numbering {
  const pre: Record<string, string> = {};
  const short: Record<string, string> = {};
  const secNum: Record<string, number> = {};
  let sn = 0;
  let qn = 0;
  for (const b of blocks) {
    if (b.type === "section") {
      qn = 0;
      if (b.numbered !== false) {
        sn++;
        secNum[b.id] = sn;
        pre[b.id] = sectionPrefix(sn);
        short[b.id] = `${sn}`;
      } else {
        short[b.id] = "·";
      }
    } else if (b.type === "question") {
      if (b.numbered !== false) {
        qn++;
        pre[b.id] = questionPrefix(qn);
        short[b.id] = `${qn}`;
      } else {
        short[b.id] = "·";
      }
    }
  }

  return { pre, short, secNum };
}
