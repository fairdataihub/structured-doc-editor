import { z } from "zod";

// Turns the LLM extraction (sample1.json shape) into the editor's flat block list. Any markdown
// the LLM added (**bold**, # headings, - bullets…) is removed on the way in: the plan has one
// fixed style. Nothing is compared with the original PDF: people check the structure themselves.

/** Version of the saved plan. Plans saved by an older version are re-imported. */
export const PLAN_VERSION = 4;

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

/** Extracted text as blocks of one type, one per paragraph, with any markdown removed. */
const textBlocks = (type: "description" | "answer", text: string): Block[] =>
  markdownParagraphs(text).map((p) => ({
    id: uid(),
    type,
    html: escapeHtml(p).replace(/\n/g, "<br>"),
  }));

export function importExtraction(
  json: ExtractionJson,
  file: string,
): PlanState {
  const blocks: Block[] = [];
  const secs = sortedSections(json).map((s) => ({
    title: stripMarkdown(s.title),
    description: String(s.description ?? ""),
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
    blocks.push({
      id: uid(),
      type: "section",
      html: escapeHtml(secText),
      numbered: m ? true : !anySecNumbered,
    });
    blocks.push(...textBlocks("description", s.description));

    for (const q of s.qs) {
      // A section with no sub-questions comes back with its own title repeated as the question:
      // that question is dropped, and its answer sits directly under the section.
      if (normText(q.text) !== normText(s.title)) {
        const qm = Q_PREFIX.exec(q.text);
        blocks.push({
          id: uid(),
          type: "question",
          html: escapeHtml(qm ? q.text.slice(qm[0].length) : q.text),
          numbered: qm ? true : !anyQNumbered,
        });
      }
      // Every question gets an answer block, even an empty one to type into.
      const answers = textBlocks("answer", q.answer);
      if (!answers.length)
        answers.push({ id: uid(), type: "answer", html: "" });
      blocks.push(...answers);
    }
  }

  return {
    v: PLAN_VERSION,
    file,
    blocks,
    counts: {
      sections: secs.length,
      questions: blocks.filter((b) => b.type === "question").length,
    },
  };
}

/**
 * The edited plan in the extraction's own JSON shape, so downstream systems keep working. Section
 * descriptions go to section.description; answers under a section with no question go to a
 * question named after the section, as the extraction does.
 */
export function toExtractionJson(
  state: PlanState,
  numbering: Numbering,
): ExtractionJson {
  const st = buildStructure(state.blocks);
  const txt = (b: Block) => stripHtml(b.html).trim();
  const full = (b: Block) =>
    [numbering.pre[b.id], txt(b)].filter(Boolean).join(" ");
  // Paragraphs of one type, a blank line between them (a line break inside a block stays one).
  const join = (bs: Block[], type: BlockType) =>
    bs
      .filter((b) => b.type === type)
      .map(txt)
      .join("\n\n");
  const q = (text: string, order: number, bs: Block[]) => ({
    text,
    order,
    answer: {
      json: {
        type: "textArea",
        answer: join(bs, "answer"),
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
          if (s.intro.some((b) => b.type === "answer"))
            qs.push(q(full(s.b), 1, s.intro));
          for (const x of s.qs) qs.push(q(full(x.b), qs.length + 1, x.body));

          return {
            title: full(s.b),
            description: join(
              [...s.intro, ...s.qs.flatMap((x) => x.body)],
              "description",
            ),
            order: i + 1,
            question: qs,
          };
        }),
      },
    },
  };
}
