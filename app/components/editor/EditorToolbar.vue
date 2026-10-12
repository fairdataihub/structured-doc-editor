<script setup lang="ts">
const plan = usePlan();
const menus = useBlockMenus();
const { ui, sel, canUndo, canRedo, pageCount, scale } = plan;
const LEGEND: BlockType[] = ["title", "section", "question", "answer", "list"];

const block = computed(() => plan.byId(sel.value));
const styleItems = computed(() =>
  sel.value ? menus.styleItems(sel.value) : [],
);
const moveItems = computed(() => (sel.value ? menus.moveItems(sel.value) : []));
const moreItems = computed(() =>
  sel.value ? menus.blockItems(sel.value, false) : [],
);

function zoom(delta: number) {
  ui.zoom = Math.max(
    0.4,
    Math.min(2, Math.round((scale.value + delta) * 10) / 10),
  );
}
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Edit">
    <UTooltip text="Undo" :kbds="['meta', 'z']">
      <UButton
        icon="i-lucide-undo-2"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!canUndo"
        aria-label="Undo"
        @mousedown.prevent
        @click="plan.undo()"
      />
    </UTooltip>

    <UTooltip text="Redo" :kbds="['meta', 'shift', 'z']">
      <UButton
        icon="i-lucide-redo-2"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!canRedo"
        aria-label="Redo"
        @mousedown.prevent
        @click="plan.redo()"
      />
    </UTooltip>

    <span class="tsep" />

    <UDropdownMenu
      :items="styleItems"
      :content="{ align: 'start' }"
      :disabled="!block || block.type === 'title'"
    >
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        class="min-w-40 justify-start"
        trailing-icon="i-lucide-chevron-down"
        :disabled="!block || block.type === 'title'"
      >
        <span v-if="block" class="sw" :class="`t-${block.type}`" />

        {{ block ? TYPE_LABEL[block.type] : "Select a block" }}
      </UButton>

      <template #item-leading="{ item }">
        <span
          v-if="(item as MenuItem).swatch"
          class="sw"
          :class="`t-${(item as MenuItem).swatch}`"
        />
      </template>
    </UDropdownMenu>

    <span class="tsep" />

    <UTooltip text="Move up" :kbds="['alt', 'arrowup']">
      <UButton
        icon="i-lucide-arrow-up"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!block || block.type === 'title'"
        aria-label="Move up"
        @mousedown.prevent
        @click="plan.nudge(sel!, -1)"
      />
    </UTooltip>

    <UTooltip text="Move down" :kbds="['alt', 'arrowdown']">
      <UButton
        icon="i-lucide-arrow-down"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!block || block.type === 'title'"
        aria-label="Move down"
        @mousedown.prevent
        @click="plan.nudge(sel!, 1)"
      />
    </UTooltip>

    <UDropdownMenu
      :items="moveItems"
      :content="{ align: 'start' }"
      :disabled="!block || block.type === 'title'"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        trailing-icon="i-lucide-chevron-down"
        :disabled="!block || block.type === 'title'"
        >Move to…</UButton
      >

      <template #item-leading="{ item }">
        <span
          v-if="(item as MenuItem).swatch"
          class="sw"
          :class="`t-${(item as MenuItem).swatch}`"
        />
      </template>
    </UDropdownMenu>

    <UDropdownMenu
      :items="moreItems"
      :content="{ align: 'start' }"
      :disabled="!moreItems.length"
    >
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="!moreItems.length"
        aria-label="More actions"
      />
    </UDropdownMenu>

    <span class="flex-1" />

    <USwitch
      v-model="ui.structure"
      label="Structure"
      size="sm"
      class="shrink-0 px-2"
    />

    <span class="tsep z-sep" />

    <div class="zoom flex shrink-0 items-center">
      <UButton
        icon="i-lucide-minus"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Zoom out"
        @click="zoom(-0.1)"
      />

      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        class="w-14 justify-center font-mono"
        @click="ui.zoom = 'fit'"
        >{{ Math.round(scale * 100) }}%</UButton
      >

      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Zoom in"
        @click="zoom(0.1)"
      />
    </div>

    <span
      class="pages-chip"
      :class="{ over: pageCount > 2 }"
      :title="
        pageCount > 2
          ? 'NIH recommends a Data Management and Sharing Plan of 2 pages or fewer'
          : 'Within the NIH recommendation of 2 pages or fewer'
      "
    >
      {{ pageCount }} page{{ pageCount === 1 ? "" : "s" }}
    </span>
  </div>

  <div v-if="ui.structure" class="legend">
    <span v-for="t in LEGEND" :key="t"
      ><i class="sw" :class="`t-${t}`" />{{ TYPE_LABEL[t] }}</span
    >

    <span class="note">Same colours as the highlight view</span>
  </div>
</template>
