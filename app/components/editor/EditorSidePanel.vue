<script setup lang="ts">
const { ui } = usePlan();
const config = useRuntimeConfig();
</script>

<template>
  <aside
    v-if="ui.side === 'styles' && config.public.showStylesPanel"
    class="side"
    aria-label="Styles"
  >
    <div class="side-head">
      <span class="px-2 text-sm font-semibold">Styles</span>

      <span class="flex-1" />

      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Close panel"
        @click="ui.side = null"
      />
    </div>

    <div class="side-body">
      <LazyEditorStylesPanel />
    </div>
  </aside>
</template>
