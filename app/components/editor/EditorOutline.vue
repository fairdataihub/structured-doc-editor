<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";
import type { MenuItem } from "~/composables/useBlockMenus";

// The outline: sections and questions only, like Word's navigation pane.
// Drag and drop is SortableJS through vue-draggable-plus. A drop is turned back into the flat
// block order by usePlan().applyOutline(), so numbering and the page update from the model.

const plan = usePlan();
const review = useReview();
const menus = useBlockMenus();
const { ui, sel, inview, numbering, structure, renumbered, flashed } = plan;

interface Node {
  id: string;
  qs: { id: string }[];
}
const tree = ref<Node[]>([]);
const dragKind = ref<null | "section" | "question">(null);
const treeEl = ref<HTMLElement>();

// Rebuild only when the set or order of sections/questions changes, not on every keystroke.
const shape = computed(() =>
  structure.value.secs
    .map((s) => `${s.b.id}:${s.qs.map((q) => q.b.id).join(",")}`)
    .join("|"),
);
watch(
  shape,
  () => {
    if (dragKind.value) return;
    tree.value = structure.value.secs.map((s) => ({
      id: s.b.id,
      qs: s.qs.map((q) => ({ id: q.b.id })),
    }));
  },
  { immediate: true },
);

const title = computed(() => plan.state.blocks.find((b) => b.type === "title"));
const questionCount = computed(() =>
  structure.value.secs.reduce((n, s) => n + s.qs.length, 0),
);
const selectedRow = computed(() => {
  const id = sel.value;
  if (!id) return null;
  const o = structure.value.owner[id];
  const b = plan.byId(id);
  if (!o || !b) return null;
  if (b.type === "section" || b.type === "question") return id;
  if (o.q && !ui.collapsed[o.sec ?? ""]) return o.q;

  return o.sec;
});
const dotFor = (ids: string[]) => ids.some((id) => review.flagged.value[id]);
const secIds = (secId: string) => {
  const s = structure.value.secs.find((x) => x.b.id === secId);
  if (!s) return [secId];
  const own = [s.b.id, ...s.intro.map((b) => b.id)];

  return ui.collapsed[secId]
    ? [...own, ...s.qs.flatMap((q) => [q.b.id, ...q.body.map((b) => b.id)])]
    : own;
};
const qIds = (qId: string) => {
  const q = structure.value.secs
    .flatMap((s) => s.qs)
    .find((x) => x.b.id === qId);

  return q ? [q.b.id, ...q.body.map((b) => b.id)] : [qId];
};

function onStart(kind: "section" | "question") {
  dragKind.value = kind;
  plan.endTyping();
}
function onEnd(e: { item: HTMLElement }) {
  const movedId = e.item?.dataset?.id;
  nextTick(() => {
    dragKind.value = null;
    plan.applyOutline(
      tree.value.map((s) => ({ id: s.id, qs: s.qs.map((q) => q.id) })),
      movedId,
    );
    tree.value = structure.value.secs.map((s) => ({
      id: s.b.id,
      qs: s.qs.map((q) => ({ id: q.b.id })),
    }));
  });
}

function open(id: string) {
  plan.select(id);
  plan.scrollToBlock(id);
  if (window.innerWidth <= 920) ui.outlineOpen = false;
}
function edit(id: string) {
  if (window.innerWidth <= 920) ui.outlineOpen = false;
  plan.focusBlock(id, "end");
}
function onKey(e: KeyboardEvent, id: string, isSection: boolean) {
  if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();
    plan.select(id);
    plan.nudge(id, e.key === "ArrowUp" ? -1 : 1);
    nextTick(() =>
      treeEl.value
        ?.querySelector<HTMLElement>(`.ol-row[data-row="${id}"]`)
        ?.focus(),
    );

    return;
  }
  const rows = [
    ...(treeEl.value?.querySelectorAll<HTMLElement>(".ol-row") ?? []),
  ].filter((r) => r.offsetParent);
  const i = rows.indexOf(e.currentTarget as HTMLElement);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const r = rows[i + (e.key === "ArrowDown" ? 1 : -1)];
    if (r) {
      r.focus();
      open(r.dataset.row!);
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    edit(id);
  } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && isSection) {
    e.preventDefault();
    ui.collapsed[id] = e.key === "ArrowLeft";
  }
}

// Light up rows whose number changed, and rows that just moved.
watch(renumbered, (r) =>
  nextTick(() => {
    for (const id of r.ids)
      treeEl.value
        ?.querySelector(`.ol-row[data-row="${id}"] .num`)
        ?.classList.add("renum");
    setTimeout(
      () =>
        treeEl.value
          ?.querySelectorAll(".renum")
          .forEach((e) => e.classList.remove("renum")),
      2000,
    );
  }),
);
watch(flashed, (f) =>
  nextTick(() => {
    for (const id of f.ids)
      treeEl.value
        ?.querySelector(`.ol-row[data-row="${id}"]`)
        ?.classList.add("flash");
    setTimeout(
      () =>
        treeEl.value
          ?.querySelectorAll(".ol-row.flash")
          .forEach((e) => e.classList.remove("flash")),
      1500,
    );
  }),
);
watch(selectedRow, (id) =>
  nextTick(() =>
    treeEl.value
      ?.querySelector(`.ol-row[data-row="${id}"]`)
      ?.scrollIntoView({ block: "nearest" }),
  ),
);
</script>

