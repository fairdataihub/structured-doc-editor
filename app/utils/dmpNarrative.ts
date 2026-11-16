// The narrative of the /import flow: extraction JSON in, edited plan out. Pure functions, no state.

let uid = 0;

export const nextImportId = () => ++uid;

/** A restored draft already uses ids, so new blocks must start above them. */
export function reserveImportIds(sections: ImportSection[]) {
  for (const section of sections) {
    uid = Math.max(uid, section.id, ...section.questions.map((q) => q.id));
  }
}

export const newImportSection = (): ImportSection => ({
  id: nextImportId(),
  title: "",
  description: "",
  questions: [],
});

export const newImportQuestion = (): ImportQuestion => ({
  id: nextImportId(),
  text: "",
  answer: "",
});

export function narrativeFromJson(data: ExtractionJson) {
  const template = data.narrative.template;

  const byOrder = <T extends { order: number }>(items: T[]) =>
    items.slice().sort((a, b) => a.order - b.order);

  return {
    plan: {
      title: template.title,
      description: template.description ?? "",
      version: template.version ?? "",
    } satisfies ImportPlan,
    sections: byOrder(template.section).map((section): ImportSection => ({
      id: nextImportId(),
      title: section.title,
      description: section.description ?? "",
      questions: byOrder(section.question).map((question) => ({
        id: nextImportId(),
        text: question.text,
        answer: question.answer.json.answer,
      })),
    })),
  };
}

export function narrativeToJson(
  plan: ImportPlan,
  sections: ImportSection[],
  downloadUrl = "",
): ExtractionJson {
  return {
    narrative: {
      download_url: downloadUrl,
      template: {
        title: plan.title,
        description: plan.description,
        version: plan.version,
        section: sections.map((section, si) => ({
          title: section.title,
          description: section.description,
          order: si + 1,
          question: section.questions.map((question, qi) => ({
            text: question.text,
            order: qi + 1,
            answer: {
              json: {
                type: "textArea",
                answer: question.answer,
                meta: { schemaVersion: "1.0" },
              },
            },
          })),
        })),
      },
    },
  };
}

/** The plan as Markdown: # title, ## sections, ### questions. Numbers are left out, so it reads like the final document. */
export function narrativeToMarkdown(
  plan: ImportPlan,
  sections: ImportSection[],
) {
  const out: string[] = [];

  if (plan.title.trim()) out.push(`# ${plan.title.trim()}`);

  for (const section of sections) {
    out.push(`## ${section.title.trim() || "Untitled section"}`);

    if (section.description.trim()) out.push(section.description.trim());

    for (const question of section.questions) {
      if (question.text.trim()) {
        out.push(`### ${question.text.trim().replace(/\s*\n\s*/g, " ")}`);
      }

      if (question.answer.trim()) out.push(question.answer.trim());
    }
  }

  return `${out.join("\n\n")}\n`;
}

/** What is still missing when the user leaves the structure step. */
export function narrativeGaps(sections: ImportSection[]) {
  const noTitle = sections.filter((s) => !s.title.trim()).length;

  const noText = sections
    .flatMap((s) => s.questions)
    .filter((q) => !q.text.trim()).length;

  return [
    noTitle ? `${noTitle} section(s) without a title` : "",
    noText ? `${noText} question(s) without text` : "",
  ].filter(Boolean);
}

/** A stable key for each object in the JSON view, so folding survives edits and moves. */
export function jsonFoldKey(
  path: (string | number)[],
  sections: ImportSection[],
) {
  if (path.length === 0) return "root";

  if (path[2] === "section" && path.length >= 3) {
    if (path.length === 3) return "sections";

    const section = sections[path[3] as number];

    if (!section) return path.join(".");

    if (path.length === 4) return `s:${section.id}`;

    if (path.length === 5) return `qs:${section.id}`;

    const question = section.questions[path[5] as number];

    const prefix = { 6: "q", 7: "a", 8: "aj", 9: "m" }[path.length];

    return `${prefix}:${question?.id}`;
  }

  return path.join(".");
}

/** Which block (and part) of the plan a value in the JSON view comes from, if any. */
export function jsonBlockLink(
  path: (string | number)[],
  sections: ImportSection[],
): (ImportSelection & { tone: ImportTone }) | null {
  if (path.length === 2 && path[1] === "template") {
    return { kind: "plan", tone: "title" };
  }

  if (path[2] !== "section" || path.length < 4) return null;

  const section = sections[path[3] as number];

  if (!section) return null;

  if (path.length === 4) {
    return { kind: "section", id: section.id, tone: "section" };
  }

  if (path.length === 5) {
    return path[4] === "description"
      ? {
          kind: "section",
          id: section.id,
          part: "description",
          tone: "description",
        }
      : null;
  }

  const question = section.questions[path[5] as number];

  if (!question) return null;

  if (path.length === 6) {
    return { kind: "question", id: question.id, tone: "question" };
  }

  if (path.length === 7 && path[6] === "answer") {
    return {
      kind: "question",
      id: question.id,
      part: "answer",
      tone: "answer",
    };
  }

  return null;
}

export type ImportTone =
  "title" | "section" | "description" | "question" | "answer";

/** One colour per block type, the same in the plan and the side panel (see assets/css/import.css). */
export const IMPORT_TONE_SELECTED: Record<ImportTone, string> = {
  title: "bg-(--title-soft) shadow-[inset_2px_0_0_var(--title-c)]",
  section: "bg-(--sec-soft) shadow-[inset_2px_0_0_var(--sec-c)]",
  description: "bg-(--desc-soft) shadow-[inset_2px_0_0_var(--desc-c)]",
  question: "bg-(--q-soft) shadow-[inset_2px_0_0_var(--q-c)]",
  answer: "bg-(--a-soft) shadow-[inset_2px_0_0_var(--a-c)]",
};
