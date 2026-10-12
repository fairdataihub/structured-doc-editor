/** The one name for each block type: used in the legend, menus, placeholders and messages. */
export const TYPE_LABEL: Record<BlockType, string> = {
  title: "Title",
  section: "Section",
  description: "Section description",
  question: "Question",
  answer: "Answer",
};

let scratch: HTMLDivElement | null = null;

/** Plain text of inline HTML (<br> becomes a newline). */
export function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    return String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "");
  }
  scratch ??= document.createElement("div");
  scratch.innerHTML = String(html).replace(/<br\s*\/?>/gi, "\n");

  return scratch.textContent ?? "";
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const words = (s: string) =>
  s.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
export const normText = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[:.\s]+$/, "");
export const trunc = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
export const plainOf = (b: Pick<Block, "html">) =>
  stripHtml(b.html).replace(/\s+/g, " ").trim();
export const labelOf = (b: Block) =>
  plainOf(b).replace(/:\s*$/, "") || TYPE_LABEL[b.type];
/** Running text (section descriptions and answers), as opposed to the title and headings. */
export const isTextBlock = (b?: Block | null) =>
  !!b && (b.type === "description" || b.type === "answer");
export const isHeadingBlock = (b?: Block | null) =>
  !!b && (b.type === "section" || b.type === "question");
