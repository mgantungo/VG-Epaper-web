<script setup>
import { useReaderStore } from '~/stores/reader';

const reader = useReaderStore();
const emit = defineEmits(['turn']);
</script>

<template>
  <button
    class="flex-none w-[46px] h-[46px] md:w-[46px] md:h-[46px] rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center shadow-lg disabled:opacity-30 hover:bg-neutral-700 hover:text-white active:scale-90 transition"
    :disabled="reader.atStart || reader.animating"
    aria-label="Previous page"
    @click="emit('turn', 'prev')"
  >‹</button>
</template>
