import { watchDebounced } from "@vueuse/core";
import { ImportConfirmModal } from "#components";

// One store for the /import flow. Every structure change goes through an action here, so undo
// and the side panel stay consistent. The plan is saved as a draft in this browser only.

export const IMPORT_STEPS = [
  { id: "upload", title: "Upload PDF", path: "/import" },
  {
    id: "structure",
    title: "Review structure",
    path: "/import/structure",
  },
  {
    id: "metadata",
    title: "Review metadata",
    path: "/import/metadata",
  },
  {
    id: "export",
    title: "Export JSON",
    path: "/import/export",
  },
] as const;

export type ImportStepId = (typeof IMPORT_STEPS)[number]["id"];

const SAMPLES = {
  nih: { label: "NIH", file: "sample1.pdf" },
  nsf: { label: "NSF", file: "sample3.pdf" },
} as const;

export type ImportSampleKey = keyof typeof SAMPLES;

// Demo: extraction isn't connected yet, so a sample looks like it is being extracted for a moment.
const FAKE_EXTRACTION_MS = 1800;

interface Snapshot {
  plan: ImportPlan;
  sections: ImportSection[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const plan = reactive<ImportPlan>({ title: "", description: "", version: "" });
const sections = ref<ImportSection[]>([]);
const rda = ref<RdaDocument | null>(null);
const downloadUrl = ref("");
const loaded = ref(false);
const selected = ref<ImportSelection>({ kind: "plan" });
const announcement = ref("");

// View state, not part of undo.
const collapsed = reactive(new Set<number>());
const treeExpanded = ref<string[]>([]);
const jsonCollapsed = reactive(new Set<string>());
const jsonMetaOpened = reactive(new Set<string>());
const metaOpen = ref<string[]>(["ds-0"]);

let original: Snapshot | null = null;
// The plan as it was imported, to tell whether anything has changed since.
let pristine = "";

const DRAFT_KEY = "dmp-import-draft-v1";

interface Draft {
  plan: ImportPlan;
  sections: ImportSection[];
  rda: RdaDocument;
  downloadUrl: string;
  original: Snapshot;
  pristine: string;
}

let draftStarted = false;

function saveDraft() {
  if (!loaded.value || !rda.value || !original) return;

  const draft: Draft = {
    plan,
    sections: sections.value,
    rda: rda.value,
    downloadUrl: downloadUrl.value,
    original,
    pristine,
  };

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn("Could not save the draft", error);
  }
}

function removeDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing was saved, so there is nothing to remove.
  }
}

function restoreDraft() {
  try {
    const draft: Draft | null = JSON.parse(
      localStorage.getItem(DRAFT_KEY) ?? "null",
    );

    if (
      !Array.isArray(draft?.sections) ||
      !Array.isArray(draft.original?.sections) ||
      !draft.plan ||
      !draft.rda?.dmp
    ) {
      removeDraft();

      return;
    }

    Object.assign(plan, draft.plan);
    sections.value = draft.sections;
    rda.value = draft.rda;
    downloadUrl.value = draft.downloadUrl;
    original = draft.original;
    pristine = draft.pristine;
    reserveImportIds(draft.sections);
    reserveImportIds(draft.original.sections);
    treeExpanded.value = draft.sections.map((s) => `s-${s.id}`);
    loaded.value = true;
  } catch {
    removeDraft();
  }
}

function startDraft() {
  if (draftStarted || !import.meta.client) return;

  draftStarted = true;
  restoreDraft();
  watchDebounced([plan, sections, rda, downloadUrl], saveDraft, {
    debounce: 400,
    deep: true,
  });
  window.addEventListener("pagehide", saveDraft);
}

function planText() {
  return JSON.stringify({ plan, sections: sections.value, rda: rda.value });
}

/** Whether leaving now would lose edits made since the plan was imported. */
function hasChanges() {
  return loaded.value && planText() !== pristine;
}
const history = ref<Snapshot[]>([]);
const canUndo = computed(() => history.value.length > 0);

let confirmModal:
  ReturnType<ReturnType<typeof useOverlay>["create"]> | undefined;

