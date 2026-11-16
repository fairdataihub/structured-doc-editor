<script setup lang="ts">
import { useResizeObserver } from "@vueuse/core";

// One editable text of the plan: a borderless box that grows with its text. A wider or narrower
// plan (panel toggled, window resized) changes how the text wraps, so it measures again then.

defineProps<{
  field: string;
  label: string;
  placeholder?: string;
  textClass?: string;
}>();

const model = defineModel<string>({ required: true });
const box = useTemplateRef("box");

useResizeObserver(
  () => box.value?.textareaRef as HTMLTextAreaElement | undefined,
  () => box.value?.autoResize(),
);
</script>

<template>
  <UTextarea
    ref="box"
    v-model="model"
    autoresize
    :rows="1"
    variant="none"
    class="w-full"
    :data-field="field"
    :aria-label="label"
    :placeholder="placeholder"
    :ui="{
      base: [
        'focus-visible:ring-primary resize-none rounded-sm bg-transparent px-1 py-0.5 leading-normal focus-visible:bg-white/70 focus-visible:ring-2',
        textClass,
      ],
    }"
  />
</template>
