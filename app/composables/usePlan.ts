// One store for the whole editor. The plan is a flat list of blocks; everything else
// (sections, numbering, review items) is derived from it. Every change goes through an action
// here so undo, numbering and the "what changed" toast stay consistent.

export type FocusPos = number | "start" | "end" | "all";
export type DragKind = "section" | "question" | "block";
export interface Slot {
  index: number;
  anchor: { id: string; edge: "top" | "bottom" };
  depth: number;
}
interface Notifier {
  add: (t: {
    title: string;
    actions?: { label: string; onClick: () => void }[];
    duration?: number;
  }) => unknown;
}

const STORAGE_KEY = "dmp-prototype-plan-v1";
// v2: the Structure view is on by default, so older saved preferences (where it was off) are reset.
const UI_KEY = "dmp-prototype-ui-v2";

const blank = (): PlanState => ({
  v: PLAN_VERSION,
  file: "",
  blocks: [],
  issues: [],
  refs: [],
  autofix: { status: "none", items: [] },
  counts: { sections: 0, questions: 0 },
});

const state = reactive<PlanState>(blank());
const ui = reactive({
  /** Colours each block by type (the legend) so people can check the structure themselves. */
  structure: true,
  side: null as null | "styles",
  collapsed: {} as Record<string, boolean>,
  introSeen: false,
  zoom: "fit" as "fit" | number,
  outlineOpen: false,
});
const sel = ref<string | null>(null);
const ready = ref(false);
const extraction = shallowRef<ExtractionJson | null>(null);
const meta = reactive({ fileName: "" });

const history: string[] = [];
const future: string[] = [];
const canUndo = ref(false);
const canRedo = ref(false);
let typing = false;
let typingTimer: ReturnType<typeof setTimeout> | undefined;

const focusReq = ref<{ id: string; pos: FocusPos; n: number } | null>(null);
const scrollReq = ref<{
  id: string;
  frac: number | "nearest";
  n: number;
} | null>(null);
const flashed = ref<{ ids: string[]; n: number }>({ ids: [], n: 0 });
const renumbered = ref<{ ids: string[]; n: number }>({ ids: [], n: 0 });
const layout = ref<{ pages: string[][] }>({ pages: [] });
const announcement = ref("");
const exportOpen = ref(false);
const inview = ref<string | null>(null);
const scale = ref(1);
let notifier: Notifier | null = null;
let seq = 0;

const structure = computed(() => buildStructure(state.blocks));
const numbering = computed(() => buildNumbering(state.blocks));
const pageCount = computed(() => Math.max(1, layout.value.pages.length));

/* ---------------- helpers ---------------- */
const byId = (id: string | null | undefined) =>
  id ? state.blocks.find((b) => b.id === id) : undefined;
const idx = (id: string) => state.blocks.findIndex((b) => b.id === id);
const range = (id: string) => blockRange(state.blocks, id);
const kindOf = (b: Block): DragKind =>
  b.type === "section"
    ? "section"
    : b.type === "question"
      ? "question"
      : "block";
const introEnd = (secId: string) => {
  const [s, e] = range(secId);
  for (let i = s + 1; i < e; i++)
    if (state.blocks[i]!.type === "question") return i;

  return e;
};

function announce(msg: string) {
  announcement.value = "";
  setTimeout(() => (announcement.value = msg), 30);
}
function toast(title: string, undoable = true) {
  announce(title);
  notifier?.add({
    title,
    duration: 5000,
    actions: undoable ? [{ label: "Undo", onClick: () => undo() }] : undefined,
  });
}
function flash(ids: string[]) {
  flashed.value = { ids, n: ++seq };
}
function focusBlock(id: string, pos: FocusPos = "end") {
  focusReq.value = { id, pos, n: ++seq };
}
function scrollToBlock(id: string, frac: number | "nearest" = 0.3) {
  scrollReq.value = { id, frac, n: ++seq };
}

/** Where a block sits, in words: "Element 4 · Question 2". */
function where(id: string): string {
  const o = structure.value.owner[id];
  const { pre, short } = numbering.value;
  const sec = byId(o?.sec);
  const q = byId(o?.q);
  if (!sec) return "the top";
  const secName = pre[sec.id]
    ? pre[sec.id]!.replace(/:$/, "")
    : trunc(labelOf(sec), 28);
  if (byId(id)?.type === "section" || !q) return secName;

  return `${secName} · ${short[q.id] !== "·" ? `Question ${short[q.id]}` : trunc(labelOf(q), 24)}`;
}

/* ---------------- history ---------------- */
const snap = () =>
  JSON.stringify({
    blocks: state.blocks,
    issues: state.issues,
    autofix: state.autofix,
    refs: state.refs,
  });
