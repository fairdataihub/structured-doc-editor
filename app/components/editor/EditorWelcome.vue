<script setup lang="ts">
// The welcome panel at the bottom of the editor: what was extracted and how to work. It opens on
// the first visit and from "Show the intro again" in the file menu. There are no automatic checks:
// people read the plan through and check its structure themselves.

const plan = usePlan();
const { state, welcomeOpen } = plan;
</script>

<template>
  <section v-if="welcomeOpen" class="dock" aria-label="Welcome">
    <div class="dk-head">
      <span class="dk-kind ok">Extraction finished</span>

      <span class="flex-1" />

      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Close"
        @click="plan.closeWelcome()"
      />
    </div>

    <h3 class="dk-title">{{ state.file }} is ready to edit</h3>

    <p class="dk-body">
      We found {{ state.counts.sections }} sections and
      {{ state.counts.questions }} questions. Read it through against your
      original and fix anything that’s off.
    </p>

    <ul class="tips">
      <li>
        <span class="tip-ic"
          ><UIcon name="i-lucide-highlighter" class="size-3.5"
        /></span>

        <span
          ><b>Check the structure.</b> Each title, section, section description,
          question and answer has its own colour (see the legend above the
          page). Turn the colours off with Structure in the toolbar.</span
        >
      </li>

      <li>
        <span class="tip-ic"
          ><UIcon name="i-lucide-text-cursor" class="size-3.5"
        /></span>

        <span
          ><b>Edit</b> by clicking any text on the page. Pages, numbers and
          styles update as you type.</span
        >
      </li>

      <li>
        <span class="tip-ic"
          ><UIcon name="i-lucide-grip-vertical" class="size-3.5"
        /></span>

        <span
          ><b>Move</b> a section by dragging its number on the page, or any row
          in the outline. It renumbers and formats itself where you drop
          it.</span
        >
      </li>

      <li>
        <span class="tip-ic"><span class="sw t-section" /></span>

        <span
          ><b>Change what a block is</b> (section, section description, question
          or answer) with the Style menu. Its look and number follow
          automatically.</span
        >
      </li>
    </ul>

    <div class="dk-actions">
      <UButton color="primary" @click="plan.closeWelcome()"
        >Start editing</UButton
      >
    </div>
  </section>
</template>
