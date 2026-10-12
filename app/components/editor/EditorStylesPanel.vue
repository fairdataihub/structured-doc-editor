<script setup lang="ts">
// The plan's one style, read-only. It sets the font, size, spacing and numbering of every
// kind of block; nobody styles blocks one by one, and there's no bold, italic or underline.
// Hide this panel from researchers with NUXT_PUBLIC_SHOW_STYLES_PANEL=false.

const plan = usePlan();
const { state, pageCount } = plan;
const ORDER: BlockType[] = ["title", "section", "question", "answer", "list"];
const FALLBACK: Record<BlockType, string> = {
  title: "Data Management and Sharing Plan",
  section: "Data Type:",
  question: "Types and amount of scientific data",
  answer:
    "This secondary data analysis project will analyze deidentified data from 48,218 participants.",
  list: "(i) The RISE study",
};

const counts = computed(() => {
  const c: Partial<Record<BlockType, number>> = {};
  for (const b of state.blocks) c[b.type] = (c[b.type] ?? 0) + 1;

  return c;
});

function sample(type: BlockType) {
  const b = state.blocks.find((x) => x.type === type);
  const prefix =
    type === "section"
      ? sectionPrefix(1)
      : type === "question"
        ? questionPrefix(1)
        : "";

  return blockHtml({
    type,
    prefix,
    html: escapeHtml(b && plainOf(b) ? plainOf(b) : FALLBACK[type]),
  });
}

function showUses(type: BlockType) {
  const ids = state.blocks.filter((b) => b.type === type).map((b) => b.id);
  if (!ids.length)
    return plan.toast(`No ${TYPE_LABEL[type].toLowerCase()} blocks yet`, false);
  plan.scrollToBlock(ids[0]!, "nearest");
  plan.flash(ids);
  plan.toast(
    `${ids.length} block${ids.length > 1 ? "s" : ""} use the ${TYPE_LABEL[type].toLowerCase()} style`,
    false,
  );
}
</script>

<template>
  <div class="set">
    <div>
      <div class="set-label">Styles ({{ PAPER_STYLE.name }})</div>

      <div class="st-list">
        <button
          v-for="type in ORDER"
          :key="type"
          type="button"
          class="st-card"
          :title="`Show every ${TYPE_LABEL[type].toLowerCase()} on the page`"
          @click="showUses(type)"
        >
          <span class="st-head">
            <span class="sw" :class="`t-${type}`" />

            <b>{{ TYPE_LABEL[type] }}</b>

            <span class="st-count">{{ counts[type] ?? 0 }} on the page</span>
          </span>

          <!-- eslint-disable-next-line vue/no-v-html -- built by blockHtml() from escaped text -->
          <span class="st-paper paper" v-html="sample(type)" />

          <span class="st-spec"
            >{{ PAPER_STYLE.font }} ({{ PAPER_STYLE.fontNote }})
            {{ PAPER_STYLE.spec[type] }}</span
          >
        </button>
      </div>

      <p class="set-help">
        Page: {{ PAPER_STYLE.paper.label }}, {{ PAPER_STYLE.margin }} in
        margins, “Page 1 of 2” footer.
      </p>
    </div>

    <div class="compliance" aria-label="NIH format check">
      <div class="eyebrow">NIH format check</div>

      <div class="row">
        <UIcon name="i-lucide-check" class="ok size-4" /><span
          >{{ PAPER_STYLE.font }} ({{ PAPER_STYLE.fontNote }}) at 11 pt: 11 pt
          or larger</span
        >
      </div>

      <div class="row">
        <UIcon name="i-lucide-check" class="ok size-4" /><span
          >{{ PAPER_STYLE.margin }} in margins: at least 0.5 in</span
        >
      </div>

      <div class="row">
        <UIcon
          :name="pageCount <= 2 ? 'i-lucide-check' : 'i-lucide-circle-alert'"
          :class="pageCount <= 2 ? 'ok' : 'bad'"
          class="size-4"
        />

        <span
          >{{ pageCount }} page{{ pageCount > 1 ? "s" : ""
          }}{{ pageCount <= 2 ? ": within" : ": over" }} the recommended 2
          pages</span
        >
      </div>

      <div class="src">
        From NIH guidance on attachment format and DMS Plan length.
      </div>
    </div>
  </div>
</template>
