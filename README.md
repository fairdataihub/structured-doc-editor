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


## What it uses

| Part                           | Tool                                                                                                                                | Licence         | Where                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------- |
| Framework                      | [Nuxt 4](https://nuxt.com) + [Nuxt UI 4](https://ui.nuxt.com)                                                                       | MIT             | whole app                                   |
| Block text editing             | [Tiptap 3](https://tiptap.dev/docs/editor/getting-started/install/nuxt) (one small editor per block)                                | MIT             | `app/components/editor/EditorBlockText.vue` |
| Outline drag and drop          | [SortableJS](https://github.com/SortableJS/Sortable) via [vue-draggable-plus](https://github.com/Alfred-Skyblue/vue-draggable-plus) | MIT             | `app/components/editor/EditorOutline.vue`   |
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

## License

MIT, see [LICENSE](LICENSE). The Arimo font files in `public/fonts/` are under the SIL Open Font
License 1.1 ([LICENSE-arimo.txt](public/fonts/LICENSE-arimo.txt)).
