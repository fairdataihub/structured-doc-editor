<script setup lang="ts">
import { useEventListener, useLocalStorage } from "@vueuse/core";

// The frame of the /import flow: skip link, top bar and the one <main>. A new step moves focus to
// <main>, so keyboard and screen reader users start at the top of the step.

const { announcement, hasChanges } = useDmpImport();
const route = useRoute();
const colors = useLocalStorage("dmp-colors", "on");
const main = useTemplateRef("main");

useHead({
  bodyAttrs: {
    class: computed(
      () => `import-flow ${colors.value === "off" ? "import-no-color" : ""}`,
    ),
  },
});

// Closing or reloading the tab with edits asks first. Moving between pages of the app doesn't.
useEventListener(window, "beforeunload", (event) => {
  if (hasChanges()) event.preventDefault();
});

watch(
  () => route.path,
  async () => {
    await nextTick();
    main.value?.focus({ preventScroll: true });
    main.value?.scrollTo(0, 0);
  },
);
</script>

<template>
  <div class="bg-muted flex h-dvh flex-col text-sm max-[1000px]:h-auto">
    <a
      href="#import-main"
      class="focus:bg-default sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:p-2"
    >
      Skip to main content
    </a>

    <ImportHeader />

    <main
      id="import-main"
      ref="main"
      tabindex="-1"
      class="flex min-h-0 flex-1 flex-col overflow-auto outline-none"
    >
      <slot />
    </main>

    <NuxtRouteAnnouncer />

    <div class="sr-only" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<style src="~/assets/css/import.css"></style>
