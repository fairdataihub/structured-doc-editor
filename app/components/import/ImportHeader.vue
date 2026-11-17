<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";

// The top bar, one row: brand, the four steps as long as the space allows (centered in a wide window),
// then the colors switch (it affects every panel) with Back and Next. The right column keeps its
// width on every step, so the steps don't jump between pages.

const { confirmAction, discard, loaded, sections } = useDmpImport();

const route = useRoute();
const colors = useLocalStorage("dmp-colors", "on");

const stepIndex = computed(() =>
  Math.max(
    0,
    IMPORT_STEPS.findIndex((step) => step.path === route.path),
  ),
);

const stepId = computed(() => IMPORT_STEPS[stepIndex.value]?.id ?? "upload");

// The buttons say where they lead, so nobody has to guess what comes next.
const backLabel = computed(
  () => `Back: ${IMPORT_STEPS[stepIndex.value - 1]?.title ?? ""}`,
);

const nextLabel = computed(
  () => `Next: ${IMPORT_STEPS[stepIndex.value + 1]?.title ?? ""}`,
);

const stepItems = computed(() =>
  IMPORT_STEPS.map((step, i) => ({
    title: step.title,
    // Nothing to review or export until a plan is loaded.
    disabled: i > 0 && !loaded.value,
  })),
);

async function goToStep(index: number) {
  const target = IMPORT_STEPS[index];

  if (!target || index === stepIndex.value) return;

  // Back to step 1 discards the plan, so ask first.
  if (index === 0 && loaded.value) {
    const ok = await confirmAction({
      title: "Upload a different PDF?",
      description: "Changes to this plan will be lost.",
      confirmLabel: "Discard changes",
      danger: true,
    });

    if (!ok) return;

    discard();
  }

  // Leaving the structure step checks for sections without a title and questions without text.
  if (stepId.value === "structure" && index > stepIndex.value) {
    const gaps = narrativeGaps(sections.value);

    if (gaps.length) {
      const ok = await confirmAction({
        title: "Continue anyway?",
        description: `There are ${gaps.join(" and ")}.`,
        confirmLabel: "Continue",
      });

      if (!ok) return;
    }
  }

  await navigateTo(target.path);
}
</script>

<template>
  <header
    class="border-default bg-default flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-5 py-2 min-[1100px]:grid min-[1100px]:grid-cols-[minmax(max-content,1fr)_minmax(0,56rem)_minmax(31rem,1fr)]"
  >
    <NuxtLink
      to="/import"
      class="text-xl font-bold tracking-tight"
      aria-label="DMP Bridge, home"
    >
      DMP <span class="text-primary">Bridge</span>
    </NuxtLink>

    <!-- The stepper's own live text counts from 0 ("Step 0 of 4"). The route announcer reads each new step instead. -->
    <nav
      aria-label="Import steps"
      class="w-full max-[1099px]:order-last max-[1099px]:basis-full [&_[role=status]]:hidden"
    >
      <UStepper
        :model-value="stepIndex"
        :items="stepItems"
        :linear="false"
        size="xs"
        class="w-full"
        @update:model-value="goToStep(Number($event))"
      />
    </nav>

    <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
      <USwitch
        v-if="stepId === 'structure'"
        :model-value="colors !== 'off'"
        label="Colors"
        class="mr-2"
        @update:model-value="colors = $event ? 'on' : 'off'"
      />

      <template v-if="stepIndex > 0">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          :label="backLabel"
          icon="i-lucide-arrow-left"
          @click="goToStep(stepIndex - 1)"
        />

        <UButton
          v-if="stepId !== 'export'"
          size="lg"
          class="font-semibold"
          :label="nextLabel"
          trailing-icon="i-lucide-arrow-right"
          @click="goToStep(stepIndex + 1)"
        />
      </template>
    </div>
  </header>
</template>
