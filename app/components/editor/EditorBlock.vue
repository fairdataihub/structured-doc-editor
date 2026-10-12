<script setup lang="ts">
import type { MenuItem } from "~/composables/useBlockMenus";

// One block on the page: the margin controls (add, drag/menu), the generated number and
// the Tiptap text.

const props = defineProps<{
  block: Block;
  prefix?: string;
  selected: boolean;
}>();
const emit = defineEmits<{ grab: [e: PointerEvent, id: string] }>();

const plan = usePlan();
const menus = useBlockMenus();

const menuOpen = ref(false);
const addOpen = ref(false);
const blockItems = computed(() =>
  menuOpen.value ? menus.blockItems(props.block.id) : [],
);
const addItems = computed(() =>
  addOpen.value ? menus.addItems(props.block.id) : [],
);

// The handle both drags (press and move) and opens the block menu (click without moving).
let pressed: { x: number; y: number } | null = null;
function onHandleDown(e: PointerEvent) {
  pressed = { x: e.clientX, y: e.clientY };
  emit("grab", e, props.block.id);
}
function onHandleClick(e: MouseEvent) {
  if (pressed && Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) > 4)
    return;
  plan.select(props.block.id);
  menuOpen.value = true;
}
function onPrefixDown(e: PointerEvent) {
  if (props.block.type === "section") emit("grab", e, props.block.id);
}
function onBlockDown(e: PointerEvent) {
  if (!(e.target as HTMLElement).closest(".tx, .gut"))
    plan.select(props.block.id);
}
</script>

<template>
  <div
    class="b"
    :class="[`b-${block.type}`, { sel: selected }]"
    :data-id="block.id"
    :data-type="block.type"
    @pointerdown="onBlockDown"
  >
    <div v-if="block.type !== 'title'" class="gut" contenteditable="false">
      <UDropdownMenu
        v-model:open="addOpen"
        :items="addItems"
        :content="{ align: 'start' }"
      >
        <button
          type="button"
          class="g-add"
          tabindex="-1"
          aria-label="Add below"
          title="Add below"
        >
          <UIcon name="i-lucide-plus" class="size-3.5" />
        </button>

        <template #item-leading="{ item }">
          <span
            v-if="(item as MenuItem).swatch"
            class="sw"
            :class="`t-${(item as MenuItem).swatch}`"
          />
        </template>
      </UDropdownMenu>

      <button
        type="button"
        class="g-drag"
        tabindex="-1"
        :title="`${block.type === 'section' ? 'Drag to move this section' : 'Drag to move'} · click for options`"
        aria-label="Drag to move, click for options"
        @pointerdown.prevent="onHandleDown"
        @click="onHandleClick"
      >
        <UIcon name="i-lucide-grip-vertical" class="size-3.5" />
      </button>

      <!-- The block menu opens from a click on the handle; this span only anchors it. -->
      <UDropdownMenu
        v-model:open="menuOpen"
        :items="blockItems"
        :content="{ align: 'start' }"
      >
        <span class="g-anchor" aria-hidden="true" />

        <template #item-leading="{ item }">
          <span
            v-if="(item as MenuItem).swatch"
            class="sw"
            :class="`t-${(item as MenuItem).swatch}`"
          />

          <UIcon v-else-if="item.icon" :name="item.icon" class="size-4" />
        </template>
      </UDropdownMenu>
    </div>

    <span
      v-if="prefix"
      class="pre"
      contenteditable="false"
      :title="
        block.type === 'section' ? 'Drag to move this section' : undefined
      "
      @pointerdown="onPrefixDown"
      >{{ prefix }}</span
    >

    <EditorBlockText :key="`${block.id}-${block.type}`" :block="block" />
  </div>
</template>
