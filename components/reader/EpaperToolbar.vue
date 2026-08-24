<script setup lang="ts">
import { computed } from 'vue';
import { useReaderStore } from '~/stores/reader';

const reader = useReaderStore();
const emit = defineEmits<{
  (e: 'turn', direction: 'next' | 'prev'): void;
  (e: 'first' | 'last' | 'open-archive'): void;
}>();

const pageIndicator = computed(() => {
  const v = reader.currentView;
  const count = reader.edition?.pageCount ?? 0;
  if (reader.viewMode === 'single') return `${v.right?.pageNumber ?? '–'} / ${count}`;
  if (v.left && v.right) return `${v.left.pageNumber}\u2013${v.right.pageNumber} / ${count}`;
  return `${(v.left ?? v.right)?.pageNumber ?? '–'} / ${count}`;
});
</script>

<template>
  <div class="fixed top-0 left-0 right-0 h-[52px] z-[200] bg-neutral-900 border-b border-black flex items-stretch shadow-lg overflow-x-auto">
    <div class="flex items-center gap-2 px-3 flex-none">
      <div class="w-[30px] h-[30px] rounded-md bg-gradient-to-br from-neutral-700 to-black text-neutral-100 flex items-center justify-center font-serif font-bold text-xs">NV</div>
    </div>
    <div class="w-px bg-neutral-700 my-2 mx-1" />

    <div class="flex items-center gap-1 px-2 flex-none">
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atStart || reader.animating" @click="emit('first')">⏮</button>
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atStart || reader.animating" @click="emit('turn', 'prev')">‹</button>
      <span class="font-mono text-[13px] text-neutral-200 px-2 min-w-[70px] text-center">{{ pageIndicator }}</span>
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atEnd || reader.animating" @click="emit('turn', 'next')">›</button>
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atEnd || reader.animating" @click="emit('last')">⏭</button>
    </div>

    <div class="w-px bg-neutral-700 my-2 mx-1" />

    <div class="flex items-center gap-1 px-2 flex-none">
      <button
        class="w-9 h-9 rounded-md flex items-center justify-center"
        :class="reader.viewMode === 'single' ? 'bg-neutral-700 text-white' : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'"
        title="Single page"
        @click="reader.setViewMode('single', true)"
      >▮</button>
      <button
        class="w-9 h-9 rounded-md flex items-center justify-center"
        :class="reader.viewMode === 'double' ? 'bg-neutral-700 text-white' : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'"
        title="Two-page spread"
        @click="reader.setViewMode('double', true)"
      >▮▮</button>
    </div>

    <div class="flex-1" />

    <div class="flex items-center gap-2 px-3 flex-none">
      <button
        class="flex items-center gap-2 h-[34px] px-3 rounded-md border border-neutral-600 text-white text-[11.5px] font-mono hover:bg-neutral-700"
        @click="emit('open-archive')"
      >📦 Archive</button>
    </div>
  </div>
</template>
