# Option B prompt: label lines, don't retype them

Send the numbered lines from `read_pdf.py --numbered` and ask the model to return line ranges only.
Use your provider's JSON-schema (structured output) mode with `labels.schema.json`, then check the
result in code: ranges in order, no overlaps, every line covered once.

```text
Below are the lines of a Data Management Plan, numbered L1, L2, ... Formatting hints are in brackets.

Label the structure. Return JSON with an "elements" array. Each element has:
- "type": "title", "section", "question" or "answer"
- "lines": [first, last] line numbers, inclusive
- "key": s<section index>, s<section index>q<question index>, or the question key + "a" for its answer
  (indexes start at 0). If a section has no sub-questions, its text is answer "s<i>q0a".

Rules:
- Do not copy, fix or rewrite any text. Only return line numbers.
- Every line belongs to exactly one element, in order.

<lines>
L1  [bold] DATA MANAGEMENT AND SHARING PLAN
L2  [bold] Element 1: Data Type:
...
</lines>
```

`public/samples/sample1.labels.json` shows the expected answer for sample1. It was written by hand
to stand in for the model's output.
