# DMP Bridge

Review a Data Management Plan (DMP) extracted from a PDF, fix its structure and metadata, and export
it as JSON. Built with [Nuxt](https://nuxt.com) and [Nuxt UI](https://ui.nuxt.com).

## Quick start

You need Node 22 and pnpm 12 (versions are pinned in `mise.toml` and `package.json`).

```bash
pnpm install
pnpm dev           # http://localhost:3000
```

## How it works

The app opens on the upload step and has one page per step:

1. `/import`: upload a PDF. Upload isn't connected to the backend yet, so the NIH and NSF samples in
   `public/samples/import/` open instead.
2. `/import/structure`: review the title, sections, questions and answers.
3. `/import/metadata`: review the dataset metadata (RDA).
4. `/import/export`: copy or download the full DMP as JSON.

The plan is saved as a draft in the browser while you edit, so a refresh keeps your work.

## Project layout

```text
app/
  pages/import/                  the four steps
  components/import/             the components of each step
  composables/useDmpImport.ts    the store: plan, undo, draft
  utils/dmpNarrative.ts          narrative JSON in and out
  utils/dmpMetadata.ts           metadata fields
shared/types/dmpImport.ts        types
public/samples/import/           sample extraction JSON
```

## Checks

```bash
pnpm lint
pnpm build
```
