<script setup lang="ts">
import { useResizeObserver } from "@vueuse/core";
import type { DragKind, Slot } from "~/composables/usePlan";

// The pages. Blocks are measured in a hidden flow built with the same markup as the PDF export
// (shared/utils/paperHtml.ts), then placed page by page. Breaks fall between blocks and a heading
// always stays with the block after it. Each block keeps one Tiptap editor however often the
// pages reflow, because blocks are positioned on one sheet rather than moved between pages.

const plan = usePlan();
const { state, ui, sel, numbering, scale } = plan;

const GAP = 30;
const canvasEl = ref<HTMLElement>();
const measureEl = ref<HTMLElement>();
const sheetEl = ref<HTMLElement>();
const arrangeEl = ref<HTMLElement>();
const geo = pageGeometry();
const positions = shallowRef<Record<string, number>>({});
const pages = computed(() => plan.layout.value.pages);
const sheetHeight = computed(
  () => Math.max(1, pages.value.length) * (geo.h + GAP) - GAP,
);
const vars = {
  "--pw": `${geo.paper.w}in`,
  "--ph": `${geo.paper.h}in`,
  "--pm": `${PAPER_STYLE.margin}in`,
};

const measureHtml = computed(
  () =>
    `<section class="page">${flowHtml(
      state.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        prefix: numbering.value.pre[b.id] ?? "",
        html: b.html,
      })),
    )}</section>`,
);

function measure() {
  const flow = measureEl.value?.querySelector(".flow");
  if (!flow) return;
  const els = [...flow.children] as HTMLElement[];
  const blocks = state.blocks;
  if (els.length !== blocks.length) return;
  const tops = els.map((e) => e.offsetTop);
  const bottoms = els.map((e, i) => tops[i]! + e.offsetHeight);
  const { contentH, h, m } = geo;
  const breaks: number[][] = [[]];
  for (let j = 0; j < els.length; j++) {
    let page = breaks.at(-1)!;
    if (page.length && bottoms[j]! - tops[page[0]!]! > contentH + 0.5) {
      // Break before this block; carry headings so none is left alone at a page bottom.
      const carried: number[] = [];
      while (page.length > 1 && isHeadingBlock(blocks[page.at(-1)!]))
        carried.unshift(page.pop()!);
      page = [...carried];
      breaks.push(page);
    }
    page.push(j);
  }
  const pos: Record<string, number> = {};
  breaks.forEach((p, pi) => {
    for (const j of p)
      pos[blocks[j]!.id] = pi * (h + GAP) + m + (tops[j]! - tops[p[0]!]!);
  });
  positions.value = pos;
  plan.layout.value = { pages: breaks.map((p) => p.map((j) => blocks[j]!.id)) };
  fitZoom();
}
watch(measureHtml, () => nextTick(measure), {
  immediate: true,
  flush: "post",
});
onMounted(() => {
  document.fonts?.ready.then(measure);
  document.fonts?.addEventListener?.("loadingdone", measure);
});
onBeforeUnmount(() =>
  document.fonts?.removeEventListener?.("loadingdone", measure),
);

/* ---------- zoom ---------- */
function fitZoom() {
  const c = canvasEl.value;
  if (!c) return;
  const avail = Math.max(200, c.clientWidth - 40);
  const s = ui.zoom === "fit" ? Math.min(1, avail / geo.w) : ui.zoom;
  scale.value = Math.max(0.35, Math.min(2, s));
}
useResizeObserver(canvasEl, fitZoom);
watch(() => ui.zoom, fitZoom);

/* ---------- selection, flashes, scrolling ---------- */
const nodeOf = (id: string) =>
  sheetEl.value?.querySelector<HTMLElement>(`.b[data-id="${id}"]`) ?? null;

function scrollTo(id: string, frac: number | "nearest") {
  const el = nodeOf(id);
  const c = canvasEl.value;
  if (!el || !c) return;
  const cr = c.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (frac === "nearest") {
    const dockH = plan.welcomeOpen.value ? 260 : 40;
    if (r.top >= cr.top + 40 && r.bottom <= cr.bottom - dockH) return;
    frac = 0.3;
  }
  c.scrollTo({
    top: Math.max(0, c.scrollTop + (r.top - cr.top) - c.clientHeight * frac),
    behavior: "smooth",
  });
}
watch(plan.scrollReq, (req) => {
  if (req) setTimeout(() => scrollTo(req.id, req.frac), 60);
});
function addTemporaryClass(
  ids: string[],
  cls: string,
  selector = "",
  ms = 1600,
) {
  nextTick(() =>
    setTimeout(() => {
      const els = ids.map((id) => {
        const node = nodeOf(id);

        return selector
          ? node?.querySelector<HTMLElement>(`:scope ${selector}`)
          : node;
      });
      for (const el of els) el?.classList.add(cls);
      setTimeout(() => els.forEach((el) => el?.classList.remove(cls)), ms);
    }, 80),
  );
}
watch(plan.flashed, (f) => addTemporaryClass(f.ids, "flash"));
watch(plan.renumbered, (r) =>
  addTemporaryClass(r.ids, "renum", "> .pre", 2000),
);

