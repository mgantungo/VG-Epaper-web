<script setup lang="ts">
const props = defineProps<{ story: any | null }>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <div
    class="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm transition-opacity"
    :class="story ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    @click.self="emit('close')"
  >
    <div v-if="story" class="w-full max-w-lg max-h-[86vh] overflow-y-auto bg-white text-neutral-900 rounded-sm p-8 relative shadow-2xl select-text">
      <button class="absolute top-3 right-4 w-8 h-8 rounded-full text-neutral-500 hover:bg-black/5 hover:text-neutral-900" @click="emit('close')">✕</button>
      <div class="font-mono text-[10px] tracking-widest uppercase text-neutral-500 mb-1">{{ story.kicker }}</div>
      <h2 class="font-serif font-extrabold text-2xl leading-tight mb-1">{{ story.headline }}</h2>
      <div class="font-mono text-[10px] text-neutral-500 mb-4">{{ story.byline }}</div>
      <div class="h-px bg-neutral-300 mb-4" />
      <!-- Strapi's richtext field returns HTML/markdown depending on your editor config —
           render via a sanitized markdown/HTML component in production rather than v-html
           on unsanitized input. -->
      <div class="prose prose-neutral text-[14.5px] leading-relaxed" v-html="story.body || story.teaser" />
    </div>
  </div>
</template>
