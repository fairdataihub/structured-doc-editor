<script setup lang="ts">
// A question card. It carries its answer: they move and delete together.

const props = defineProps<{
  question: ImportQuestion;
  sectionIndex: number;
  index: number;
  sectionCount: number;
  questionCount: number;
}>();

const { collapsed, selected, setQuestionField } = useDmpImport();

const label = computed(
  () => `Question ${props.sectionIndex + 1}.${props.index + 1}`,
);

const isSelected = computed(
  () =>
    selected.value.kind === "question" &&
    selected.value.id === props.question.id,
);
</script>

<template>
  <div
    :id="`b-question-${question.id}`"
    data-kind="question"
    :data-id="question.id"
    :class="
      isSelected
        ? 'border-(--q-c) ring-3 ring-(--q-c)/20'
        : 'border-(--q-bd) hover:border-(--q-c)'
    "
    class="my-2.5 rounded-md border bg-(--q-bg) px-2.5 py-2"
  >
    <ImportBlockHead
      kind="question"
      :block-id="question.id"
      :label="label"
      :warning="question.text.trim() ? undefined : 'Needs question text'"
      :can-move-up="sectionIndex > 0 || index > 0"
      :can-move-down="
        sectionIndex < sectionCount - 1 || index < questionCount - 1
      "
    />

    <ImportBlockField
      :model-value="question.text"
      field="text"
      :label="label"
      placeholder="Question"
      text-class="font-semibold"
      @update:model-value="setQuestionField(question, 'text', $event)"
    />

    <div
      v-show="!collapsed.has(question.id)"
      class="mt-1.5 rounded-sm border border-(--a-bd) bg-(--a-bg) p-1"
    >
      <span
        class="block px-1 pt-0.5 text-[10px] font-bold tracking-wider text-(--a-ink) uppercase"
      >
        Answer
      </span>

      <ImportBlockField
        :model-value="question.answer"
        field="answer"
        :label="`Answer to question ${sectionIndex + 1}.${index + 1}`"
        placeholder="Answer"
        @update:model-value="setQuestionField(question, 'answer', $event)"
      />
    </div>
  </div>
</template>
