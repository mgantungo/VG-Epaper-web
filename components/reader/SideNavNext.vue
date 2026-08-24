<script setup lang="ts">
import { useReaderStore } from '~/stores/reader';

const reader = useReaderStore();
const emit = defineEmits<{ (e: 'turn', direction: 'next' | 'prev'): void }>();
</script>

<template>
  <button
    class="flex-none w-[46px] h-[46px] rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center shadow-lg disabled:opacity-30 hover:bg-neutral-700 hover:text-white active:scale-90 transition"
    :disabled="reader.atEnd || reader.animating"
    aria-label="Next page"
    @click="emit('turn', 'next')"
  >›</button>
</template>
