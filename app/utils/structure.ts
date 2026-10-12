// The plan is a flat list of blocks. Sections and questions are derived from it:
// a section owns every block until the next section; a question owns text until the next heading.

export interface QuestionNode {
  b: Block;
  i: number;
  body: Block[];
}

export interface SectionNode {
  b: Block;
  i: number;
  qs: QuestionNode[];
  intro: Block[];
}

export interface Structure {
  secs: SectionNode[];
  loose: QuestionNode[];
  owner: Record<string, { sec: string | null; q: string | null }>;
}

export function buildStructure(blocks: Block[]): Structure {
  const secs: SectionNode[] = [];
  const loose: QuestionNode[] = [];
  const owner: Structure["owner"] = {};
  let cur: SectionNode | null = null;
  let q: QuestionNode | null = null;
  blocks.forEach((b, i) => {
    if (b.type === "section") {
      cur = { b, i, qs: [], intro: [] };
      secs.push(cur);
      q = null;
      owner[b.id] = { sec: b.id, q: null };
    } else if (b.type === "question") {
      q = { b, i, body: [] };
      (cur ? cur.qs : loose).push(q);
      owner[b.id] = { sec: cur ? cur.b.id : null, q: b.id };
    } else {
      if (b.type !== "title") {
        if (q) {
          q.body.push(b);
        } else if (cur) {
          cur.intro.push(b);
        }
      }
      owner[b.id] = { sec: cur ? cur.b.id : null, q: q ? q.b.id : null };
    }
  });

  return { secs, loose, owner };
}

/** Index range [start, end) that moves with a block: a section with its contents, a question with its answer. */
export function blockRange(blocks: Block[], id: string): [number, number] {
  const i = blocks.findIndex((b) => b.id === id);
  const b = blocks[i]!;
  let j = i + 1;
  if (b.type === "section") {
    while (j < blocks.length && blocks[j]!.type !== "section") j++;
  } else if (b.type === "question") {
    while (j < blocks.length && !isHeadingBlock(blocks[j])) j++;
  }

  return [i, j];
}
