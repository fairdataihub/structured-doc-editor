<script setup lang="ts">
// The tools for editing the plan. It stays at the top of the plan while the plan scrolls.

const { allCollapsed, canUndo, reset, sections, setAllCollapsed, undo } =
  useDmpImport();

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const questionCount = computed(
  () => sections.value.flatMap((s) => s.questions).length,
);
</script>

<template>
  <div
    class="bg-muted sticky -top-4 z-10 -mx-5 -mt-4 mb-3 flex flex-wrap items-center gap-2 px-5 py-2 max-[1000px]:-mx-4"
    role="toolbar"
    aria-label="Plan tools"
  >
    <p class="text-muted mr-auto flex gap-3 text-sm">
      <span>{{ plural(sections.length, "section") }}</span>

      <span>{{ plural(questionCount, "question") }}</span>
    </p>

    <UButton
      color="neutral"
      variant="outline"
      :label="allCollapsed ? 'Expand all' : 'Collapse all'"
      @click="setAllCollapsed(!allCollapsed)"
    />

    <UButton
      color="neutral"
      variant="outline"
      label="Undo"
      icon="i-lucide-undo-2"
      :disabled="!canUndo"
      @click="undo"
    />

    <UButton
      color="neutral"
      variant="outline"
      label="Reset"
      title="Discard all changes and go back to the structure as it was imported"
      @click="reset"
    />
  </div>
</template>
