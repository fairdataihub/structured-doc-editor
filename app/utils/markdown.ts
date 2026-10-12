// LLM extractions often come back with markdown: **bold**, _italic_, # headings, - bullets,
// [links](…), `code`, <u>underline</u>. The plan has one fixed style, so the syntax is removed
// and only the words are kept. Bulleted and numbered lines in an answer become list blocks.

interface Line {
  text: string;
  /** "-", "*" or "+" bullet: the marker is dropped (lists print "•" instead). */
  bullet?: boolean;
  /** Bullet or numbered line. A number ("1.") is part of the words and stays. */
  item?: boolean;
  heading?: boolean;
}

const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const SETEXT = /^\s*=+\s*$/;
const FENCE = /^\s*(```|~~~)/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/;
const HEADING = /^\s{0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/;
const QUOTE = /^\s*(?:>\s?)+/;
const BULLET = /^\s*[-*+]\s+(?:\[[ xX]\]\s+)?/;
const NUMBERED = /^\s*\d{1,3}[.)]\s+/;
const TABLE_ROW = /^\s*\|(.*)\|\s*$/;
const FORMAT_TAG =
  /<\/?(?:b|strong|i|em|u|ins|s|del|strike|mark|span|sup|sub|code|kbd|small|big|font|p|div)\b[^>]*>/gi;

// Escaped characters (\*) are parked in the Private Use Area so the emphasis rules skip them.
const PARK = 0xe000;
const park = (s: string) =>
  s.replace(/\\([\\`*_{}[\]()#+\-.!|~>])/g, (_, c: string) =>
    String.fromCharCode(PARK + c.charCodeAt(0)),
  );
const unpark = (s: string) =>
  s.replace(/[-]/g, (c) => String.fromCharCode(c.charCodeAt(0) - PARK));

/** Inline markdown → plain text: emphasis, strikethrough, code, links, images, formatting tags, escapes. */
export function stripInlineMarkdown(s: string): string {
  return unpark(
    park(s)
      .replace(FORMAT_TAG, "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(
        /\[([^\]]*)\]\(\s*<?([^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/g,
        (_, text: string, url: string) => {
          const link = url.replace(/^mailto:/i, "");
          // "[example.org](https://example.org/)" says the address once.
          const bare = link.replace(/^https?:\/\//i, "").replace(/\/$/, "");

          return !text || text === link || text === bare
            ? link
            : link
              ? `${text} (${link})`
              : text;
        },
      )
      .replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/gi, (_, url: string) =>
        url.replace(/^mailto:/i, ""),
      )
      .replace(/(`+)(.+?)\1/g, "$2")
      // Emphasis must wrap at least one real character, so "2 * 3 * 4" and "______" stay.
      .replace(/(\*\*\*|___)([^\s*_](?:.*?[^\s*_])?)\1/g, "$2")
      .replace(/\*\*([^\s*](?:.*?[^\s*])?)\*\*/g, "$1")
      .replace(/(^|[^\w])__([^\s_](?:.*?[^\s_])?)__(?!\w)/g, "$1$2")
      .replace(/\*([^\s*](?:.*?[^\s*])?)\*/g, "$1")
      .replace(/(^|[^\w])_([^\s_](?:.*?[^\s_])?)_(?!\w)/g, "$1$2")
      .replace(/~~([^\s~](?:.*?[^\s~])?)~~/g, "$1")
      // Unpaired ** left over from a broken pair.
      .replace(/\*{2,}/g, "")
      // A backslash at the end of a line is a markdown line break.
      .replace(/\\$/, ""),
  );
}

/** One source line, or null when it's markdown-only (rules, fences, table dividers). */
function readLine(raw: string): Line | null {
  if (
    RULE.test(raw) ||
    SETEXT.test(raw) ||
    FENCE.test(raw) ||
    TABLE_DIVIDER.test(raw)
  )
    return null;
  let s = raw.replace(QUOTE, "");
  const line: Line = { text: "" };
  const heading = HEADING.exec(s);
  const row = TABLE_ROW.exec(s);
  if (heading) {
    s = heading[1]!;
    line.heading = true;
  } else if (BULLET.test(s)) {
    s = s.replace(BULLET, "");
    line.item = line.bullet = true;
  } else if (NUMBERED.test(s)) {
    s = s.trimStart();
    line.item = true;
  } else if (row) {
    s = row[1]!
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)
      .join("; ");
    line.item = true;
  }
  line.text = stripInlineMarkdown(s).trim();

  return line;
}

const lines = (s: string) =>
  String(s ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\r?\n/);

/** A title, heading, question or pasted text as one line of plain words. */
export function stripMarkdown(s: string): string {
  return lines(s)
    .map(readLine)
    .map((l) => l?.text ?? "")
    .filter(Boolean)
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * An answer as plain-text blocks. Blank lines separate answers; each bulleted or numbered line
 * starts a list block. Other line breaks inside an answer are kept as line breaks.
 */
export function markdownBlocks(
  s: string,
): { type: "answer" | "list"; text: string }[] {
  const out: { type: "answer" | "list"; text: string }[] = [];
  let open = false;
  for (const raw of lines(s)) {
    if (!raw.trim()) {
      open = false;
      continue;
    }
    const l = readLine(raw);
    if (!l?.text) continue;
    const last = out.at(-1);
    if (l.item) {
      out.push({ type: "list", text: l.bullet ? `• ${l.text}` : l.text });
    } else if (open && last) {
      // A line under a list item continues it; a line under an answer is a line break.
      last.text += last.type === "list" ? ` ${l.text}` : `\n${l.text}`;
    } else {
      out.push({ type: "answer", text: l.text });
    }
    // A heading inside an answer stands on its own line.
    open = !l.heading;
  }

  return out;
}