<template>
  <aside class="outline" :class="{ open: ui.outlineOpen }" aria-label="Outline">
    <div class="ol-head">
      <span class="eyebrow">Outline</span>

      <span class="ol-meta"
        >{{ structure.secs.length }} sections ·
        {{ questionCount }} questions</span
      >
    </div>

    <button
      v-if="title"
      class="ol-title"
      :class="{ sel: sel === title.id }"
      type="button"
      @click="open(title.id)"
    >
      <span class="sw t-title" />

      <span>{{ trunc(plainOf(title), 44) }}</span>
    </button>

    <div
      ref="treeEl"
      class="ol-tree"
      :class="{ 'dragging-q': dragKind === 'question' }"
      role="tree"
      aria-label="Sections and questions"
    >
      <VueDraggable
        v-model="tree"
        :animation="160"
        handle=".grip-sec"
        :group="{ name: 'sections', pull: false, put: false }"
        ghost-class="ol-ghost"
        fallback-class="ol-fallback"
        :force-fallback="true"
        :fallback-on-body="true"
        :scroll-sensitivity="60"
        @start="onStart('section')"
        @end="onEnd"
      >
        <div
          v-for="s in tree"
          :key="s.id"
          class="ol-sec"
          :class="{ collapsed: ui.collapsed[s.id] && s.qs.length }"
          :data-id="s.id"
        >
          <div
            class="ol-row lvl0"
            :class="{ sel: selectedRow === s.id, inview: inview === s.id }"
            :data-row="s.id"
            tabindex="0"
            role="treeitem"
            aria-level="1"
            :aria-expanded="s.qs.length ? !ui.collapsed[s.id] : undefined"
            @click="open(s.id)"
            @dblclick="edit(s.id)"
            @keydown="onKey($event, s.id, true)"
          >
            <span class="grip grip-sec" title="Drag to move this section"
              ><UIcon name="i-lucide-grip-vertical" class="size-3.5"
            /></span>

            <button
              v-if="s.qs.length"
              class="caret"
              type="button"
              :aria-label="ui.collapsed[s.id] ? 'Expand' : 'Collapse'"
              @click.stop="ui.collapsed[s.id] = !ui.collapsed[s.id]"
            >
              <UIcon name="i-lucide-chevron-down" class="size-3.5" />
            </button>

            <span v-else class="caret-sp" />

            <span class="num">{{ numbering.short[s.id] }}</span>

            <span class="lbl">{{
              plan.byId(s.id) ? labelOf(plan.byId(s.id)!) : ""
            }}</span>

            <span
              v-if="dotFor(secIds(s.id))"
              class="idot"
              title="Needs a look"
            />

            <UDropdownMenu
              :items="menus.blockItems(s.id)"
              :content="{ align: 'start' }"
            >
              <UButton
                class="more"
                icon="i-lucide-ellipsis"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Actions for this section"
                @click.stop
              />

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

          <VueDraggable
            v-show="!ui.collapsed[s.id] || !s.qs.length"
            v-model="s.qs"
            class="ol-kids"
            role="group"
            :animation="160"
            handle=".grip-q"
            group="questions"
            ghost-class="ol-ghost"
            fallback-class="ol-fallback"
            :force-fallback="true"
            :fallback-on-body="true"
            :empty-insert-threshold="18"
            @start="onStart('question')"
            @end="onEnd"
          >
            <div
              v-for="q in s.qs"
              :key="q.id"
              class="ol-row lvl1"
              :class="{ sel: selectedRow === q.id }"
              :data-id="q.id"
              :data-row="q.id"
              tabindex="-1"
              role="treeitem"
              aria-level="2"
              @click="open(q.id)"
              @dblclick="edit(q.id)"
              @keydown="onKey($event, q.id, false)"
            >
              <span class="grip grip-q" title="Drag to move this question"
                ><UIcon name="i-lucide-grip-vertical" class="size-3.5"
              /></span>

              <span class="num">{{ numbering.short[q.id] }}</span>

              <span class="lbl">{{
                plan.byId(q.id) ? labelOf(plan.byId(q.id)!) : ""
              }}</span>

              <span
                v-if="dotFor(qIds(q.id))"
                class="idot"
                title="Needs a look"
              />

              <UDropdownMenu
                :items="menus.blockItems(q.id)"
                :content="{ align: 'start' }"
              >
                <UButton
                  class="more"
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Actions for this question"
                  @click.stop
                />

                <template #item-leading="{ item }">
                  <span
                    v-if="(item as MenuItem).swatch"
                    class="sw"
                    :class="`t-${(item as MenuItem).swatch}`"
                  />

                  <UIcon
                    v-else-if="item.icon"
                    :name="item.icon"
                    class="size-4"
                  />
                </template>
              </UDropdownMenu>
            </div>
          </VueDraggable>
        </div>
      </VueDraggable>
    </div>

    <div class="ol-foot">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-plus"
        block
        @click="plan.addSectionAtEnd()"
        >Add section</UButton
      >

      <p class="ol-hint">
        Drag
        <UIcon
          name="i-lucide-grip-vertical"
          class="inline size-3 align-[-2px]"
        />
        to reorder. <UKbd value="alt" size="sm" />
        <UKbd value="arrowup" size="sm" />
        <UKbd value="arrowdown" size="sm" /> moves the selected item.
      </p>
    </div>
  </aside>
</template>
