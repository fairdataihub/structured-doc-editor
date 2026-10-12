import { z } from "zod";

// Turns the LLM extraction (sample1.json shape) into the editor's flat block list. Any markdown
// the LLM added (**bold**, # headings, - bullets…) is removed on the way in: the plan has one
// fixed style. Nothing is compared with the original PDF: people check the structure themselves.

/** Version of the saved plan. Plans saved by an older version are re-imported. */
export const PLAN_VERSION = 3;

export const ExtractionSchema = z.object({
  narrative: z
    .object({
      template: z
        .object({
          title: z.string(),
          section: z.array(
            z
              .object({
                title: z.string(),
                order: z.number(),
                question: z.array(
                  z
                    .object({
                      text: z.string(),
                      order: z.number(),
                      answer: z
                        .object({
                          json: z.object({ answer: z.string() }).passthrough(),
                        })
                        .passthrough(),
                    })
                    .passthrough(),
                ),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    })
    .passthrough(),
});

// "Element 4:", "Section 4 -", "Part 4." or a bare "4." / "4)".
const SEC_PREFIX =
  /^\s*(?:(?:Element|Section|Part)\s+(\d+)\s*[:.\-–]?|(\d+)[.)](?=\s))\s*/i;
// "A." / "B)" from letter-numbered PDFs or "1." / "2)": either way the plan prints numbers.
const Q_PREFIX = /^\s*(?:[A-Z]|\d{1,2})[.)]\s+/;

const sortedSections = (json: ExtractionJson) =>
  [...json.narrative.template.section].sort((a, b) => a.order - b.order);
const sortedQuestions = (
  s: ExtractionJson["narrative"]["template"]["section"][number],
) => [...s.question].sort((a, b) => a.order - b.order);

/** An extracted answer as blocks: markdown removed, bullets and numbered lines as list blocks. */
function answerBlocks(answer: string): ["answer" | "list", string][] {
  const out = markdownBlocks(answer).map<["answer" | "list", string]>((b) => [
    b.type,
    escapeHtml(b.text).replace(/\n/g, "<br>"),
  ]);

  return out.length ? out : [["answer", ""]];
}

export function importExtraction(
  json: ExtractionJson,
  file: string,
): PlanState {
  const blocks: Block[] = [];
  const issues: Issue[] = [];
  const fixes: PlanState["autofix"]["items"] = [];
  const refs: CrossRef[] = [];
  const origNum: Record<string, { id: string; label: string }> = {};
  const secs = sortedSections(json).map((s) => ({
    title: stripMarkdown(s.title),
    qs: sortedQuestions(s).map((q) => ({
      text: stripMarkdown(q.text),
      answer: String(q.answer?.json?.answer ?? ""),
    })),
  }));

  // When the extraction numbers some sections (or questions) but not others, the unnumbered ones stay
  // unnumbered. When it numbers none, the plan numbers them all.
  const anySecNumbered = secs.some((s) => SEC_PREFIX.test(s.title));
  const anyQNumbered = secs.some((s) =>
    s.qs.some((q) => Q_PREFIX.test(q.text)),
  );

  blocks.push({
    id: uid(),
    type: "title",
    html: escapeHtml(
      stripMarkdown(json.narrative.template.title) || "Data Management Plan",
    ),
  });

  for (const s of secs) {
    const m = SEC_PREFIX.exec(s.title);
    const secText = m ? s.title.slice(m[0].length) : s.title;
    const sid = uid();
    blocks.push({
      id: sid,
      type: "section",
      html: escapeHtml(secText),
      numbered: m ? true : !anySecNumbered,
    });
    if (m)
      origNum[m[1] ?? m[2]!] = { id: sid, label: secText.replace(/:\s*$/, "") };

    const numberedHere = s.qs.some((q) => Q_PREFIX.test(q.text));
    for (const q of s.qs) {
      if (normText(q.text) === normText(s.title)) {
        // The extractor repeats the section title as the question when a section has no sub-questions.
        fixes.push({ secId: sid, text: q.text });
      } else {
        const qm = Q_PREFIX.exec(q.text);
        const qid = uid();
        blocks.push({
          id: qid,
          type: "question",
          html: escapeHtml(qm ? q.text.slice(qm[0].length) : q.text),
          numbered: qm ? true : !anyQNumbered,
        });
        if (!qm && numberedHere)
          issues.push({
            id: uid(),
            kind: "unnumbered",
            blockId: qid,
            status: "open",
          });
      }
      for (const [type, html] of answerBlocks(q.answer))
        blocks.push({ id: uid(), type, html });
    }
  }

  // Cross-references like "see Element 5" are tracked so a later reorder can flag them.
  for (const b of blocks) {
    if (!isTextBlock(b)) continue;
    for (const m of plainOf(b).matchAll(/\bElement\s+(\d+)\b/g)) {
      const o = origNum[m[1]!];
      if (o)
        refs.push({
          id: uid(),
          secId: o.id,
          secLabel: o.label,
          text: `Element ${m[1]}`,
          dismissed: null,
        });
    }
  }

  return {
    v: PLAN_VERSION,
    file,
    blocks,
    issues,
    refs,
    autofix: { status: fixes.length ? "open" : "none", items: fixes },
    counts: {
      sections: secs.length,
      questions: secs.reduce((n, s) => n + s.qs.length, 0) - fixes.length,
    },
  };
}

/** The edited plan in the extraction's own JSON shape, so downstream systems keep working. */
export function toExtractionJson(
  state: PlanState,
  numbering: Numbering,
): ExtractionJson {
  const st = buildStructure(state.blocks);
  const txt = (b: Block) => stripHtml(b.html).trim();
  const full = (b: Block) =>
    [numbering.pre[b.id], txt(b)].filter(Boolean).join(" ");
  const answer = (bs: Block[]) =>
    bs.reduce(
      (s, b, i) =>
        s +
        (i
          ? b.type === "list" && bs[i - 1]!.type === "list"
            ? "\n"
            : "\n\n"
          : "") +
        txt(b),
      "",
    );
  const q = (text: string, order: number, bs: Block[]) => ({
    text,
    order,
    answer: {
      json: {
        type: "textArea",
        answer: answer(bs),
        meta: { schemaVersion: "1.0" },
      },
    },
  });
  const title = state.blocks.find((b) => b.type === "title");

  return {
    narrative: {
      download_url: "",
      template: {
        title: title ? txt(title) : "",
        description: "",
        version: "v1",
        section: st.secs.map((s, i) => {
          const qs = [];
          if (s.intro.length) qs.push(q(full(s.b), 1, s.intro));
          for (const x of s.qs) qs.push(q(full(x.b), qs.length + 1, x.body));

          return {
            title: full(s.b),
            description: "",
            order: i + 1,
            question: qs,
          };
        }),
      },
    },
  };
}