function pushHistory() {
  history.push(snap());
  if (history.length > 200) history.shift();
  future.length = 0;
  canUndo.value = true;
  canRedo.value = false;
}
function restore(json: string) {
  Object.assign(state, JSON.parse(json));
  if (sel.value && !byId(sel.value)) sel.value = null;
}
function beginTyping() {
  if (!typing) {
    pushHistory();
    typing = true;
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(endTyping, 1200);
}
function endTyping() {
  typing = false;
  clearTimeout(typingTimer);
}
function undo() {
  endTyping();
  const prev = history.pop();
  if (!prev) return announce("Nothing to undo");
  future.push(snap());
  restore(prev);
  canUndo.value = history.length > 0;
  canRedo.value = true;
  announce("Undone");
}
function redo() {
  endTyping();
  const next = future.pop();
  if (!next) return announce("Nothing to redo");
  history.push(snap());
  restore(next);
  canUndo.value = true;
  canRedo.value = future.length > 0;
  announce("Redone");
}

/* ---------------- loading & saving ---------------- */
function load(opts: {
  json: ExtractionJson;
  fileName: string;
  notify: Notifier;
}) {
  notifier = opts.notify;
  extraction.value = opts.json;
  meta.fileName = opts.fileName;
  let saved: PlanState | null = null;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      raw &&
      raw.v === PLAN_VERSION &&
      raw.file === opts.fileName &&
      Array.isArray(raw.blocks) &&
      raw.blocks.length
    )
      saved = raw;
    Object.assign(ui, JSON.parse(localStorage.getItem(UI_KEY) || "{}"), {
      outlineOpen: false,
    });
  } catch {
    // Storage can be blocked or hold old data: start from the extraction.
  }
  Object.assign(state, saved ?? importExtraction(opts.json, opts.fileName));
  ready.value = true;
}
function startOver() {
  if (!extraction.value) return;
  endTyping();
  pushHistory();
  Object.assign(state, importExtraction(extraction.value, meta.fileName));
  sel.value = null;
  toast("Started over from the extraction");
}
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const saveStatus = ref("Saved in this browser");
watch(
  () => [state.blocks, state.issues, state.autofix, state.refs],
  () => {
    if (!ready.value) return;
    saveStatus.value = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        saveStatus.value = "Saved in this browser";
      } catch {
        saveStatus.value = "Not saved: browser storage is off";
      }
    }, 400);
  },
  { deep: true },
);
watch(
  ui,
  () => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(ui));
    } catch {
      // per-viewer preference only
    }
  },
  { deep: true },
);

/* ---------------- edits ---------------- */
function select(id: string | null) {
  sel.value = id && byId(id) ? id : null;
}
function updateHtml(id: string, html: string) {
  const b = byId(id);
  if (!b || b.html === html) return;
  beginTyping();
  b.html = html;
}
function markRenumbered(before: Record<string, string>) {
  const after = numbering.value.pre;
  const ids = Object.keys(after).filter(
    (id) => before[id] !== undefined && before[id] !== after[id],
  );
  renumbered.value = { ids, n: ++seq };

  return ids.length;
}
function setType(id: string, type: BlockType) {
  const b = byId(id);
  if (!b || b.type === type || b.type === "title" || type === "title") return;
  endTyping();
  pushHistory();
  const before = numbering.value.pre;
  b.type = type;
  if (isHeadingBlock(b)) {
    b.html = escapeHtml(plainOf(b)); // headings are one line of plain text
    if (b.numbered === undefined) b.numbered = true;
  }
  markRenumbered(before);
  select(id);
  flash(state.blocks.slice(...range(id)).map((x) => x.id));
  toast(
    type === "section"
      ? "Now a section heading. Everything below it, up to the next section, belongs to it."
      : type === "question"
        ? `Now a question in ${where(id).split(" · ")[0]}.`
        : `Now ${type === "list" ? "a list item" : "an answer"}.`,
  );
}
function toggleNumbered(id: string) {
  const b = byId(id);
  if (!b) return;
  endTyping();
  pushHistory();
  b.numbered = b.numbered === false;
  for (const is of state.issues) {
    if (is.kind === "unnumbered" && is.blockId === id)
      is.status = b.numbered ? "fixed" : "kept";
  }
  toast(
    b.numbered
      ? `Numbered: ${numbering.value.pre[id] ?? ""}`
      : "Number removed",
  );
}

