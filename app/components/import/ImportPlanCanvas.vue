<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";

// The plan itself: title, then the sections. Clicking or tabbing into a block selects it, and the
// innermost block wins, so one listener here handles every block.

const {
  announce,
  checkpoint,
  dropCheckpoint,
  locate,
  plan,
  sections,
  select,
  selected,
} = useDmpImport();

const SECTION_GROUP = {
  name: "sections",
  pull: false,
  put: (_to: unknown, _from: unknown, dragged: HTMLElement) =>
    dragged.dataset.add === "section",
};

function selectionAt(target: HTMLElement): ImportSelection | null {
  const block = target.closest<HTMLElement>("[data-kind]");

  if (!block) return null;

  const kind = block.dataset.kind as ImportBlockKind;
  const field = target.closest<HTMLElement>("[data-field]")?.dataset.field;

  const part =
    (kind === "section" && field === "description") ||
    (kind === "question" && field === "answer")
      ? (field as ImportBlockPart)
      : undefined;

  return {
    kind,
    id: kind === "plan" ? undefined : Number(block.dataset.id),
    part,
  };
}

function onFocusIn(event: FocusEvent) {
  const selection = selectionAt(event.target as HTMLElement);

  if (selection) select(selection);
}

function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  if (target.closest("button")) return;

  const selection = selectionAt(target);

  if (selection) select(selection);
}

interface SectionDrop {
  oldIndex?: number;
  newIndex?: number;
  item: HTMLElement;
}

function onSectionEnd(event: SectionDrop) {
  if (event.oldIndex === event.newIndex) {
    dropCheckpoint();

    return;
  }

  select({ kind: "section", id: Number(event.item.dataset.id) });
  announce(`Section moved to position ${(event.newIndex ?? 0) + 1}`);
}

async function onSectionAdd(event: SectionDrop) {
  if (event.item.dataset.add !== "section") return;

  await nextTick();

  const section = sections.value[event.newIndex ?? 0];

  if (section) {
    select({ kind: "section", id: section.id }, { focus: true });
    announce("Section added");
  }
}

function onQuestionMoved(id: number) {
  select({ kind: "question", id });

  const at = locate(id);

  if (at) {
    announce(`Question moved to section ${at.si + 1}, position ${at.j + 1}`);
  }
}

function onQuestionAdded(id: number) {
  select({ kind: "question", id }, { focus: true });
  announce("Question added");
}
</script>

<template>
  <div
    class="import-canvas overflow-auto px-5 py-4 max-[1000px]:p-4"
    @focusin="onFocusIn"
    @click="onClick"
  >
    <ImportPlanToolbar />

    <article
      class="border-default bg-default rounded-lg border p-7 pb-12 shadow-xs max-[1000px]:px-5"
      aria-label="Plan"
    >
      <div
        id="b-plan"
        data-kind="plan"
        :class="
          selected.kind === 'plan'
            ? 'border-(--title-c) ring-3 ring-(--title-c)/20'
            : 'border-(--title-bd) hover:border-(--title-c)'
        "
        class="relative mb-5 rounded-md border px-1.5 pt-5.5 pb-1.5"
      >
        <span
          class="absolute top-1 left-2 text-[11px] font-bold tracking-wider text-(--title-ink) uppercase"
        >
          Title
        </span>

        <ImportBlockField
          v-model="plan.title"
          field="title"
          label="DMP title"
          placeholder="DMP title"
          text-class="text-center text-2xl font-bold tracking-tight"
        />
      </div>

      <VueDraggable
        v-model="sections"
        :group="SECTION_GROUP"
        handle=".section-handle"
        :animation="150"
        :force-fallback="true"
        :fallback-on-body="true"
        ghost-class="import-drag-ghost"
        @start="checkpoint"
        @end="onSectionEnd"
        @add="onSectionAdd"
      >
        <ImportSectionBlock
          v-for="(section, i) in sections"
          :key="section.id"
          :section="section"
          :index="i"
          :section-count="sections.length"
          @moved="onQuestionMoved"
          @added="onQuestionAdded"
        />
      </VueDraggable>
    </article>
  </div>
</template>
