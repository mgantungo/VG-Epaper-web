<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { useEpaperApi } from '~/composables/useEpaperApi';

const props = defineProps({
  page: { type: Object, required: true },
  locked: { type: Boolean, default: false }
});
const emit = defineEmits(['open-pullout']);

const api = useEpaperApi();
const objectUrl = ref(null);
const imgFailed = ref(false);

function releaseObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value); // otherwise every page turn leaks the previous page's image out of memory
    objectUrl.value = null;
  }
}

async function loadImage() {
  releaseObjectUrl();
  imgFailed.value = false;
  if (props.locked || !props.page.imageUrl) return;
  try {
    const blob = await api.fetchImageBlob(props.page.imageUrl);
    objectUrl.value = URL.createObjectURL(blob);
  } catch {
    imgFailed.value = true;
  }
}

// Re-fetch whenever this component gets handed a different page (BookReader
// reuses the same PageFace instance across turns rather than recreating it,
// so onMounted alone would only ever load the very first page shown).
watch(() => [props.page?.pageNumber, props.locked], loadImage, { immediate: true });
onUnmounted(releaseObjectUrl);
</script>

<template>
  <div class="relative w-full h-full">
    <div v-if="locked || (!objectUrl && !imgFailed)" class="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500">
      <div class="text-center px-6">
        <div class="font-mono text-xs tracking-widest uppercase mb-2">Page {{ page.pageNumber }}</div>
        <div class="font-mono text-[10px] text-neutral-400">
          {{ locked ? "Subscribe or unlock this edition to view this page" : "Loading…" }}
        </div>
      </div>
    </div>
    <div v-else-if="imgFailed" class="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-400">
      <div class="font-mono text-[10px]">Couldn't load page {{ page.pageNumber }}</div>
    </div>
    <template v-else>
      <img :src="objectUrl" :alt="`Page ${page.pageNumber}`" class="block w-full h-full object-cover" draggable="false" />
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