<script setup lang="ts">
import { useClipboard } from "@vueuse/core";

definePageMeta({
  layout: "import",
  middleware: "import-plan",
  colorMode: "light",
});

useSeoMeta({ title: "Export JSON" });

const { exportText } = useDmpImport();
const { copy, copied } = useClipboard({ legacy: true });

const text = exportText();

function download() {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );

  const link = document.createElement("a");

  link.href = url;
  link.download = "dmp.json";
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="p-5">
    <UCard class="mx-auto max-w-225">
      <div class="flex flex-wrap items-center gap-2.5">
        <h1 class="mr-auto text-xl font-semibold tracking-tight">
          Export JSON
        </h1>

        <UButton
          color="neutral"
          variant="outline"
          :label="copied ? 'Copied' : 'Copy'"
          @click="copy(text)"
        />

        <UButton label="Download JSON" @click="download" />
      </div>

      <p class="text-muted mt-1.5 mb-4">
        The full DMP as JSON: the narrative from step 2 and the metadata (RDA)
        from step 3.
      </p>

      <pre
        tabindex="0"
        aria-label="The full DMP as JSON"
        class="border-default bg-muted max-h-[calc(100dvh-260px)] overflow-auto rounded-md border p-4 font-mono text-xs leading-normal"
        >{{ text }}</pre>
    </UCard>
  </div>
</template>
