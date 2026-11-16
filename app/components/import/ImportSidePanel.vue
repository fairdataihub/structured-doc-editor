<script setup lang="ts">
import { useClipboard, useLocalStorage } from "@vueuse/core";
import type { TabsItem } from "@nuxt/ui";

// The right panel: read-only views of the plan. Editing happens in the plan; clicking here jumps
// to the block. Which tab is open and whether the panel is hidden are remembered in this browser.

const closed = defineModel<boolean>("closed", { required: true });

const { downloadUrl, jsonCollapsed, plan, sections, treeExpanded } =
  useDmpImport();

const view = useLocalStorage("dmp-view", "structure");
const { copy, copied } = useClipboard({ legacy: true });

const TABS: TabsItem[] = [
  { label: "Structure", value: "structure", slot: "structure" },
  { label: "JSON", value: "json", slot: "json" },
  { label: "Preview", value: "preview", slot: "preview" },
];

const treeAllFolded = computed(() => treeExpanded.value.length === 0);

const jsonAllFolded = computed(
  () =>
    sections.value.length > 0 &&
    sections.value.every((s) => jsonCollapsed.has(`s:${s.id}`)),
);

function toggleTree() {
  treeExpanded.value = treeAllFolded.value
    ? sections.value.map((s) => `s-${s.id}`)
    : [];
}

function toggleJson() {
  if (jsonAllFolded.value) jsonCollapsed.clear();
  else sections.value.forEach((s) => jsonCollapsed.add(`s:${s.id}`));
}

function copyView() {
  copy(
    view.value === "preview"
      ? narrativeToMarkdown(plan, sections.value)
      : JSON.stringify(
          narrativeToJson(plan, sections.value, downloadUrl.value),
          null,
          2,
        ),
  );
}
</script>

<template>
  <aside
    class="border-default bg-default flex min-h-0 overflow-hidden border-l max-[1000px]:flex-col max-[1000px]:border-t max-[1000px]:border-l-0"
    aria-label="Outline"
  >
    <UButton
      color="neutral"
      variant="soft"
      :title="closed ? 'Show the side panel' : 'Hide this panel'"
      :aria-expanded="!closed"
      aria-controls="import-panel-body"
      :class="closed ? 'w-full' : 'w-8'"
      class="flex-none flex-col justify-start rounded-none py-3.5 max-[1000px]:w-full max-[1000px]:flex-row max-[1000px]:justify-center"
      @click="closed = !closed"
    >
      <UIcon
        :name="
          closed ? 'i-lucide-panel-right-open' : 'i-lucide-panel-right-close'
        "
        class="size-4"
      />

      <span
        class="text-xs font-semibold [writing-mode:vertical-rl] max-[1000px]:[writing-mode:horizontal-tb]"
      >
        {{ closed ? "Structure · JSON · Preview" : "Hide panel" }}
      </span>
    </UButton>

    <div
      v-show="!closed"
      id="import-panel-body"
      class="min-w-0 flex-1 overflow-auto p-3.5"
    >
      <UTabs
        v-model="view"
        :items="TABS"
        size="xs"
        aria-label="Show the plan as"
      >
        <template #structure>
          <div class="mb-2 flex justify-end">
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              :label="treeAllFolded ? 'Expand' : 'Collapse'"
              @click="toggleTree"
            />
          </div>

          <ImportStructureTree />
        </template>

        <template #json>
          <div class="mb-2 flex justify-end gap-1.5">
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              :label="copied ? 'Copied' : 'Copy'"
              @click="copyView"
            />

            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              :label="jsonAllFolded ? 'Expand' : 'Collapse'"
              @click="toggleJson"
            />
          </div>

          <ImportJsonView />
        </template>

        <template #preview>
          <div class="mb-2 flex justify-end">
            <UButton
              color="neutral"
              variant="outline"
              size="xs"
              :label="copied ? 'Copied' : 'Copy'"
              @click="copyView"
            />
          </div>

          <ImportPreview />
        </template>
      </UTabs>
    </div>
  </aside>
</template>
