# Structured Document Editor

Edit a Data Management Plan (DMP) as structured blocks (title, section, section description,
question, answer) on real pages, with one fixed style, automatic numbering and drag-to-reorder.
Imports and exports JSON. Built on the
[FAIR Data Innovations Hub Nuxt starter](https://github.com/fairdataihub/nuxt-starter).

One deployment hosts two prototypes, linked from the home page.

## What it uses

| Part                  | Tool                                                                                                                                | Licence     | Where                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------- |
| Framework             | [Nuxt 4](https://nuxt.com) + [Nuxt UI 4](https://ui.nuxt.com)                                                                       | MIT         | whole app                                   |
| Block text editing    | [Tiptap 3](https://tiptap.dev/docs/editor/getting-started/install/nuxt) (one small editor per block)                                | MIT         | `app/components/editor/EditorBlockText.vue` |
| Outline drag and drop | [SortableJS](https://github.com/SortableJS/Sortable) via [vue-draggable-plus](https://github.com/Alfred-Skyblue/vue-draggable-plus) | MIT         | `app/components/editor/EditorOutline.vue`   |
| Paper font            | [Arimo](https://github.com/googlefonts/Arimo) (Arial metrics), regular and bold                                                     | SIL OFL 1.1 | `public/fonts/`                             |
| JSON validation       | [zod](https://zod.dev)                                                                                                              | MIT         | `app/utils/importExtraction.ts`             |

## Quick start

You need Node 22+ and pnpm 12. The exact pnpm version is pinned in `package.json`
(`packageManager`); with Corepack enabled (`corepack enable`), `pnpm` uses it automatically.

```bash
pnpm install
cp .env.example .env
pnpm dev           # http://localhost:3000
```

## How it works

### `/d`: Document editor

- **Start page** (`/d`): the PDF upload drop zone, marked "coming soon", and a button that opens the
  sample plan (`/d/plans/sample`, from `public/samples/sample1.json`). There is no upload yet.
- **Import** (`app/utils/importExtraction.ts`): the LLM's extraction JSON becomes a flat list of
  blocks. Markdown is removed (`app/utils/markdown.ts`), "A." or "1." prefixes become generated
  numbers, and a question that only repeats its section's title is dropped.
- **Blocks** are a title, sections, section descriptions, questions and answers. A section owns
  everything up to the next section and a question owns its answer, so moving one moves its
  contents. Numbers ("Element 4:", "1.", "2.") come from position, never typing.
- **One fixed style** (`shared/utils/paperStyle.ts`, `app/assets/css/paper.css`): no bold, italic
  or underline, and pasted text arrives plain. Blocks are measured and placed on Letter pages; a
  heading never ends a page.
- **Checking the structure** is up to the user; there are no automatic checks. The Structure view
  (on by default) colors each block by type, and a welcome panel explains how to work.
- **Export** is JSON in the extraction's shape (`toExtractionJson()`): section descriptions go to
  `section.description`, answers to their question. Edits are saved in the browser.

### `/x`: Component editor

A single static page, `public/x/index.html` (a temporary copy until the final version), with the
`sample1.pdf` its sample button loads. `/x` opens `/x/index.html` so its relative links resolve
inside `/x/`. Prettier skips `public/x/`, so the page stays as written.

## Project layout

```text
app/
  pages/index.vue                 home (/): links to /x and /d
  pages/d/index.vue               start page (/d)
  pages/d/plans/sample.vue        the editor on the sample plan, global shortcuts
  components/AppBrand.vue         logo, links home
  components/editor/              top bar, outline, toolbar, canvas, block, welcome panel, side panel, export
  composables/usePlan.ts          the store: blocks, undo, numbering, moves, splits
  composables/useBlockMenus.ts    Style / Move to / More / Add menus
  utils/                          import and export, markdown cleanup, numbering, structure
  assets/css/main.css             editor chrome (imports paper.css)
  assets/css/paper.css            the plan's pages: the one fixed style
shared/
  types/dmp.ts                    plan and extraction JSON types
  utils/paperStyle.ts             the one style: paper, margins, font, each block type's look
  utils/paperHtml.ts              block markup for page measuring and the Styles panel
public/
  fonts/                          Arimo WOFF2 files + licence
  samples/sample1.json            the sample plan the editor loads
  x/                              the teammate's prototype (index.html, sample1.pdf)
```

## Settings

| Variable                        | Default | What it does                                             |
| ------------------------------- | ------- | -------------------------------------------------------- |
| `NUXT_PUBLIC_SHOW_STYLES_PANEL` | `true`  | Set to `false` to hide the Styles panel from researchers |

## License

MIT, see [LICENSE](LICENSE). The Arimo font files in `public/fonts/` are under the SIL Open Font
License 1.1 ([LICENSE-arimo.txt](public/fonts/LICENSE-arimo.txt)).
