"""Compare an LLM extraction (option A: the LLM retyped the text) with the PDF's own words.

    python extraction/check_extraction.py public/samples/sample1.json \
        public/samples/sample1.lines.json public/samples/sample1.labels.json

For every answer it rebuilds the text from the PDF lines named in the labels file and diffs it
word by word against the LLM's answer. On sample1 it reports 3 of 12 answers changed.
With option B (the LLM only labels lines) this check is unnecessary: the words come from the PDF.
"""

import argparse
import difflib
import json
import re


def join_lines(lines):
    """Join lines into running text. A hyphen at the end of a line is kept and joined ("sub-" + "study")."""
    out = ""
    for line in lines:
        text = line["text"].strip()
        if not text:
            continue
        if out.endswith("-") and re.match(r"[a-z]", text):
            out += text
        else:
            out += (" " if out else "") + text
    return re.sub(r"\s+", " ", out)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("extraction")
    parser.add_argument("lines")
    parser.add_argument("labels")
    args = parser.parse_args()

    extraction = json.load(open(args.extraction, encoding="utf8"))
    lines = json.load(open(args.lines, encoding="utf8"))["lines"]
    labels = {e["key"]: e for e in json.load(open(args.labels, encoding="utf8"))["elements"]}

    sections = sorted(extraction["narrative"]["template"]["section"], key=lambda s: s["order"])
    total = changed = 0
    for si, section in enumerate(sections):
        for qi, question in enumerate(sorted(section["question"], key=lambda q: q["order"])):
            key = f"s{si}q{qi}a"
            if key not in labels:
                print(f"{key}: no label, skipped")
                continue
            total += 1
            start, end = labels[key]["lines"]
            pdf_words = join_lines([l for l in lines if start <= l["n"] <= end]).split(" ")
            llm_words = re.sub(r"\s+", " ", question["answer"]["json"]["answer"]).strip().split(" ")
            ops = difflib.SequenceMatcher(None, llm_words, pdf_words, autojunk=False).get_opcodes()
            diffs = [(" ".join(llm_words[a:b]), " ".join(pdf_words[c:d])) for op, a, b, c, d in ops if op != "equal"]
            name = f"Section {si + 1}, answer {qi + 1}"
            if diffs:
                changed += 1
                print(f"{name}: {len(diffs)} change(s)")
                for llm, pdf in diffs:
                    print(f'    LLM "{llm}"  ->  PDF "{pdf}"')
            else:
                print(f"{name}: matches the PDF")
    print(f"\n{changed} of {total} answers differ from the PDF")


if __name__ == "__main__":
    main()