function announce(message: string) {
  announcement.value = "";
  setTimeout(() => (announcement.value = message), 50);
}

function restore(snapshot: Snapshot) {
  Object.assign(plan, snapshot.plan);
  sections.value = snapshot.sections;
}

function checkpoint() {
  history.value.push(clone({ plan, sections: sections.value }));
}

/** A drag that ended where it started changed nothing. */
function dropCheckpoint() {
  history.value.pop();
}

function exists(selection: ImportSelection) {
  if (selection.kind === "plan") return true;

  return selection.kind === "section"
    ? sectionIndex(selection.id) >= 0
    : !!locate(selection.id);
}

function undo() {
  const previous = history.value.pop();

  if (!previous) return;

  restore(previous);

  if (!exists(selected.value)) selected.value = { kind: "plan" };

  announce("Change undone");
}

async function confirmAction(options: {
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
}) {
  const instance = confirmModal?.open(options);

  return (await instance?.result) === true;
}

async function reset() {
  const ok = await confirmAction({
    title: "Reset to the imported structure?",
    description: "All your changes will be lost, and this can’t be undone.",
    confirmLabel: "Reset",
    danger: true,
  });

  if (!ok || !original) return;

  history.value = [];
  restore(clone(original));
  selected.value = { kind: "plan" };
  collapsed.clear();
  announce("Reset to the imported structure");
}

function sectionIndex(id?: number) {
  return sections.value.findIndex((section) => section.id === id);
}

function locate(questionId?: number) {
  for (const [si, section] of sections.value.entries()) {
    const j = section.questions.findIndex((q) => q.id === questionId);
    const question = section.questions[j];

    if (question) return { section, si, j, question };
  }

  return null;
}

function blockElement(selection: ImportSelection) {
  return selection.kind === "plan"
    ? document.getElementById("b-plan")
    : document.getElementById(`b-${selection.kind}-${selection.id}`);
}

/** `part` puts the caret in a section's description or a question's answer. */
async function select(
  selection: ImportSelection,
  { scroll = false, focus = false } = {},
) {
  selected.value = {
    kind: selection.kind,
    id: selection.id,
    ...(selection.part ? { part: selection.part } : {}),
  };

  if (!scroll && !focus) return;

  if (scroll) {
    // Unfold whatever hides the target.
    const owner =
      selection.kind === "question"
        ? locate(selection.id)?.section.id
        : undefined;

    if (owner !== undefined) collapsed.delete(owner);

    if (selection.id !== undefined && selection.part) {
      collapsed.delete(selection.id);
    }
  }

  await nextTick();

  const block = blockElement(selection);

  const field = block?.querySelector<HTMLElement>(
    selection.part ? `[data-field="${selection.part}"]` : "textarea",
  );

  if (scroll) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    (selection.part ? field : block)?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "center",
    });
  }

  if (focus) field?.focus({ preventScroll: true });
}

function flash(elementId: string) {
  nextTick(() => {
    const element = document.getElementById(elementId);

    element?.classList.remove("import-flash");
    void element?.offsetWidth;
    element?.classList.add("import-flash");
  });
}

function moveSection(id: number, direction: -1 | 1) {
  const i = sectionIndex(id);
  const target = i + direction;
  const moving = sections.value[i];
  const other = sections.value[target];

  if (!moving || !other) return;

  checkpoint();
  sections.value[i] = other;
  sections.value[target] = moving;
  announce(`Section moved to position ${target + 1}`);
}

/** Moving past the end of a section carries the question into the next one. */
function moveQuestion(id: number, direction: -1 | 1) {
  const at = locate(id);

  if (!at) return;

  const { section, si, j } = at;

  checkpoint();

  const [question] = section.questions.splice(j, 1);

  if (!question) return;

  const target = j + direction;
  const previous = sections.value[si - 1];
  const next = sections.value[si + 1];

  if (target >= 0 && target <= section.questions.length) {
    section.questions.splice(target, 0, question);
  } else if (direction < 0 && previous) {
    previous.questions.push(question);
  } else if (direction > 0 && next) {
    next.questions.unshift(question);
  } else {
    section.questions.splice(j, 0, question);
  }

  const moved = locate(id);

  if (moved) {
    announce(
      `Question moved to section ${moved.si + 1}, position ${moved.j + 1}`,
    );
  }
}

