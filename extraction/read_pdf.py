"""Read a PDF's own text into numbered lines, with positions and formatting.

No AI is involved: pdfplumber reads the characters stored in the file. This is step 1 of
"option B" in the concept brief. An LLM then only labels which line ranges are headings,
questions and answers (see prompt.md); the words always come from these lines.

    python extraction/read_pdf.py public/samples/sample1.pdf > public/samples/sample1.lines.json

Output shape:
    {"source": "...", "pages": [{"width": 612, "height": 792}],
     "lines": [{"n": 1, "page": 0, "bbox": [x0, top, x1, bottom], "text": "...",
                "spans": [{"text": "...", "bold": true, "italic": false, "underline": false}]}]}

Scanned PDFs have no stored text and come back with no lines: run OCR first (e.g. OCRmyPDF).
"""

import argparse
import json
import re
import sys

import pdfplumber

BOLD = re.compile(r"bold|black|heavy|semibold|demi", re.I)
ITALIC = re.compile(r"italic|oblique", re.I)


def underline_rules(page):
    """Underline is not a font property in PDF: it is a thin line or rectangle drawn under the words."""
    return [r for r in page.lines + page.rects if r["height"] < 2 and r["width"] > 10]


def is_underlined(word, rules):
    return any(
        abs(r["top"] - word["bottom"]) < 3 and r["x0"] - 2 <= word["x0"] and word["x1"] <= r["x1"] + 2
        for r in rules
    )


def read(path):
    out = {"source": path.replace("\\", "/").split("/")[-1], "pages": [], "lines": []}
    n = 0
    with pdfplumber.open(path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            out["pages"].append({"width": round(float(page.width), 2), "height": round(float(page.height), 2)})
            words = page.extract_words(extra_attrs=["fontname", "size"])
            rules = underline_rules(page)

            # Group words that share a baseline into visual lines.
            words.sort(key=lambda w: (round(w["bottom"]), w["x0"]))
            grouped = []
            for w in words:
                if grouped and abs(grouped[-1][-1]["bottom"] - w["bottom"]) <= 2.5:
                    grouped[-1].append(w)
                else:
                    grouped.append([w])

            for ws in grouped:
                ws.sort(key=lambda w: w["x0"])
                spans = []
                prev = None
                for w in ws:
                    style = {
                        "bold": bool(BOLD.search(w["fontname"])),
                        "italic": bool(ITALIC.search(w["fontname"])),
                        "underline": is_underlined(w, rules),
                    }
                    # Words also split where the font changes (e.g. a colon set in another font),
                    # so a space is only added where there is a visible gap.
                    sep = " " if prev is not None and w["x0"] - prev["x1"] > 0.15 * w["size"] else ""
                    if spans and all(spans[-1][k] == v for k, v in style.items()):
                        spans[-1]["text"] += sep + w["text"]
                    else:
                        if spans:
                            spans[-1]["text"] += sep
                        spans.append({"text": w["text"], **style})
                    prev = w
                n += 1
                out["lines"].append(
                    {
                        "n": n,
                        "page": page_index,
                        "bbox": [
                            round(min(w["x0"] for w in ws), 1),
                            round(min(w["top"] for w in ws), 1),
                            round(max(w["x1"] for w in ws), 1),
                            round(max(w["bottom"] for w in ws), 1),
                        ],
                        "text": "".join(s["text"] for s in spans),
                        "spans": spans,
                    }
                )
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("pdf")
    parser.add_argument("--numbered", action="store_true", help="print numbered lines for an LLM prompt instead of JSON")
    args = parser.parse_args()
    data = read(args.pdf)
    if not data["lines"]:
        sys.exit("No text found. This PDF is probably scanned: run OCR (for example OCRmyPDF) first.")
    if args.numbered:
        for line in data["lines"]:
            hints = [k for k in ("bold", "italic", "underline") if all(s[k] for s in line["spans"])]
            print(f'L{line["n"]}  {"[" + " ".join(hints) + "] " if hints else ""}{line["text"]}')
    else:
        json.dump(data, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
