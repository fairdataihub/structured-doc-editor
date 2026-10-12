<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

useSeoMeta({ title: "Editor" });

// The editor, opened on the sample plan (/plans/sample). PDF upload isn't connected yet, so the
// start page (/) sends everyone here. Loads the sample's LLM extraction; nothing is compared with
// the original PDF: people edit the plan and check its structure themselves.
const SAMPLE = {
  fileName: "sample1.pdf",
  json: "/samples/sample1.json",
};

const plan = usePlan();
const review = useReview();
const toast = useToast();
const { ready, ui, sel, announcement } = plan;
const error = ref("");

onMounted(async () => {
  try {
    const json = await $fetch<unknown>(SAMPLE.json);
    plan.load({
      json: ExtractionSchema.parse(json) as ExtractionJson,
      fileName: SAMPLE.fileName,
      notify: toast,
    });
    if (!ui.introSeen) review.show("intro");
  } catch (e) {
    error.value = `Couldn't load the sample: ${(e as Error).message}`;
  }
});

// Keyboard shortcuts that work anywhere (the block editors handle their own first).
useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (e.defaultPrevented || document.body.classList.contains("is-dragging"))
    return;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  const inField = (e.target as HTMLElement).closest(
    "input, textarea, [role='dialog']",
  );
  if (mod && !e.altKey && key === "z" && !inField) {
    e.preventDefault();
    if (e.shiftKey) plan.redo();
    else plan.undo();
  } else if (mod && !e.altKey && key === "y" && !inField) {
    e.preventDefault();
    plan.redo();
  } else if (
    e.altKey &&
    !mod &&
    (e.key === "ArrowUp" || e.key === "ArrowDown") &&
    sel.value &&
    !inField
  ) {
    e.preventDefault();
    plan.nudge(sel.value, e.key === "ArrowUp" ? -1 : 1);
  } else if (mod && e.altKey && sel.value) {
    const t = (
      { Digit1: "section", Digit2: "question", Digit0: "answer" } as const
    )[e.code as "Digit1"];
    if (t) {
      e.preventDefault();
      plan.setType(sel.value, t);
    }
  } else if (mod && e.shiftKey && e.code === "Digit8" && sel.value) {
    e.preventDefault();
    plan.setType(sel.value, "list");
  } else if (e.key === "Escape" && ui.outlineOpen) {
    ui.outlineOpen = false;
  }
});
</script>

<template>
  <div class="app">
    <EditorTopBar />

    <div class="main">
      <EditorOutline v-if="ready" />

      <div
        v-if="ui.outlineOpen"
        class="scrim"
        @click="ui.outlineOpen = false"
      />

      <main class="stage">
        <EditorToolbar />

        <EditorCanvas v-if="ready" />

        <div v-else class="grid flex-1 place-items-center text-[var(--muted)]">
          {{ error || "Loading sample1…" }}
        </div>

        <EditorReviewDock />
      </main>

      <EditorSidePanel v-if="ready" />
    </div>

    <EditorExportModal />

    <div class="sr" aria-live="polite">{{ announcement }}</div>
  </div>
</template>