let spyRaf = 0;
function spy() {
  cancelAnimationFrame(spyRaf);
  spyRaf = requestAnimationFrame(() => {
    const c = canvasEl.value;
    if (!c) return;
    const line = c.getBoundingClientRect().top + c.clientHeight * 0.25;
    let cur: string | null = null;
    for (const s of plan.structure.value.secs) {
      const el = nodeOf(s.b.id);
      if (el && el.getBoundingClientRect().top <= line) cur = s.b.id;
    }
    plan.inview.value = cur ?? plan.structure.value.secs[0]?.b.id ?? null;
  });
}
watch(positions, () => nextTick(spy));

/* ---------- section hover: show everything that moves with it ---------- */
const hoverSection = ref<string | null>(null);
const hoverIds = computed(() =>
  hoverSection.value && plan.byId(hoverSection.value)
    ? new Set(
        state.blocks.slice(...plan.range(hoverSection.value)).map((b) => b.id),
      )
    : new Set<string>(),
);
function onOver(e: MouseEvent) {
  if (drag) return;
  const b = (e.target as HTMLElement).closest<HTMLElement>(".b-section");
  hoverSection.value = b?.dataset.id ?? null;
}

/* ---------- drag on the page (pointer events) ---------- */
// One engine for every drag on the page. Slots come from the model (usePlan().slotsFor), so a
// question can only land between questions or at a section's end. Dragging a section switches
// the page to a list of section cards so every drop position fits on screen.
interface DragState {
  id: string;
  kind: DragKind;
  surface: "canvas" | "arrange";
  x0: number;
  y0: number;
  x: number;
  y: number;
  started: boolean;
  slots: Slot[];
  slot: (Slot & { y: number }) | null;
  raf: number;
}
let drag: DragState | null = null;
const ghost = reactive({
  show: false,
  x: 0,
  y: 0,
  type: "answer" as BlockType,
  prefix: "",
  label: "",
  count: "",
});
const line = reactive({ show: false, left: 0, top: 0, width: 0, tag: "" });
const arrange = ref(false);
const draggingIds = ref(new Set<string>());

