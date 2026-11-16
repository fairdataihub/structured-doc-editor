<script setup lang="ts">
// Step 1. Extraction isn't connected yet, so the file picker is switched off and the two samples
// open instead. A file dropped on the page is ignored rather than opened by the browser.

const { SAMPLES, loadSample } = useDmpImport();

const SAMPLE_KEYS: ImportSampleKey[] = ["nih", "nsf"];

const busy = ref<ImportSampleKey | null>(null);
const error = ref("");

async function open(key: ImportSampleKey) {
  if (busy.value) return;

  error.value = "";
  busy.value = key;

  try {
    await loadSample(key);
    await navigateTo("/import/structure");
  } catch {
    error.value = "The sample could not be loaded. Please try again.";
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div
    class="grid flex-1 place-items-center p-6"
    @dragover.prevent
    @drop.prevent
  >
    <UCard class="w-full max-w-xl" :ui="{ body: 'p-8 sm:p-8' }">
      <div v-if="busy" class="py-8 text-center">
        <UIcon
          name="i-lucide-loader-circle"
          class="text-primary mb-3 size-9 motion-safe:animate-spin"
        />

        <p class="font-semibold">
          {{ SAMPLES[busy].label }} DMP sample ({{ SAMPLES[busy].file }})
        </p>

        <p role="status" class="mt-1">Extracting the structure…</p>

        <p class="text-muted mt-4 text-xs">
          Demo: extraction isn't connected yet, so the sample plan is loaded.
        </p>
      </div>

      <div v-else class="flex flex-col items-center gap-4 text-center">
        <UIcon
          name="i-lucide-file-text"
          class="text-primary size-12"
          aria-hidden="true"
        />

        <h1 class="text-xl font-semibold tracking-tight">
          Upload your Data Management Plan
        </h1>

        <div class="flex w-60 flex-col gap-2">
          <UButton
            v-for="key in SAMPLE_KEYS"
            :key="key"
            block
            size="lg"
            :label="`Try with ${SAMPLES[key].label} DMP sample`"
            @click="open(key)"
          />
        </div>

        <UFileUpload
          disabled
          accept="application/pdf"
          label="Choose PDF"
          description="Uploading your own PDF isn't available in this demo yet."
          class="min-h-32 w-full"
        />

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :title="error"
          role="alert"
        />

        <p class="text-muted text-xs">
          We find the title, sections, questions and answers in your plan. On
          the next page you check them and fix anything that's wrong.
        </p>
      </div>
    </UCard>
  </div>
</template>
