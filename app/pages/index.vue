<script setup lang="ts">
// The start of the flow: where people will upload their DMP. Extraction isn't connected yet, so
// the drop zone shows the design but is switched off, and the sample plan opens instead.

useSeoMeta({ title: "Start" });

const notice = ref("");

// A file dropped anywhere on the page would otherwise open in the browser and leave the app.
function onDrop() {
  notice.value =
    "PDF upload is coming soon. For now, open the sample plan to try the editor.";
}
</script>

<template>
  <div class="start" @dragover.prevent @drop.prevent="onDrop">
    <header class="top">
      <AppBrand />

      <span class="flex-1" />

      <UColorModeButton />
    </header>

    <main class="start-main">
      <ol class="start-steps" aria-label="How it works">
        <li aria-current="step"><span>1</span>Upload your plan</li>

        <li><span>2</span>Check the structure</li>

        <li><span>3</span>Export JSON</li>
      </ol>

      <h1 class="start-title">Start with your Data Management Plan</h1>

      <p class="start-lead">
        Upload your plan and we’ll lay it out as sections, questions and
        answers, ready to edit and export.
      </p>

      <section class="drop" aria-disabled="true" aria-labelledby="drop-title">
        <span class="drop-badge">Coming soon</span>

        <span class="drop-icon" aria-hidden="true">PDF</span>

        <p id="drop-title" class="drop-title">Drag your plan here</p>

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-upload"
          disabled
          >Choose a PDF</UButton
        >

        <p class="drop-note">
          PDF upload and extraction aren’t connected in this demo yet.
        </p>
      </section>

      <p class="start-notice" role="status">{{ notice }}</p>

      <UButton
        to="/plans/sample"
        size="lg"
        trailing-icon="i-lucide-arrow-right"
        class="start-cta"
        >Open the sample plan</UButton
      >

      <p class="start-small">
        An NIH Data Management and Sharing Plan with 6 sections. Your changes
        are saved in this browser.
      </p>
    </main>
  </div>
</template>
