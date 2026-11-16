<script setup lang="ts">
// Every "are you sure" of the flow. Opened through useOverlay, resolves to true or false.

defineProps<{
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
}>();

const emit = defineEmits<{ close: [confirmed: boolean] }>();
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :close="false"
    @update:open="emit('close', false)"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          label="Cancel"
          autofocus
          @click="emit('close', false)"
        />

        <UButton
          :color="danger ? 'error' : 'primary'"
          :label="confirmLabel"
          @click="emit('close', true)"
        />
      </div>
    </template>
  </UModal>
</template>
