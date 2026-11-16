<script setup lang="ts">
// The open part of a dataset card: its fields, then one box per creator.

const props = defineProps<{
  dataset: RdaDataset;
  index: number;
}>();

const { confirmAction } = useDmpImport();
const creatorList = useTemplateRef("creatorList");

async function addCreator() {
  addRdaCreator(props.dataset);

  await nextTick();

  const names = creatorList.value?.querySelectorAll<HTMLElement>(
    "[data-meta-field=name]",
  );

  names?.[names.length - 1]?.focus();
}

async function removeCreator(j: number) {
  const creator = props.dataset.creator?.[j];

  if (!creator) return;

  const name = metaBlank(creator.name).trim();

  if (name) {
    const ok = await confirmAction({
      title: `Remove creator “${name}”?`,
      confirmLabel: "Remove",
      danger: true,
    });

    if (!ok) return;
  }

  removeRdaCreator(props.dataset, j);
}
</script>

<template>
  <div class="grid gap-x-4 gap-y-3 pb-1 sm:grid-cols-2">
    <ImportMetaField
      v-for="field in DATASET_FIELDS"
      :key="field.id"
      :field="field"
      :owner="dataset"
    />
  </div>

  <USeparator class="my-4" />

  <h2 class="text-primary mb-2 text-xs font-bold tracking-wider uppercase">
    Dataset creators
  </h2>

  <div ref="creatorList">
    <UCard
      v-for="(creator, j) in dataset.creator ?? []"
      :key="j"
      variant="subtle"
      class="mb-3"
      :ui="{ header: 'p-3 sm:px-3.5', body: 'p-3 sm:p-3.5' }"
    >
      <template #header>
        <div class="flex items-center justify-between font-semibold">
          <h3>Creator {{ j + 1 }}</h3>

          <UButton
            color="neutral"
            variant="outline"
            size="xs"
            icon="i-lucide-x"
            label="Remove"
            :aria-label="`Remove creator ${j + 1}`"
            @click="removeCreator(j)"
          />
        </div>
      </template>

      <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <ImportMetaField
          v-for="field in CREATOR_FIELDS"
          :key="field.id"
          :field="field"
          :owner="creator"
        />
      </div>
    </UCard>
  </div>

  <UButton
    color="neutral"
    variant="outline"
    icon="i-lucide-plus"
    label="Add creator"
    class="border-dashed"
    @click="addCreator"
  />
</template>
