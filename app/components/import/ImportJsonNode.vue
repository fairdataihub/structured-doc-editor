<script setup lang="ts">
// One value of the JSON tab. An object or array folds; "meta" objects start folded. A value that
// comes from a block of the plan is highlighted while that block is selected, and jumps to it on
// click (the Structure tab is the keyboard route to the same blocks).

const props = defineProps<{
  value: unknown;
  path: (string | number)[];
  name?: string | number | null;
  comma?: boolean;
}>();

const { jsonCollapsed, jsonMetaOpened, select, sections, selected } =
  useDmpImport();

const isBranch = computed(
  () => props.value !== null && typeof props.value === "object",
);

const isArray = computed(() => Array.isArray(props.value));

const entries = computed<[string | number, unknown][]>(() => {
  if (!isBranch.value) return [];

  return isArray.value
    ? (props.value as unknown[]).map((v, i) => [i, v])
    : Object.entries(props.value as object);
});

const foldKey = computed(() => jsonFoldKey(props.path, sections.value));
const isMeta = computed(() => foldKey.value.startsWith("m:"));

const folded = computed(() =>
  isMeta.value
    ? !jsonMetaOpened.has(foldKey.value)
    : jsonCollapsed.has(foldKey.value),
);

function toggle() {
  const set = isMeta.value ? jsonMetaOpened : jsonCollapsed;

  if (set.has(foldKey.value)) set.delete(foldKey.value);
  else set.add(foldKey.value);
}

const link = computed(() => jsonBlockLink(props.path, sections.value));

const isSelected = computed(() => {
  const current = link.value;

  if (!current || current.kind === "plan") return false;

  return (
    selected.value.kind === current.kind &&
    selected.value.id === current.id &&
    (selected.value.part ?? null) === (current.part ?? null)
  );
});

const selectedClass = computed(() =>
  isSelected.value && link.value ? IMPORT_TONE_SELECTED[link.value.tone] : "",
);

const summary = computed(() => {
  if (isArray.value) {
    const n = entries.value.length;

    return `${n} item${n === 1 ? "" : "s"}`;
  }

  const value = props.value as { title?: string; text?: string };
  const text = value.title ?? value.text;

  if (text !== undefined) {
    return JSON.stringify(text.length > 60 ? `${text.slice(0, 60)}…` : text);
  }

  const n = entries.value.length;

  return `${n} key${n === 1 ? "" : "s"}`;
});

const open = computed(() => (isArray.value ? "[" : "{"));
const close = computed(() => (isArray.value ? "]" : "}"));

function jump() {
  const target = link.value;

  if (target) select(target, { scroll: true, focus: true });
}
</script>

<template>
  <div v-if="isBranch" :class="selectedClass" class="rounded-sm">
    <div
      :class="link ? 'hover:bg-elevated cursor-pointer' : ''"
      class="flex items-center gap-0.5 whitespace-nowrap"
      @click="jump"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        square
        class="size-6 flex-none justify-center p-0"
        :icon="folded ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
        :aria-expanded="!folded"
        :aria-label="`${folded ? 'Expand' : 'Collapse'} ${name ?? 'root'}`"
        @click.stop="toggle"
      />

      <template v-if="name != null">
        <span class="text-primary">{{ JSON.stringify(name) }}</span>

        <span class="text-muted">:&nbsp;</span>
      </template>

      <span class="text-muted">{{ open }}</span>

      <template v-if="folded">
        <span class="text-muted">
          &nbsp;…&nbsp;{{ close }}{{ comma ? "," : "" }}
        </span>

        <span class="text-muted ml-1 truncate italic">{{ summary }}</span>
      </template>
    </div>

    <template v-if="!folded">
      <div class="border-default ml-1.5 border-l border-dotted pl-1.5">
        <ImportJsonNode
          v-for="([key, child], i) in entries"
          :key="key"
          :value="child"
          :name="isArray ? null : key"
          :path="[...path, key]"
          :comma="i < entries.length - 1"
        />
      </div>

      <div class="text-muted pl-6">{{ close }}{{ comma ? "," : "" }}</div>
    </template>
  </div>

  <div
    v-else
    :class="[selectedClass, link ? 'hover:bg-elevated cursor-pointer' : '']"
    class="flex min-h-5 items-center gap-0.5 rounded-sm pl-6 whitespace-nowrap"
    :title="typeof value === 'string' ? value : undefined"
    @click="jump"
  >
    <template v-if="name != null">
      <span class="text-primary">{{ JSON.stringify(name) }}</span>

      <span class="text-muted">:&nbsp;</span>
    </template>

    <span class="min-w-0 truncate">
      <span
        :class="typeof value === 'string' ? 'text-[#0d6446]' : 'text-[#a14b06]'"
      >
        {{ typeof value === "string" ? JSON.stringify(value) : String(value) }}
      </span>

      <span class="text-muted">{{ comma ? "," : "" }}</span>
    </span>
  </div>
</template>
