<script setup>
import { computed } from 'vue';
import { useReaderStore } from '~/stores/reader';

const props = defineProps({ open: { type: Boolean, required: true } });
const emit = defineEmits(['close']);

const reader = useReaderStore();
const pages = computed(() => reader.edition?.pages || []);

function labelFor(page) {
  if (page.section) return page.section;
  if (page.stories?.[0]?.headline) return page.stories[0].headline;
  return `Page ${page.pageNumber}`;
}

function selectPage(pageNumber) {
  reader.jumpTo(pageNumber);
  emit('close');
}
</script>

<template>
  <div
    class="fixed right-0 bottom-0 left-0 z-[180] bg-black/50 transition-opacity top-[52px] sm:top-[60px]"
    :class="open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    @click="emit('close')"
  >
    <div
      class="absolute top-0 right-0 bottom-0 w-full max-w-[340px] bg-neutral-800 border-l border-neutral-600 shadow-2xl overflow-y-auto transition-transform"
      :class="open ? 'translate-x-0' : 'translate-x-full'"
      @click.stop
    >
      <div class="px-4 py-4 border-b border-neutral-700 font-serif font-bold text-white">Contents</div>
      <div
        v-for="page in pages" :key="page.pageNumber"
        class="flex gap-3 px-4 py-3 border-b border-neutral-700/60 cursor-pointer hover:bg-neutral-700"
        @click="selectPage(page.pageNumber)"
      >
        <div class="font-mono text-sm text-neutral-400 min-w-[22px]">{{ page.pageNumber }}</div>
        <div class="text-[12.5px] text-neutral-200 leading-snug">{{ labelFor(page) }}</div>
      </div>
    </div>
  </div>
</template>