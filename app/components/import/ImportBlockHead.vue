<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

// The header of a section or question card: drag handle, fold, the type menu and the move and
// delete buttons. Dragging has keyboard equivalents here: the up and down buttons.

const props = defineProps<{
  kind: "section" | "question";
  blockId: number;
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  warning?: string;
  meta?: string;
}>();

const {
  changeType,
  collapsed,
  moveQuestion,
  moveSection,
  removeBlock,
  typeEffect,
} = useDmpImport();

// An arrow that can't move further is clearly grayed out, not only on hover.
const MOVE_BUTTON =
  "text-muted focus-visible:outline-primary focus-visible:outline-2 disabled:text-slate-300 disabled:opacity-100";

const TOOLTIP_DELAY = 200;

const isSection = computed(() => props.kind === "section");
const folded = computed(() => collapsed.has(props.blockId));

// A type change puts the caret in the block to fix, so closing the menu must not take it back.
// Escape still returns to the type button.
let typeChanged = false;

function onMenuCloseAutoFocus(event: Event) {
  if (typeChanged) event.preventDefault();

  typeChanged = false;
}

const typeItems = computed<DropdownMenuItem[][]>(() => [
  [{ type: "label", label: `Change this ${props.kind} to…` }],
  [
    {
      label: isSection.value ? "Section (current)" : "Question (current)",
      disabled: true,
    },
    {
      label: isSection.value ? "Question" : "Section",
      description: typeEffect(props.kind, props.blockId),
      color: "primary",
      class: "data-highlighted:before:bg-primary/15",
      ui: { itemLabel: "font-semibold" },
      onSelect: () => {
        typeChanged = true;
        changeType(props.kind, props.blockId);
      },
    },
  ],
]);

function toggle() {
  if (folded.value) collapsed.delete(props.blockId);
  else collapsed.add(props.blockId);
}

async function move(direction: -1 | 1, act: "up" | "down") {
  if (isSection.value) moveSection(props.blockId, direction);
  else moveQuestion(props.blockId, direction);

  // The card moved in the page, so put focus back on the button that was pressed.
  await nextTick();

  // At the top or bottom that button is now disabled, so focus goes to the other one.
  const buttons = document.querySelectorAll<HTMLElement>(
    `#b-${props.kind}-${props.blockId} [data-act]:not(:disabled)`,
  );

  const pressed = [...buttons].find((button) => button.dataset.act === act);

  (pressed ?? buttons[0])?.focus();
}
</script>

<template>
  <div class="mb-1.5 flex items-center gap-1.5">
    <UTooltip text="Drag to move" :delay-duration="TOOLTIP_DELAY">
      <span
        :class="isSection ? 'section-handle' : 'question-handle'"
        class="text-muted grid size-6.5 cursor-grab place-items-center rounded-sm select-none hover:bg-black/5 active:cursor-grabbing"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-grip-vertical" class="size-4" />
      </span>
    </UTooltip>

    <UDropdownMenu
      :items="typeItems"
      :content="{ align: 'start', onCloseAutoFocus: onMenuCloseAutoFocus }"
      :ui="{
        content: 'w-80',
        itemDescription: 'whitespace-normal',
      }"
    >
      <UTooltip text="Change type" :delay-duration="TOOLTIP_DELAY">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-chevrons-up-down"
          :ui="{ trailingIcon: 'size-3' }"
          :class="isSection ? 'text-(--sec-ink)' : 'text-(--q-ink)'"
          class="focus-visible:outline-primary text-xs font-bold tracking-wider whitespace-nowrap uppercase focus-visible:outline-2"
          :label="label"
          :aria-label="`${label}, change type`"
        />
      </UTooltip>
    </UDropdownMenu>

    <UBadge v-if="warning" color="error" variant="subtle" size="sm">
      {{ warning }}
    </UBadge>

    <span v-if="meta" class="text-muted text-xs">{{ meta }}</span>

    <span class="flex-1" />

    <UTooltip text="Move up" :delay-duration="TOOLTIP_DELAY">
      <UButton
        data-act="up"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        :class="MOVE_BUTTON"
        icon="i-lucide-arrow-up"
        :disabled="!canMoveUp"
        :aria-label="`Move ${label} up`"
        @click="move(-1, 'up')"
      />
    </UTooltip>

    <UTooltip text="Move down" :delay-duration="TOOLTIP_DELAY">
      <UButton
        data-act="down"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        :class="MOVE_BUTTON"
        icon="i-lucide-arrow-down"
        :disabled="!canMoveDown"
        :aria-label="`Move ${label} down`"
        @click="move(1, 'down')"
      />
    </UTooltip>

    <UTooltip text="Delete" :delay-duration="TOOLTIP_DELAY">
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        square
        class="text-muted focus-visible:outline-primary ml-2 focus-visible:outline-2"
        icon="i-lucide-trash-2"
        :aria-label="`Delete ${label}`"
        @click="removeBlock(kind, blockId)"
      />
    </UTooltip>

    <UTooltip
      :text="folded ? 'Expand' : 'Collapse'"
      :delay-duration="TOOLTIP_DELAY"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        square
        class="focus-visible:outline-primary focus-visible:outline-2"
        icon="i-lucide-chevron-down"
        :ui="{
          leadingIcon: [
            'transition-transform duration-200 ease-out motion-reduce:transition-none',
            folded ? '' : 'rotate-180',
          ],
        }"
        :aria-expanded="!folded"
        :aria-label="`${folded ? 'Expand' : 'Collapse'} ${label}`"
        @click="toggle"
      />
    </UTooltip>
  </div>
</template>
