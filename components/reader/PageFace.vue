<script setup>
import { computed } from 'vue';
import { useRuntimeConfig } from '#imports';

const props = defineProps({
  page: { type: Object, required: true },
  locked: { type: Boolean, default: false }
});
const emit = defineEmits(['open-pullout']);

const config = useRuntimeConfig();
const fullImageUrl = computed(() =>
  props.page.imageUrl ? `${config.public.middlewareUrl}${props.page.imageUrl}` : null
);
</script>

<template>
  <div class="relative w-full h-full">
    <div v-if="locked || !fullImageUrl" class="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500">
      <div class="text-center px-6">
        <div class="font-mono text-xs tracking-widest uppercase mb-2">Page {{ page.pageNumber }}</div>
        <div class="font-mono text-[10px] text-neutral-400">Subscribe or unlock this edition to view this page</div>
      </div>
    </div>
    <template v-else>
      <img :src="fullImageUrl" :alt="`Page ${page.pageNumber}`" class="block w-full h-full object-cover" draggable="false" />
      <div
        v-for="story in page.stories || []"
        :key="story.id"
        class="hotspot"
        :style="{ top: story.top + '%', left: story.left + '%', width: story.width + '%', height: story.height + '%' }"
        @click="emit('open-pullout', story)"
      />
    </template>
  </div>
</template>