const cards = computed(() =>
  arrange.value
    ? plan.structure.value.secs.map((s) => {
        const paras =
          s.intro.length + s.qs.reduce((n, q) => n + q.body.length, 0);
        const first = s.intro[0] ?? s.qs[0]?.body[0] ?? s.qs[0]?.b;

        return {
          id: s.b.id,
          num: (numbering.value.pre[s.b.id] ?? "").replace(/:$/, "") || "·",
          title: labelOf(s.b),
          meta: [
            s.qs.length
              ? `${s.qs.length} question${s.qs.length > 1 ? "s" : ""}`
              : "",
            `${paras} paragraph${paras === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · "),
          snip: first ? trunc(plainOf(first), 140) : "",
        };
      })
    : [],
);

function startDrag(e: PointerEvent, id: string) {
  if (e.button !== 0) return;
  const b = plan.byId(id);
  if (!b || b.type === "title") return;
  drag = {
    id,
    kind: plan.kindOf(b),
    surface: "canvas",
    x0: e.clientX,
    y0: e.clientY,
    x: e.clientX,
    y: e.clientY,
    started: false,
    slots: [],
    slot: null,
    raf: 0,
  };
  addEventListener("pointermove", onMove, { passive: false });
  addEventListener("pointerup", onUp);
  addEventListener("pointercancel", cancelDrag);
  addEventListener("keydown", onDragKey, true);
}
function onMove(e: PointerEvent) {
  if (!drag) return;
  drag.x = e.clientX;
  drag.y = e.clientY;
  if (!drag.started) {
    if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) < 5) return;
    beginDrag();
  }
  e.preventDefault();
  ghost.x = Math.min(drag.x + 14, innerWidth - 360);
  ghost.y = drag.y + 12;
}
function beginDrag() {
  if (!drag) return;
  drag.started = true;
  plan.endTyping();
  (document.activeElement as HTMLElement | null)?.blur?.();
  getSelection()?.removeAllRanges();
  document.body.classList.add("is-dragging");
  hoverSection.value = null;
  const b = plan.byId(drag.id)!;
  const [s, e] = plan.range(drag.id);
  draggingIds.value = new Set(state.blocks.slice(s, e).map((x) => x.id));
  const inside = state.blocks
    .slice(s, e)
    .filter((x) => x.type === "question").length;
  Object.assign(ghost, {
    show: true,
    type: b.type,
    prefix: numbering.value.pre[b.id] ?? "",
    label: trunc(labelOf(b), 48),
    count:
      drag.kind === "section"
        ? `${inside} question${inside === 1 ? "" : "s"}`
        : "",
  });
  if (drag.kind === "section") {
    drag.surface = "arrange";
    arrange.value = true;
    nextTick(() => {
      const list = arrangeEl.value;
      const card = list?.querySelector<HTMLElement>(
        `.ar-card[data-id="${drag?.id}"]`,
      );
      if (list && card && drag)
        list.scrollTop = Math.max(
          0,
          card.offsetTop -
            (drag.y - list.getBoundingClientRect().top) +
            card.offsetHeight / 2,
        );
    });
  }
  drag.slots = plan.slotsFor(drag.kind, drag.id);
  const loop = () => {
    if (!drag) return;
    autoScroll();
    updateTarget();
    drag.raf = requestAnimationFrame(loop);
  };
  drag.raf = requestAnimationFrame(loop);
  plan.announce(
    `Picked up ${TYPE_LABEL[b.type].toLowerCase()} “${trunc(labelOf(b), 40)}”. Release to drop, or press Escape to cancel.`,
  );
}
const container = () =>
  drag?.surface === "arrange" ? arrangeEl.value : canvasEl.value;
const anchorEl = (id: string) =>
  drag?.surface === "arrange"
    ? (arrangeEl.value?.querySelector<HTMLElement>(
        `.ar-card[data-id="${id}"]`,
      ) ?? null)
    : nodeOf(id);

function slotLabel(slot: Slot): string {
  if (!drag) return "";
  const [s, e] = plan.range(drag.id);
  if (slot.index >= s && slot.index <= e) return "No change";
  const B = state.blocks;
  const { secNum } = numbering.value;
  if (drag.kind === "section") {
    let n = 1;
    for (let i = 0; i < slot.index; i++)
      if (
        B[i]!.type === "section" &&
        B[i]!.numbered !== false &&
        (i < s || i >= e)
      )
        n++;

    return `Becomes ${sectionName(n)}`;
  }
  let secB: Block | null = null;
  let qB: Block | null = null;
  let n = 0;
  for (let i = 0; i < slot.index; i++) {
    if (i >= s && i < e) continue;
    if (B[i]!.type === "section") {
      secB = B[i]!;
      n = 0;
      qB = null;
    } else if (B[i]!.type === "question") {
      qB = B[i]!;
      if (B[i]!.numbered !== false) n++;
    }
  }
  const secName = secB
    ? secNum[secB.id]
      ? sectionName(secNum[secB.id]!)
      : trunc(labelOf(secB), 22)
    : "Top";
  if (drag.kind === "question") return `${secName} · Question ${n + 1}`;

  return qB ? `${secName} · ${trunc(labelOf(qB), 20)}` : secName;
}
function updateTarget() {
  if (!drag) return;
  const cont = container();
  if (!cont) return;
  const cr = cont.getBoundingClientRect();
  let best: (Slot & { y: number; el: HTMLElement }) | null = null;
  let bestD = Infinity;
  const gap = drag.surface === "arrange" ? 6 : 3;
  for (const sl of drag.slots) {
    const el = anchorEl(sl.anchor.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const y = sl.anchor.edge === "top" ? r.top - gap : r.bottom + gap;
    if (y < cr.top - 6 || y > cr.bottom + 6) continue;
    const d = Math.abs(drag.y - y);
    if (d < bestD) {
      bestD = d;
      best = { ...sl, y, el };
    }
  }
  drag.slot = best;
  if (!best) {
    line.show = false;

    return;
  }
  const r =
    drag.surface === "arrange"
      ? best.el.getBoundingClientRect()
      : {
          left: best.el.getBoundingClientRect().left,
          width: geo.contentW * scale.value,
        };
  Object.assign(line, {
    show: true,
    left: r.left,
    top: best.y - 1,
    width: Math.max(40, r.width),
    tag: slotLabel(best),
  });
}
function autoScroll() {
  if (!drag) return;
  const cont = container();
  if (!cont) return;
  const r = cont.getBoundingClientRect();
  const edge = 60;
  let dy = 0;
  if (drag.y < r.top + edge) dy = -Math.ceil((r.top + edge - drag.y) / 3);
  else if (drag.y > r.bottom - edge)
    dy = Math.ceil((drag.y - (r.bottom - edge)) / 3);
  if (dy) cont.scrollTop += Math.max(-26, Math.min(26, dy));
}
function cleanup() {
  if (!drag) return;
  cancelAnimationFrame(drag.raf);
  removeEventListener("pointermove", onMove);
  removeEventListener("pointerup", onUp);
  removeEventListener("pointercancel", cancelDrag);
  removeEventListener("keydown", onDragKey, true);
  ghost.show = false;
  line.show = false;
  arrange.value = false;
  draggingIds.value = new Set();
  document.body.classList.remove("is-dragging");
  drag = null;
}
function onUp() {
  const d = drag;
  cleanup();
  if (!d?.started) return;
  if (!d.slot) return plan.announce("Move cancelled");
  const [s, e] = plan.range(d.id);
  if (d.slot.index >= s && d.slot.index <= e) return plan.announce("No change");
  plan.commitMove(d.id, d.slot.index, {
    scrollFrac: d.surface === "arrange" ? 0.15 : "nearest",
  });
}
function cancelDrag() {
  const was = drag?.started;
  cleanup();
  if (was) plan.announce("Move cancelled");
}
function onDragKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    cancelDrag();
  }
}
onBeforeUnmount(cleanup);
</script>

<template>
  <div
    ref="canvasEl"
    class="canvas"
    @scroll.passive="spy"
    @pointerdown.self="plan.select(null)"
  >
    <div
      class="zoomer"
      :style="{
        width: `${geo.w * scale}px`,
        height: `${sheetHeight * scale}px`,
      }"
      @pointerdown.self="plan.select(null)"
    >
      <div
        ref="sheetEl"
        class="sheet paper"
        :class="{ structure: ui.structure }"
        :style="{
          ...vars,
          width: `${geo.w}px`,
          height: `${sheetHeight}px`,
          transform: `scale(${scale})`,
        }"
        @mouseover="onOver"
        @mouseleave="hoverSection = null"
      >
        <section
          v-for="(p, i) in pages"
          :key="i"
          class="page"
          :aria-label="`Page ${i + 1}`"
          :style="{ top: `${i * (geo.h + GAP)}px` }"
        >
          <div class="pg-tag">PAGE {{ i + 1 }}</div>

          <div class="pg-foot">Page {{ i + 1 }} of {{ pages.length }}</div>
        </section>

        <EditorBlock
          v-for="b in state.blocks"
          :key="b.id"
          :block="b"
          :prefix="numbering.pre[b.id]"
          :selected="sel === b.id"
          :class="{
            dragging: draggingIds.has(b.id),
            'sec-hl': hoverIds.has(b.id),
          }"
          :style="{
            top: `${positions[b.id] ?? 0}px`,
            left: `${geo.m}px`,
            width: `${geo.contentW}px`,
            visibility: positions[b.id] === undefined ? 'hidden' : undefined,
          }"
          @grab="startDrag"
        />
      </div>
    </div>

    <!-- Hidden measuring flow: same markup and CSS as the PDF export. -->
    <div
      ref="measureEl"
      class="measure paper"
      :style="vars"
      aria-hidden="true"
      v-html="measureHtml"
    />
  </div>

  <div
    v-if="arrange"
    class="arrange"
    :style="{ top: `${canvasEl?.offsetTop ?? 0}px` }"
    aria-hidden="true"
  >
    <div class="ar-head">
      <b>Rearranging sections</b>

      <span
        >Drop between two sections. Numbers and styles update when you let
        go.</span
      >

      <span><UKbd value="Esc" size="sm" /> cancels</span>
    </div>

    <div ref="arrangeEl" class="ar-list">
      <div
        v-for="c in cards"
        :key="c.id"
        class="ar-card"
        :class="{ dragging: drag?.id === c.id }"
        :data-id="c.id"
      >
        <span class="ar-num">{{ c.num }}</span>

        <div class="ar-main">
          <div class="ar-title">{{ c.title }}</div>

          <div class="ar-meta">{{ c.meta }}</div>

          <div v-if="c.snip" class="ar-snip">{{ c.snip }}</div>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="ghost.show"
      class="drag-ghost"
      :style="{ transform: `translate(${ghost.x}px, ${ghost.y}px)` }"
    >
      <span class="sw" :class="`t-${ghost.type}`" />

      <span v-if="ghost.prefix" class="gp">{{ ghost.prefix }}</span>

      <span class="gl">{{ ghost.label }}</span>

      <span v-if="ghost.count" class="gc">{{ ghost.count }}</span>
    </div>

    <div
      v-if="line.show"
      class="dropline"
      :style="{
        left: `${line.left}px`,
        top: `${line.top}px`,
        width: `${line.width}px`,
      }"
    >
      <span class="droptag">{{ line.tag }}</span>
    </div>
  </Teleport>
</template>
