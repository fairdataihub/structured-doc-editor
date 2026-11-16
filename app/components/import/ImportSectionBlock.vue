<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";

// A section card: title, description, and its questions. A question can be dragged here from any
// section, and a new one from the left panel.

const props = defineProps<{
  section: ImportSection;
  index: number;
  sectionCount: number;
}>();

const emit = defineEmits<{
  moved: [questionId: number];
  added: [questionId: number];
}>();

const {
  checkpoint,
  collapsed,
  dropCheckpoint,
  selected,
  setSectionField,
  setSectionQuestions,
} = useDmpImport();

const label = computed(() => `Section ${props.index + 1}`);

const isSelected = computed(
  () =>
    selected.value.kind === "section" && selected.value.id === props.section.id,
);

const questionCountLabel = computed(() => {
  const n = props.section.questions.length;

  return `${n} question${n === 1 ? "" : "s"}`;
});

const QUESTION_GROUP = {
  name: "questions",
  put: (_to: unknown, _from: unknown, dragged: HTMLElement) =>
    !dragged.dataset.add || dragged.dataset.add === "question",
};

interface QuestionDrop {
  from: HTMLElement;
  to: HTMLElement;
  oldIndex?: number;
  newIndex?: number;
  item: HTMLElement;
}

function onEnd(event: QuestionDrop) {
  if (event.from === event.to && event.oldIndex === event.newIndex) {
    dropCheckpoint();

    return;
  }

  emit("moved", Number(event.item.dataset.id));
}

async function onAdd(event: QuestionDrop) {
  if (!event.item.dataset.add) return;

  await nextTick();

  const question = props.section.questions[event.newIndex ?? 0];

  if (question) emit("added", question.id);
}
</script>

<template>
  <section
    :id="`b-section-${section.id}`"
    data-kind="section"
    :data-id="section.id"
    :aria-label="label"
    :class="
      isSelected
        ? 'border-(--sec-c) ring-3 ring-(--sec-c)/20'
        : 'border-(--sec-bd) hover:border-(--sec-c)'
    "
    class="mt-5 rounded-md border bg-(--sec-bg) p-3"
  >
    <ImportBlockHead
      kind="section"
      :block-id="section.id"
      :label="label"
      :warning="section.title.trim() ? undefined : 'Needs a title'"
      :meta="questionCountLabel"
      :can-move-up="index > 0"
      :can-move-down="index < sectionCount - 1"
    />

    <ImportBlockField
      :model-value="section.title"
      field="title"
      :label="`${label} title`"
      placeholder="Section title"
      text-class="text-lg font-bold"
      @update:model-value="setSectionField(section, 'title', $event)"
    />

    <div v-show="!collapsed.has(section.id)">
      <div
        class="mt-1.5 mb-1 rounded-sm border border-(--desc-bd) bg-(--desc-bg) p-1"
      >
        <span
          class="block px-1 pt-0.5 text-[10px] font-bold tracking-wider text-(--desc-ink) uppercase"
        >
          Section description
        </span>

        <ImportBlockField
          :model-value="section.description"
          field="description"
          :label="`${label} description`"
          placeholder="Description of this section (optional)"
          text-class="text-sm italic"
          @update:model-value="setSectionField(section, 'description', $event)"
        />
      </div>

      <p
        v-if="!section.questions.length"
        class="border-default text-muted mt-2 rounded-md border border-dashed p-3 text-xs"
      >
        No questions yet. Click “Add Q&amp;A” on the left, or drag it here.
      </p>

      <VueDraggable
        :model-value="section.questions"
        :group="QUESTION_GROUP"
        handle=".question-handle"
        :animation="150"
        :force-fallback="true"
        :fallback-on-body="true"
        :empty-insert-threshold="24"
        ghost-class="import-drag-ghost"
        class="min-h-4 pl-1.5"
        @update:model-value="setSectionQuestions(section, $event)"
        @start="checkpoint"
        @end="onEnd"
        @add="onAdd"
      >
        <ImportQuestionBlock
          v-for="(question, j) in section.questions"
          :key="question.id"
          :question="question"
          :section-index="index"
          :index="j"
          :section-count="sectionCount"
          :question-count="section.questions.length"
        />
      </VueDraggable>
    </div>
  </section>
</template>
