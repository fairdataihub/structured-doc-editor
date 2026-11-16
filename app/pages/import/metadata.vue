<script setup lang="ts">
definePageMeta({
  layout: "import",
  middleware: "import-plan",
  colorMode: "light",
});

useSeoMeta({ title: "Review metadata" });

const { metaOpen, rda } = useDmpImport();

const datasets = computed(() =>
  (rda.value?.dmp.dataset ?? []).map((dataset, i) => ({
    value: `ds-${i}`,
    label: `Dataset ${i + 1}`,
    title: metaBlank(dataset.title).trim() || "Untitled dataset",
    dataset,
    index: i,
  })),
);
</script>

<template>
  <div class="p-5">
    <UCard class="mx-auto max-w-225">
      <h1 class="mb-4 text-xl font-semibold tracking-tight">Review metadata</h1>

      <UAccordion
        v-model="metaOpen"
        type="multiple"
        :items="datasets"
        :ui="{
          item: 'border-default mb-3.5 rounded-lg border last:border-b',
          trigger: 'rounded-t-lg bg-(--sec-bg) px-3.5 py-2.5',
          body: 'p-4',
        }"
      >
        <template #default="{ item }">
          <span
            class="text-primary text-xs font-bold tracking-wider whitespace-nowrap uppercase"
          >
            {{ item.label }}
          </span>

          <span class="ml-2.5 min-w-0 truncate font-semibold">
            {{ item.title }}
          </span>
        </template>

        <template #body="{ item }">
          <ImportDatasetBody :dataset="item.dataset" :index="item.index" />
        </template>
      </UAccordion>
    </UCard>
  </div>
</template>
