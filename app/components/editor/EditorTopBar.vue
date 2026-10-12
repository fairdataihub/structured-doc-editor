<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const plan = usePlan();
const review = useReview();
const { ui, meta, saveStatus, exportOpen } = plan;
const config = useRuntimeConfig();

const count = computed(() => review.openIssues.value.length);

function toggleReview() {
  if (review.dock.mode) {
    review.close();
  } else if (!ui.introSeen) {
    review.show("intro");
  } else {
    review.start();
  }
}

function toggleStyles() {
  ui.side = ui.side === "styles" ? null : "styles";
}

const fileItems: DropdownMenuItem[][] = [
  [{ type: "label", label: "sample1.pdf" }],
  [
    {
      label: "Start over from the extraction",
      icon: "i-lucide-rotate-ccw",
      onSelect: () => plan.startOver(),
    },
    {
      label: "Show the intro again",
      icon: "i-lucide-info",
      onSelect: () => review.show("intro"),
    },
  ],
  [
    {
      label: "Back to the start page",
      icon: "i-lucide-arrow-left",
      to: "/",
    },
  ],
];
</script>

<template>
  <header class="top">
    <UButton
      class="only-narrow"
      icon="i-lucide-list-tree"
      color="neutral"
      variant="ghost"
      aria-label="Show outline"
      @click="ui.outlineOpen = !ui.outlineOpen"
    />

    <AppBrand />

    <UDropdownMenu :items="fileItems">
      <button class="file" type="button">
        <span class="file-name">
          {{ meta.fileName }}
          <UIcon name="i-lucide-chevron-down" class="size-3" />
        </span>

        <span class="file-state">{{ saveStatus }}</span>
      </button>
    </UDropdownMenu>

    <span class="flex-1" />

    <UButton
      :color="count ? 'warning' : 'success'"
      variant="soft"
      :icon="count ? 'i-lucide-circle-alert' : 'i-lucide-circle-check'"
      @click="toggleReview"
    >
      {{ count ? `${count} to check` : "All checked" }}
    </UButton>

    <UButton
      v-if="config.public.showStylesPanel"
      color="neutral"
      variant="ghost"
      icon="i-lucide-type"
      :active="ui.side === 'styles'"
      active-variant="soft"
      active-color="primary"
      @click="toggleStyles"
    >
      <span class="lbl-wide">Styles</span>
    </UButton>

    <UColorModeButton />

    <UButton color="primary" icon="i-lucide-download" @click="exportOpen = true"
      >Export</UButton
    >
  </header>
</template>