/** A new section after the selected one. */
function addSection() {
  checkpoint();

  const section = newImportSection();
  let at = sections.value.length;

  if (selected.value.kind === "plan") at = 0;

  if (selected.value.kind === "section") {
    at = sectionIndex(selected.value.id) + 1;
  }

  if (selected.value.kind === "question") {
    at = (locate(selected.value.id)?.si ?? at - 1) + 1;
  }

  sections.value.splice(at, 0, section);
  select({ kind: "section", id: section.id }, { scroll: true, focus: true });
  announce(`Section added at position ${at + 1}`);
}

/** A new question below the selected one, or at the end of the selected section. */
function addQuestion() {
  const last = sections.value[sections.value.length - 1];

  if (!last) return;

  checkpoint();

  let owner = last;
  let at = owner.questions.length;
  const current = selected.value;

  if (current.kind === "section") {
    owner = sections.value[sectionIndex(current.id)] ?? owner;
    at = owner.questions.length;
  }

  if (current.kind === "question") {
    const found = locate(current.id);

    if (found) {
      owner = found.section;
      at = found.j + 1;
    }
  }

  const question = newImportQuestion();

  owner.questions.splice(at, 0, question);
  collapsed.delete(owner.id);
  select({ kind: "question", id: question.id }, { scroll: true, focus: true });
  announce("Question added");
}

/** Fix a wrong label. The text stays as it is; only its place in the structure changes. */
function changeType(kind: "section" | "question", id: number) {
  checkpoint();

  if (kind === "question") {
    // Question → Section: its text becomes the title of a new section right after this one, and
    // the questions below it move into that section. An answer stays, under an empty question.
    const at = locate(id);

    if (!at) return;

    const { section, si, j } = at;
    const [question, ...below] = section.questions.splice(j);

    if (!question) return;

    const created: ImportSection = {
      ...newImportSection(),
      title: question.text,
      questions: below,
    };

    if (question.answer.trim()) {
      question.text = "";
      created.questions.unshift(question);
    }

    sections.value.splice(si + 1, 0, created);
    select({ kind: "section", id: created.id }, { scroll: true, focus: true });
    flash(`b-section-${created.id}`);
    announce(
      `Question ${si + 1}.${j + 1} is now Section ${si + 2}${
        below.length
          ? ` · ${below.length} question${below.length === 1 ? "" : "s"} below it moved along`
          : ""
      }`,
    );

    return;
  }

  // Section → Question: its title becomes the first question of the section, and the section is
  // left without a title until the user writes one.
  const i = sectionIndex(id);
  const section = sections.value[i];

  if (!section) return;

  const question = { ...newImportQuestion(), text: section.title };

  section.questions.unshift(question);
  section.title = "";
  collapsed.delete(section.id);
  select({ kind: "section", id: section.id }, { scroll: true, focus: true });
  flash(`b-question-${question.id}`);
  announce(
    `Section ${i + 1}'s title is now Question ${i + 1}.1 · type a new section title`,
  );
}

/** What a type change will do, in plain words (shown in the menu before the user picks). */
function typeEffect(kind: "section" | "question", id: number) {
  if (kind === "section") {
    const n = sectionIndex(id) + 1;

    return `The section title becomes Question ${n}.1 and the other questions move down. Section ${n} will then need a new title.`;
  }

  const at = locate(id);

  if (!at) return "";

  const { section, si, j, question } = at;
  const text = question.text.trim();

  const cut = text
    ? `“${text.length > 50 ? `${text.slice(0, 50)}…` : text}”`
    : "This empty question";

  const a = si + 1;
  const count = section.questions.length - j - 1;

  const moved =
    count === 0
      ? ""
      : count === 1
        ? ` Question ${a}.${j + 2} moves into it.`
        : ` Questions ${a}.${j + 2}–${a}.${section.questions.length} move into it.`;

  const answer = question.answer.trim()
    ? " Its answer stays, under an empty question for you to fill in."
    : "";

  return `${cut} becomes the title of a new Section ${a + 1}.${moved}${answer}`;
}

