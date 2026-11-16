<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";

definePageMeta({
  layout: "import",
  middleware: "import-plan",
  colorMode: "light",
});

useSeoMeta({ title: "Review structure" });

const panel = useLocalStorage("dmp-panel", "open");

const panelClosed = computed({
  get: () => panel.value === "closed",
  set: (closed) => (panel.value = closed ? "closed" : "open"),
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <h1 class="sr-only">Review structure</h1>

    <div
      :class="
        panelClosed
          ? 'grid-cols-[190px_minmax(0,1fr)_44px]'
          : 'grid-cols-[190px_minmax(0,1fr)_minmax(400px,36%)]'
      "
      class="grid min-h-0 flex-1 max-[1000px]:grid-cols-1"
    >
      <ImportAddBlocks />

      <ImportPlanCanvas />

      <ImportSidePanel v-model:closed="panelClosed" />
    </div>
  </div>
</template>
