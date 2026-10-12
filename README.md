# Structured Document Editor

Edit structured documents (sections, questions, answers) on real pages with a fixed style, automatic
numbering and drag-to-reorder. Imports and exports JSON. Prototype built for Data Management
Plans (DMPs), on the [FAIR Data Innovations Hub Nuxt starter](https://github.com/fairdataihub/nuxt-starter).

Users edit the plan directly on Letter pages, move sections by dragging (they renumber and restyle
themselves), and check the structure themselves: the `Structure` view (on by default) colors every
block by type. Every document uses one fixed style to create one consistent look.

The start page (`/`) shows where PDF upload will go, marked "coming soon", and opens the one sample
plan (`/plans/sample`, from `public/samples/sample1.json`). There is no upload yet.

## Quick start

You need Node 22+ and pnpm 12. The exact pnpm version is pinned in `package.json` (`packageManager`);
with Corepack enabled (`corepack enable`), `pnpm` switches to it by itself. Python 3 is only needed for
the extraction scripts.

```bash
pnpm install
cp .env.example .env
pnpm dev           # http://localhost:3000
```

## Deploying to Vercel

Nothing else needs hosting: Vercel detects Nuxt and builds it. In the project settings, use Node 22
and set `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel installs with the pnpm version pinned in
`package.json`. The `Dockerfile` builds the same app as a container, if you'd rather self-host.

## What it uses

| Part                           | Tool                                                                                                                                | Licence         | Where                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------- |
| Framework                      | [Nuxt 4](https://nuxt.com) + [Nuxt UI 4](https://ui.nuxt.com)                                                                       | MIT             | whole app                                   |
| Block text editing             | [Tiptap 3](https://tiptap.dev/docs/editor/getting-started/install/nuxt) (one small editor per block)                                | MIT             | `app/components/editor/EditorBlockText.vue` |
| Outline drag and drop          | [SortableJS](https://github.com/SortableJS/Sortable) via [vue-draggable-plus](https://github.com/Alfred-Skyblue/vue-draggable-plus) | MIT             | `app/components/editor/EditorOutline.vue`   |
| Drag on the page               | Our own small pointer-event engine (switches to section cards mid-drag)                                                             | MIT (this repo) | `app/components/editor/EditorCanvas.vue`    |
| Paper font                     | [Arimo](https://github.com/googlefonts/Arimo) (Arial metrics), regular and bold                                                     | SIL OFL 1.1     | `public/fonts/`                             |
| Reading the PDF's own text     | [pdfplumber](https://github.com/jsvine/pdfplumber) (extraction scripts only, not the editor)                                        | MIT             | `extraction/read_pdf.py`                    |
| Validating the extraction JSON | [zod](https://zod.dev)                                                                                                              | MIT             | `app/utils/importExtraction.ts`             |

The UI fonts (Instrument Sans, IBM Plex Mono) are self-hosted by Nuxt Fonts, which comes with Nuxt UI.

## How it works

```text
sample1.json (LLM extraction) ─► app/utils/importExtraction.ts ─► flat list of blocks + review items
                                  (markdown removed)                (repeated headings, unnumbered questions,
                                                                     "Element N" references a move made stale)

blocks ─► EditorCanvas: measure in a hidden flow (shared/utils/paperHtml.ts) ─► page breaks ─► blocks placed on Letter pages
       └► Export: toExtractionJson() ─► JSON in the extraction's shape, with the edits
```

- **The plan is a flat list of blocks** of five types: title, section, question, answer and list. The
  same names are used in the code, the legend, the menus and the Styles panel. A section owns everything
  until the next section; a question owns its answer until the next heading. Moving a section moves that
  range. Numbers ("Element 4:", and "1.", "2.", "3." for questions in each section) are generated from
  position, never typed. Letters from the PDF ("A.", "B.") are read as numbers on import.
- **People check the structure themselves.** Nothing is compared with the original PDF. The
  Structure view (on by default, toggled in the toolbar) colours each block by type, with a legend:
  title, section, question, answer, list. A mislabelled block is fixed with the Style menu.
- **One fixed style** (`shared/utils/paperStyle.ts` and `app/assets/css/paper.css`, the NIH standard
  layout). Blocks store only their type and plain words. There is no bold, italic or underline anywhere:
  the toolbar has no buttons for them, Ctrl+B/I/U do nothing, and pasted text arrives as plain text.
- **Markdown is removed** (`app/utils/markdown.ts`). LLM output like `**bold**`, `_italic_`,
  `# headings`, `[links](…)`, `` `code` `` or `<u>tags</u>` is cleaned on import and on paste, keeping
  the words. Bulleted and numbered lines in an answer become list blocks.
- **Page breaks** fall between blocks, and a heading is never left alone at the bottom of a page. The
  editor measures blocks in a hidden flow built with `flowHtml()`, with the same markup and CSS as the
  pages on screen.
- **Export is JSON only.** `toExtractionJson()` writes the plan back in the extraction's shape, so
  whatever reads the extraction today keeps working. Section and question numbers are part of their
  titles.

## Verified

Tested in headless Chrome against a production build (`pnpm build`):

- Structure view on by default with its legend, in a fresh browser. No Original PDF panel, and
  nothing loads pdf.js or the PDF's line files.
- Review: the unnumbered question, the repeated headings, and the "Element 5" cross-reference flagged
  after a reorder.
- Moves: Alt+↑ in the outline, SortableJS drag of a question into another section, dragging "Element 5:"
  on the page through the section-card view; numbers update and the changed ones are highlighted.
- Typing, Enter to split, Backspace to join, undo.
- No emphasis: no B/I/U buttons, and Ctrl+B/I/U are blocked.
- Markdown: an extraction with `**…**` and `#` headings, `**A.**`/`1.`/`2)` question labels, bullets, a
  link, `code`, `<u>` and a rule imports as clean text, numbered questions and list blocks.
- Start page: the drop zone is shown but switched off, a dropped file doesn't leave the page, and
  "Open the sample plan" opens the editor. The logo leads back.
- JSON export: "Download JSON" saves the plan in the extraction's shape.

This is one sample in one browser; Firefox and Safari were not tested.

## Extraction scripts

```bash
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r extraction/requirements.txt

# The PDF's own lines as JSON, or numbered for an LLM prompt
python extraction/read_pdf.py public/samples/sample1.pdf > public/samples/sample1.lines.json
python extraction/read_pdf.py public/samples/sample1.pdf --numbered

# Option A check: where did the LLM change the words? (sample1: 3 of 12 answers)
python extraction/check_extraction.py public/samples/sample1.json \
  public/samples/sample1.lines.json public/samples/sample1.labels.json
```

`extraction/prompt.md` and `extraction/labels.schema.json` describe option B: the LLM returns line
ranges instead of retyping text, so the words are exact by design. `sample1.labels.json` was written by
hand to stand in for that output. These scripts are for working on the extraction; the editor doesn't
use their output.

## Project layout

```text
app/
  pages/index.vue                 start page: upload drop zone (coming soon), "Open the sample plan"
  pages/plans/sample.vue          the editor on the sample plan, global shortcuts
  components/AppBrand.vue         logo, links to the start page
  components/editor/              top bar, outline, toolbar, canvas, block, review dock, side panels, export
  composables/usePlan.ts          the store: blocks, undo, numbering, moves, splits
  composables/useReview.ts        what needs a look, and the one-click fixes
  composables/useBlockMenus.ts    Style / Move to / More / Add menus (Nuxt UI dropdowns)
  utils/                          import, markdown cleanup, numbering, structure
  assets/css/main.css             editor chrome (imports paper.css)
  assets/css/paper.css            the plan's pages: the one fixed style and its font
shared/
  types/dmp.ts                    plan and extraction JSON types
  utils/paperStyle.ts             the one style: paper, margins, font, what each block type looks like
  utils/paperHtml.ts              block markup + inline HTML sanitizer (measuring flow, Styles panel)
public/fonts/                     Arimo WOFF2 files (regular, bold) + licence
extraction/                       pdfplumber scripts, option B prompt and schema
public/samples/                   sample1.json (loaded by the editor); sample1.pdf, lines and labels (extraction scripts)
```

## Settings

| Variable                        | Default | What it does                                             |
| ------------------------------- | ------- | -------------------------------------------------------- |
| `NUXT_PUBLIC_SHOW_STYLES_PANEL` | `true`  | Set to `false` to hide the Styles panel from researchers |

## Removed from the starter

Authentication (nuxt-auth-utils, argon2, login/signup/verify pages, middleware), the database
(Prisma, Kysely, Postgres, their compose file and migrations step), email (nodemailer), the demo
dashboard pages and components, and unused libraries (dayjs, date-fns, marked, sanitize-html, nanoid,
cuid2, faker, typography plugin). The app renders client-side (`ssr: false`) because Tiptap needs the
browser.

## Known limits

- **One sample, no upload.** Wiring upload means running the LLM extraction on the server.
- **No PDF export.** Plans export as JSON only.
- **Paragraphs don't split across pages.** A paragraph that doesn't fit moves to the next page whole.
- **One Tiptap editor per block.** Selecting text across blocks and pasting several paragraphs at once
  aren't supported; paste is plain text. A single ProseMirror document with custom nodes would remove this.
- **Saved in the browser only** (localStorage). "Start over" in the file menu reloads the extraction.
- **Saved plans and view settings from earlier versions** aren't migrated: the editor re-imports the
  extraction once and the Structure view comes back on. Typed markdown (as opposed to pasted) is left
  as typed.
- **Lint doesn't run yet.** The starter pins TypeScript 7.0.2, which typescript-eslint doesn't support.
  Prettier works (`pnpm lint:fix` formats, then stops at ESLint). Pinning TypeScript 6 would fix it.
  The starter's `eslint.config.mjs` import was also fixed to `./.nuxt/eslint.config.mjs` for Node 24.
- **Dev console:** the starter's Nuxt DevTools (4.0 alpha) can log `DTK0013 Unauthorized access` in
  `pnpm dev` until you open DevTools and authorize the browser. It doesn't affect the app.
- **pnpm policy kept:** `pnpm-workspace.yaml` only installs releases older than 5 days.
- **dnd-kit:** its [Vue adapter](https://dndkit.com/vue/quickstart) could replace both vue-draggable-plus
  and the page drag engine if the team prefers one library.

## License

MIT, see [LICENSE](LICENSE). The Arimo font files in `public/fonts/` are under the SIL Open Font
License 1.1 ([LICENSE-arimo.txt](public/fonts/LICENSE-arimo.txt)).
