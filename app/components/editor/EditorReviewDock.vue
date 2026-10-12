<script setup lang="ts">
const plan = usePlan();
const review = useReview();
const { dock, openIssues, view, current } = review;
const { state, pageCount, exportOpen } = plan;

const position = computed(() => {
  const list = openIssues.value;
  const i = list.findIndex((x) => x.id === dock.id);

  return { i: i + 1, n: list.length };
});
</script>

<template>
  <section v-if="dock.mode" class="dock" aria-label="Review">
    <!-- Intro: what was extracted and how to work -->
    <template v-if="dock.mode === 'intro'">
      <div class="dk-head">
        <span class="dk-kind ok">Extraction finished</span>

        <span class="flex-1" />

        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Close"
          @click="review.close()"
        />
      </div>

      <h3 class="dk-title">{{ state.file }} is ready to edit</h3>

      <p class="dk-body">
        We found {{ state.counts.sections }} sections and
        {{ state.counts.questions }} questions. Read it through against your
        original and fix anything that’s off.
        {{
          openIssues.length
            ? `${openIssues.length} spots also need a quick look.`
            : ""
        }}
      </p>

      <ul class="tips">
        <li>
          <span class="tip-ic"
            ><UIcon name="i-lucide-highlighter" class="size-3.5"
          /></span>

          <span
            ><b>Check the structure.</b> Each title, section, question, answer
            and list has its own colour (see the legend above the page). Turn
            the colours off with Structure in the toolbar.</span
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
            ><b>Move</b> a section by dragging its number on the page, or any
            row in the outline. It renumbers and formats itself where you drop
            it.</span
          >
        </li>

        <li>
          <span class="tip-ic"><span class="sw t-section" /></span>

          <span
            ><b>Change what a block is</b> (section, question, answer or list)
            with the Style menu. Its look and number follow automatically.</span
          >
        </li>
      </ul>

      <div class="dk-actions">
        <UButton
          v-if="openIssues.length"
          color="primary"
          @click="review.start()"
          >Start review ({{ openIssues.length }})</UButton
        >

        <UButton color="neutral" variant="outline" @click="review.close()">{{
          openIssues.length ? "Look around first" : "Start editing"
        }}</UButton>
      </div>
    </template>

    <!-- One item at a time -->
    <template v-else-if="dock.mode === 'issue' && view && current">
      <div class="dk-head">
        <span class="dk-kind">{{ view.kindLabel }}</span>

        <span class="dk-count">{{ position.i }} of {{ position.n }}</span>

        <span class="flex-1" />

        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Previous"
          :disabled="position.n < 2"
          @click="review.step(-1)"
        />

        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Next"
          :disabled="position.n < 2"
          @click="review.step(1)"
        />

        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Close review"
          @click="review.close()"
        />
      </div>

      <h3 class="dk-title">{{ view.title }}</h3>

      <p class="dk-where">{{ view.where }}</p>

      <p v-if="view.body" class="dk-body">{{ view.body }}</p>

      <div class="dk-actions">
        <UButton
          v-for="a in view.actions"
          :key="a.label"
          :color="a.primary ? 'primary' : 'neutral'"
          :variant="a.primary ? 'solid' : 'outline'"
          @click="a.run()"
        >
          {{ a.label }}
        </UButton>
      </div>
    </template>

    <!-- Done -->
    <template v-else>
      <div class="dk-head">
        <span class="dk-kind ok">Review finished</span>

        <span class="flex-1" />

        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Close"
          @click="review.close()"
        />
      </div>

      <h3 class="dk-title">Everything has been checked</h3>

      <p class="dk-body">
        Your plan is {{ pageCount }} page{{ pageCount > 1 ? "s" : "" }}. Export
        it when you’re ready, or keep editing.
      </p>

      <div class="dk-actions">
        <UButton color="primary" @click="exportOpen = true">Export</UButton>

        <UButton color="neutral" variant="outline" @click="review.close()"
          >Keep editing</UButton
        >
      </div>
    </template>
  </section>
</template>
