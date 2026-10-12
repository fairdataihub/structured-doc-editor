<script setup lang="ts">
// Export: JSON in the extraction's shape, with the edits, so whatever reads it today keeps working.

const plan = usePlan();
const review = useReview();
const { state, numbering, structure, exportOpen, meta } = plan;

const message = ref("");
const json = computed(() =>
  exportOpen.value
    ? JSON.stringify(toExtractionJson(state, numbering.value), null, 2)
    : "",
);
const issues = computed(() => review.openIssues.value.length);
const fileName = computed(
  () => (meta.fileName || "plan").replace(/\.pdf$/i, "") + "-edited.json",
);

function downloadJson() {
  const url = URL.createObjectURL(
    new Blob([json.value], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.value;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message.value = `Saved ${fileName.value}.`;
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(json.value);
    message.value = "Copied to the clipboard.";
  } catch {
    message.value = "Your browser blocked copying. Use Download instead.";
  }
}

watch(exportOpen, (open) => {
  if (open) message.value = "";
});
</script>

<template>
  <UModal
    v-model:open="exportOpen"
    title="Export your plan"
    description="JSON in the same shape as the extraction file, with your edits."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="grid gap-4">
        <div class="flex flex-wrap gap-1.5">
          <span class="chip">{{ structure.secs.length }} sections</span>

          <span class="chip"
            >{{
              structure.secs.reduce((n, s) => n + s.qs.length, 0)
            }}
            questions</span
          >
        </div>

        <UAlert
          v-if="issues"
          color="warning"
          variant="soft"
          icon="i-lucide-circle-alert"
          :title="`${issues} item${issues > 1 ? 's' : ''} still need${issues > 1 ? '' : 's'} a look. You can export anyway.`"
          :actions="[
            {
              label: 'Review them',
              color: 'warning',
              variant: 'outline',
              onClick: () => {
                exportOpen = false;
                review.start();
              },
            },
          ]"
        />

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            color="primary"
            icon="i-lucide-file-down"
            @click="downloadJson"
            >Download JSON</UButton
          >

          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-copy"
            @click="copyJson"
            >Copy</UButton
          >

          <span class="text-xs text-[var(--muted)]" role="status">{{
            message
          }}</span>
        </div>

        <details>
          <summary class="cursor-pointer text-sm text-[var(--muted)]">
            Preview the JSON
          </summary>

          <pre class="json mt-2">{{ json }}</pre>
        </details>
      </div>
    </template>
  </UModal>
</template>
