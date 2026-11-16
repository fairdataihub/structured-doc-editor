<script setup lang="ts">
// The JSON tab: the export of the narrative as a foldable tree.

const { downloadUrl, plan, sections } = useDmpImport();

const json = computed(() =>
  narrativeToJson(plan, sections.value, downloadUrl.value),
);
</script>

<template>
  <div class="font-mono text-[11px] leading-normal">
    <ImportJsonNode :value="json" :path="[]" />
  </div>
</template>
