<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";

// The left panel: click to add below the selected item, or drag into the plan.

const { addQuestion, addSection, checkpoint, dropCheckpoint, sections } =
  useDmpImport();

const BLOCKS = [
  {
    add: "section",
    letter: "S",
    tone: "bg-(--sec-soft) text-(--sec-ink)",
    title: "Add section",
    hint: "A new DMP section (title and description) after the selected one",
  },
  {
    add: "question",
    letter: "Q",
    tone: "bg-(--q-soft) text-(--q-ink)",
    title: "Add Q&A",
    hint: "A question and its answer in the selected section",
  },
] as const;

// The palette stays as it is; what lands in the plan is a new empty block.
const palette = ref([...BLOCKS]);

const cloneBlock = (block: (typeof BLOCKS)[number]) =>
  block.add === "section" ? newImportSection() : newImportQuestion();

function onDragEnd(event: { from: HTMLElement; to: HTMLElement }) {
  if (event.to === event.from) dropCheckpoint();
}
</script>

<template>
  <aside
    class="border-default bg-default overflow-auto border-r p-3.5 max-[1000px]:border-r-0 max-[1000px]:border-b"
    aria-labelledby="import-add-heading"
  >
    <h2
      id="import-add-heading"
      class="text-muted mb-2.5 text-xs font-semibold tracking-wider uppercase"
    >
      Add block
    </h2>

    <p class="text-muted mb-3 text-xs">
      Click to add below the selected item, or drag into the plan.
    </p>

    <VueDraggable
      v-model="palette"
      :group="{ name: 'palette', pull: 'clone', put: false }"
      :sort="false"
      :clone="cloneBlock"
      filter=":disabled"
      :prevent-on-filter="false"
      :force-fallback="true"
      :fallback-on-body="true"
      class="flex flex-col gap-2 max-[1000px]:flex-row"
      @start="checkpoint"
      @end="onDragEnd"
    >
      <UButton
        v-for="block in palette"
        :key="block.add"
        :data-add="block.add"
        color="neutral"
        variant="outline"
        class="w-full items-start text-left"
        :disabled="block.add === 'question' && !sections.length"
        @click="block.add === 'section' ? addSection() : addQuestion()"
      >
        <span
          :class="block.tone"
          class="grid size-6 flex-none place-items-center rounded-md text-xs font-bold"
          aria-hidden="true"
        >
          {{ block.letter }}
        </span>

        <span class="min-w-0">
          <strong class="block">{{ block.title }}</strong>

          <small class="text-muted mt-0.5 block font-normal">
            {{ block.hint }}
          </small>
        </span>
      </UButton>
    </VueDraggable>
  </aside>
</template>