/** Allowed drop positions, from the document model: questions land between questions or at a section's end. */
function slotsFor(kind: DragKind, id: string): Slot[] {
  const st = structure.value;
  const B = state.blocks;
  const out: Slot[] = [];
  const last = B.at(-1)!;
  if (kind === "section") {
    for (const s of st.secs)
      out.push({ index: s.i, anchor: { id: s.b.id, edge: "top" }, depth: 0 });
    out.push({
      index: B.length,
      anchor: { id: st.secs.at(-1)?.b.id ?? last.id, edge: "bottom" },
      depth: 0,
    });
  } else if (kind === "question") {
    for (const s of st.secs) {
      const end = range(s.b.id)[1];
      for (const q of s.qs)
        out.push({ index: q.i, anchor: { id: q.b.id, edge: "top" }, depth: 1 });
      out.push({
        index: end,
        anchor: { id: B[end - 1]!.id, edge: "bottom" },
        depth: 1,
      });
    }
  } else {
    for (let i = 1; i <= B.length; i++) {
      out.push({
        index: i,
        anchor:
          i < B.length
            ? { id: B[i]!.id, edge: "top" }
            : { id: last.id, edge: "bottom" },
        depth: 2,
      });
    }
  }
  const [s, e] = range(id);

  return out.filter((x) => !(x.index > s && x.index < e));
}
/** Moves a block (with everything it owns) so it starts at `index`. Renumbering follows from position. */
function commitMove(
  id: string,
  index: number,
  opts: { quiet?: boolean; scrollFrac?: number | "nearest" } = {},
) {
  const b = byId(id);
  if (!b) return false;
  const [s, e] = range(id);
  if (index >= s && index <= e) {
    if (!opts.quiet) toast("It’s already there.", false);

    return false;
  }
  endTyping();
  const name = `“${trunc(labelOf(b), 34)}”`;
  const before = numbering.value.pre;
  pushHistory();
  const items = state.blocks.splice(s, e - s);
  state.blocks.splice(index > s ? index - (e - s) : index, 0, ...items);
  select(id);
  flash(items.map((x) => x.id));
  const changed = markRenumbered(before);
  scrollToBlock(id, opts.scrollFrac ?? "nearest");
  const msg = `Moved ${name} to ${where(id)}${changed ? ` · ${changed} number${changed > 1 ? "s" : ""} updated` : ""}`;
  if (opts.quiet) announce(msg);
  else toast(msg);

  return true;
}
function nudge(id: string, dir: -1 | 1) {
  const b = byId(id);
  if (!b || b.type === "title") return;
  const [s, e] = range(id);
  const indexes = [
    ...new Set(slotsFor(kindOf(b), id).map((x) => x.index)),
  ].sort((a, z) => a - z);
  const target =
    dir < 0 ? indexes.filter((i) => i < s).pop() : indexes.find((i) => i > e);
  if (target === undefined)
    return announce(dir < 0 ? "Already at the top" : "Already at the bottom");
  commitMove(id, target, { quiet: true });
}
/** Applies an order coming from the outline (sections with their questions). */
function applyOutline(order: { id: string; qs: string[] }[], movedId?: string) {
  const st = structure.value;
  const head = state.blocks.slice(0, st.secs[0]?.i ?? state.blocks.length);
  const qNodes = new Map(st.secs.flatMap((s) => s.qs).map((q) => [q.b.id, q]));
  const secNodes = new Map(st.secs.map((s) => [s.b.id, s]));
  const next: Block[] = [...head];
  for (const o of order) {
    const s = secNodes.get(o.id);
    if (!s) continue;
    next.push(s.b, ...s.intro);
    for (const qid of o.qs) {
      const q = qNodes.get(qid);
      if (q) next.push(q.b, ...q.body);
    }
  }
  if (
    next.length !== state.blocks.length ||
    next.every((b, i) => b === state.blocks[i])
  )
    return;
  endTyping();
  const before = numbering.value.pre;
  pushHistory();
  state.blocks.splice(0, state.blocks.length, ...next);
  if (!movedId) return;
  const moved = byId(movedId)!;
  select(movedId);
  flash(state.blocks.slice(...range(movedId)).map((x) => x.id));
  const changed = markRenumbered(before);
  scrollToBlock(movedId, "nearest");
  toast(
    `Moved “${trunc(labelOf(moved), 34)}” to ${where(movedId)}${changed ? ` · ${changed} number${changed > 1 ? "s" : ""} updated` : ""}`,
  );
}
function deleteItem(id: string) {
  const b = byId(id);
  if (!b) return;
  endTyping();
  pushHistory();
  const [s, e] = range(id);
  state.blocks.splice(s, e - s);
  select((state.blocks[s] ?? state.blocks[s - 1])?.id ?? null);
  toast(
    b.type === "section"
      ? `Deleted section “${trunc(labelOf(b), 30)}”`
      : b.type === "question"
        ? `Deleted question “${trunc(labelOf(b), 30)}”`
        : "Deleted",
  );
}
function duplicate(id: string) {
  endTyping();
  pushHistory();
  const [s, e] = range(id);
  const copies = state.blocks.slice(s, e).map((b) => ({ ...b, id: uid() }));
  state.blocks.splice(e, 0, ...copies);
  select(copies[0]!.id);
  flash(copies.map((c) => c.id));
  scrollToBlock(copies[0]!.id, "nearest");
  toast("Duplicated");
}
function addBlock(
  id: string,
  type: "answer" | "list" | "question" | "section",
) {
  const b = byId(id);
  if (!b) return;
  const i = idx(id);
  const own = structure.value.owner[id];
  let at: number;
  if (type === "answer" || type === "list") at = i + 1;
  else if (type === "question")
    at =
      b.type === "section"
        ? introEnd(b.id)
        : own?.q
          ? range(own.q)[1]
          : own?.sec
            ? introEnd(own.sec)
            : i + 1;
  else at = own?.sec ? range(own.sec)[1] : i + 1;
  endTyping();
  pushHistory();
  const added: Block[] =
    type === "answer" || type === "list"
      ? [{ id: uid(), type, html: "" }]
      : [
          { id: uid(), type, html: "", numbered: true },
          { id: uid(), type: "answer", html: "" },
        ];
  state.blocks.splice(at, 0, ...added);
  select(added[0]!.id);
  focusBlock(added[0]!.id, "start");
}
function addSectionAtEnd() {
  endTyping();
  pushHistory();
  const added: Block[] = [
    { id: uid(), type: "section", html: "", numbered: true },
    { id: uid(), type: "answer", html: "" },
  ];
  state.blocks.push(...added);
  select(added[0]!.id);
  focusBlock(added[0]!.id, "start");
  scrollToBlock(added[0]!.id);
}
/** Enter: split a block at the cursor. A heading splits into heading + answer. */
function splitBlock(id: string, beforeHtml: string, afterHtml: string) {
  const b = byId(id);
  if (!b) return;
  if (
    b.type === "list" &&
    !stripHtml(beforeHtml).trim() &&
    !stripHtml(afterHtml).trim()
  ) {
    endTyping();
    pushHistory();
    b.type = "answer";
    focusBlock(id, "start");

    return;
  }
  endTyping();
  pushHistory();
  b.html = beforeHtml;
  const type: BlockType =
    isHeadingBlock(b) || b.type === "title" ? "answer" : b.type;
  const added: Block = { id: uid(), type, html: afterHtml };
  state.blocks.splice(idx(id) + 1, 0, added);
  select(added.id);
  focusBlock(added.id, "start");
}
/** Backspace at the start of a block: delete it if empty, or join it to the text above. */
function mergeBack(id: string): boolean {
  const i = idx(id);
  const b = state.blocks[i];
  const prev = state.blocks[i - 1];
  if (!b || !prev) return false;
  if (!plainOf(b) && b.type !== "title") {
    endTyping();
    pushHistory();
    state.blocks.splice(i, 1);
    select(prev.id);
    focusBlock(prev.id, "end");

    return true;
  }
  if (isTextBlock(b) && isTextBlock(prev)) {
    endTyping();
    pushHistory();
    const offset = stripHtml(prev.html).length;
    prev.html = prev.html + b.html;
    state.blocks.splice(i, 1);
    select(prev.id);
    focusBlock(prev.id, offset);

    return true;
  }
  focusBlock(prev.id, "end");

  return true;
}
function focusNeighbour(id: string, dir: -1 | 1) {
  const next = state.blocks[idx(id) + dir];
  if (next) focusBlock(next.id, dir < 0 ? "end" : "start");
}
export function usePlan() {
  return {
    state,
    ui,
    sel,
    ready,
    meta,
    extraction,
    structure,
    numbering,
    pageCount,
    layout,
    canUndo,
    canRedo,
    focusReq,
    scrollReq,
    flashed,
    renumbered,
    announcement,
    saveStatus,
    exportOpen,
    inview,
    scale,
    byId,
    idx,
    range,
    kindOf,
    introEnd,
    where,
    announce,
    toast,
    flash,
    focusBlock,
    scrollToBlock,
    pushHistory,
    endTyping,
    undo,
    redo,
    load,
    startOver,
    select,
    updateHtml,
    setType,
    toggleNumbered,
    slotsFor,
    commitMove,
    nudge,
    applyOutline,
    deleteItem,
    duplicate,
    addBlock,
    addSectionAtEnd,
    splitBlock,
    mergeBack,
    focusNeighbour,
  };
}
