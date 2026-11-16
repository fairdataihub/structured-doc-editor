<script setup lang="ts" generic="T extends object">
// One field of a dataset or creator card. Typing or picking updates the RDA JSON directly.

const props = defineProps<{
  field: ImportMetaField<T>;
  owner: T;
}>();

// A select can't hold an empty value, so "Not set" has its own and is stored as null.
const NOT_SET = "not-set";

const text = computed({
  get: () => metaBlank(props.field.get(props.owner)),
  set: (value: string) =>
    props.field.set(props.owner, value.trim() ? value : null),
});

const choice = computed({
  get: () => text.value || NOT_SET,
  set: (value: string) => (text.value = value === NOT_SET ? "" : value),
});

const options = computed(() => [
  { label: "Not set", value: NOT_SET },
  ...(props.field.options ?? []).map((option) => ({
    label: option.charAt(0).toUpperCase() + option.slice(1),
    value: option,
  })),
]);

const placeholder = computed(() =>
  props.field.example ? `e.g. ${props.field.example}` : undefined,
);
</script>

<template>
  <UFormField :label="field.label" :class="field.full ? 'sm:col-span-2' : ''">
    <USelect
      v-if="field.options"
      v-model="choice"
      :items="options"
      class="w-full"
    />

    <UTextarea
      v-else-if="field.area"
      v-model="text"
      autoresize
      :rows="3"
      class="w-full"
      :placeholder="placeholder"
    />

    <UInput
      v-else
      v-model="text"
      class="w-full"
      :placeholder="placeholder"
      :data-meta-field="field.id"
    />
  </UFormField>
</template>