async function removeBlock(kind: "section" | "question", id: number) {
  if (kind === "section") {
    const i = sectionIndex(id);
    const section = sections.value[i];

    if (!section) return;

    if (section.questions.length) {
      const ok = await confirmAction({
        title: `Delete “${section.title || "Untitled section"}”?`,
        description: `This also deletes its ${section.questions.length} question(s).`,
        confirmLabel: "Delete",
        danger: true,
      });

      if (!ok) return;
    }

    checkpoint();
    sections.value.splice(i, 1);
  } else {
    // A question and its answer go together.
    const at = locate(id);

    if (!at) return;

    checkpoint();
    at.section.questions.splice(at.j, 1);
  }

  selected.value = { kind: "plan" };
  announce(`${kind === "section" ? "Section" : "Question"} deleted`);
}

function setQuestionField(
  question: ImportQuestion,
  field: "text" | "answer",
  value: string,
) {
  question[field] = value;
}

function setSectionField(
  section: ImportSection,
  field: "title" | "description",
  value: string,
) {
  section[field] = value;
}

function setSectionQuestions(
  section: ImportSection,
  questions: ImportQuestion[],
) {
  section.questions = questions;
}

function setAllCollapsed(value: boolean) {
  collapsed.clear();

  if (value) sections.value.forEach((section) => collapsed.add(section.id));
}

const allCollapsed = computed(
  () =>
    sections.value.length > 0 &&
    sections.value.every((section) => collapsed.has(section.id)),
);

/** Demo: only the two samples can be used, as if they had just been extracted. */
async function loadSample(key: ImportSampleKey) {
  const base = `/samples/import/${key}`;

  const [narrative, extracted] = await Promise.all([
    $fetch<ExtractionJson>(`${base}-narrative.json`),
    $fetch<RdaDocument>(`${base}-rda.json`),
    new Promise((resolve) => setTimeout(resolve, FAKE_EXTRACTION_MS)),
  ]);

  const imported = narrativeFromJson(narrative);
  const metadata = normalizeRdaNulls(extracted);

  Object.assign(plan, imported.plan);
  sections.value = imported.sections;
  original = clone(imported);
  downloadUrl.value = narrative.narrative.download_url ?? "";
  fillDemoCreators(metadata);
  rda.value = metadata;
  history.value = [];
  selected.value = { kind: "plan" };
  collapsed.clear();
  jsonCollapsed.clear();
  jsonMetaOpened.clear();
  treeExpanded.value = imported.sections.map((s) => `s-${s.id}`);
  metaOpen.value = ["ds-0"];
  loaded.value = true;
  pristine = planText();
  saveDraft();
  announce(
    `Extracted ${imported.sections.length} sections from the ${SAMPLES[key].label} sample. Check them and fix anything that's wrong.`,
  );
}

function discard() {
  loaded.value = false;
  removeDraft();
}

/** The narrative from step 2 next to the metadata from step 3. */
function exportText() {
  return JSON.stringify(
    {
      ...narrativeToJson(plan, sections.value, downloadUrl.value),
      ...normalizeRdaNulls(rda.value),
    },
    null,
    2,
  );
}

export function useDmpImport() {
  startDraft();
  confirmModal ??= useOverlay().create(ImportConfirmModal);

  return {
    SAMPLES,
    addQuestion,
    addSection,
    allCollapsed,
    announce,
    announcement,
    canUndo,
    changeType,
    checkpoint,
    collapsed,
    confirmAction,
    discard,
    downloadUrl,
    dropCheckpoint,
    exportText,
    hasChanges,
    jsonCollapsed,
    jsonMetaOpened,
    loadSample,
    loaded,
    locate,
    metaOpen,
    moveQuestion,
    moveSection,
    plan,
    rda,
    removeBlock,
    reset,
    sectionIndex,
    sections,
    select,
    selected,
    setAllCollapsed,
    setQuestionField,
    setSectionField,
    setSectionQuestions,
    treeExpanded,
    typeEffect,
    undo,
  };
}
