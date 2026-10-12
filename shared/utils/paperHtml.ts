// Builds the block markup for the editor's hidden measuring flow, which decides where pages break,
// and for the samples in the Styles panel. Same markup + same CSS (app/assets/css/paper.css) as the
// pages on screen = the same line breaks.

const ENTITY = /^&(?:amp|lt|gt|quot|#39|nbsp|#\d+|#x[0-9a-f]+);/i;
const BR = /^<br\s*\/?>/i;

export function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

/** Keeps text and <br> only: any other tag (bold, italic, underline, spans…) is dropped, its text kept. */
export function sanitizeInline(html: string): string {
  let out = "";
  let i = 0;
  while (i < html.length) {
    const rest = html.slice(i);
    const ch = html[i];
    if (ch === "<") {
      const br = BR.exec(rest);
      if (br) {
        out += "<br>";
        i += br[0].length;
        continue;
      }
      const end = rest.indexOf(">");
      i += end === -1 ? rest.length : end + 1; // drop any other tag
      continue;
    }
    if (ch === "&") {
      const ent = ENTITY.exec(rest);
      if (ent) {
        out += ent[0];
        i += ent[0].length;
        continue;
      }
      out += "&amp;";
      i++;
      continue;
    }
    out += ch === ">" ? "&gt;" : ch;
    i++;
  }

  return out;
}

export interface FlowBlock {
  type: BlockType;
  prefix: string;
  html: string;
  id?: string;
}

export function blockHtml(b: FlowBlock): string {
  const id = b.id ? ` data-id="${escapeHtml(b.id)}"` : "";
  const pre = b.prefix
    ? `<span class="pre">${escapeHtml(b.prefix)}</span>`
    : "";
  const body = sanitizeInline(b.html) || "<br>";

  return `<div class="b b-${b.type}"${id}>${pre}<div class="tx"><p>${body}</p></div></div>`;
}

export function flowHtml(blocks: FlowBlock[]): string {
  return `<div class="flow">${blocks.map(blockHtml).join("")}</div>`;
}
