<script setup lang="ts">
import type { TreeItem } from "@nuxt/ui";

// The Structure tab: one row per section, description and question. A question's row stands for
// the whole card (question and answer). Clicking a row jumps to the block; only the chevron folds.

interface Row extends TreeItem {
  key: string;
  num: string;
  empty: boolean;
  tone: "section" | "description" | "question";
  target: ImportSelection;
  children?: Row[];
}

const { select, sections, selected, treeExpanded } = useDmpImport();

const rows = computed<Row[]>(() =>
  sections.value.map((section, i) => ({
    key: `s-${section.id}`,
    num: `S${i + 1}`,
    label: section.title.trim() || "Untitled",
    empty: !section.title.trim(),
    tone: "section",
    target: { kind: "section", id: section.id },
    children: [
      ...(section.description.trim()
        ? [
            {
              key: `d-${section.id}`,
              num: "Description",
              label: section.description.trim(),
              empty: false,
              tone: "description" as const,
              target: {
                kind: "section" as const,
                id: section.id,
                part: "description" as const,
              },
            },
          ]
        : []),
      ...section.questions.map((question, j) => ({
        key: `q-${question.id}`,
        num: `Question ${i + 1}.${j + 1}`,
        label: question.text.trim() || "Empty",
        empty: !question.text.trim(),
        tone: "question" as const,
        target: { kind: "question" as const, id: question.id },
      })),
    ],
  })),
);

function isSelected(row: Row) {
  const current = selected.value;

  if (current.kind !== row.target.kind || current.id !== row.target.id) {
    return false;
  }

  return row.tone === "question" || current.part === row.target.part;
}

const flatRows = computed(() =>
  rows.value.flatMap((row) => [row, ...(row.children ?? [])]),
);

const selectedRow = computed(() => flatRows.value.find(isSelected));

function onSelect(
  event: Event & { preventDefault: () => void },
  row: TreeItem,
) {
  select((row as Row).target, { scroll: true, focus: true });
}

/** Clicking a row jumps to it. It folds only from the chevron or the arrow keys. */
function onToggle(event: {
  preventDefault: () => void;
  detail: { originalEvent: Event };
}) {
  const original = event.detail.originalEvent;

  if (
    original.type === "click" &&
    !(original.target as HTMLElement).closest("[data-slot=linkTrailing]")
  ) {
    event.preventDefault();
  }
}

const TONE = {
  section: { dot: "rounded-[2px] bg-(--sec-c)", num: "text-(--sec-c)" },
  description: { dot: "bg-(--desc-c)", num: "text-(--desc-ink)" },
  question: { dot: "bg-(--q-c)", num: "text-(--q-ink)" },
};
</script>

<template>
  <UTree
    v-model:expanded="treeExpanded"
    :model-value="selectedRow"
    :items="rows"
    :get-key="(row) => row.key"
    size="sm"
    aria-label="Plan structure"
    :ui="{
      linkLabel: 'line-clamp-2 whitespace-normal text-left',
      link: 'items-start',
    }"
    @select="onSelect"
    @toggle="onToggle"
  >
    <template #item-leading="{ item }">
      <span
        :class="TONE[item.tone].dot"
        class="mt-1.5 size-2 flex-none rounded-full"
        aria-hidden="true"
      />

      <span
        :class="TONE[item.tone].num"
        class="min-w-7 flex-none text-[11px] leading-5 font-bold whitespace-nowrap"
      >
        {{ item.num }}
      </span>
    </template>

    <template #item-label="{ item }">
      <span
        :class="[
          item.empty ? 'text-muted italic' : '',
          item.tone === 'section' ? 'font-semibold text-(--sec-ink)' : '',
        ]"
        :title="item.label"
      >
        {{ item.label }}
      </span>
    </template>
  </UTree>
</template>
