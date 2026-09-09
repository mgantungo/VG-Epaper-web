<script setup>
/**
 * Renders the current spread/single page and drives the 3D flip transition.
 * Ported from the mockup's vanilla-JS turn()/renderStatic() — the geometry
 * and timing are unchanged, just expressed as Vue-managed DOM refs instead of
 * innerHTML string-building.
 */
import { ref, nextTick } from 'vue';
import { useReaderStore } from '~/stores/reader';
import PageFace from './PageFace.vue';

const reader = useReaderStore();

const bookEl = ref(null);
const flipEl = ref(null);
const flipFace = ref(null); // { front, back } | null
const flipDirection = ref(null); // 'next' | 'prev' | null

const emit = defineEmits(['open-pullout']);

function pageLocked(page) {
  return reader.edition?.locked && page; // locked editions never carry imageUrl/stories from the API
}

async function animateTurn(direction) {
  if (reader.animating) return;
  const delta = direction === 'next' ? 1 : -1;
  const newIndex = reader.currentIndex + delta;
  if (newIndex < 0 || newIndex >= reader.activeViews.length) {
    bookEl.value?.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${direction === 'next' ? 4 : -4}px)` }, { transform: 'translateX(0)' }],
      { duration: 220 }
    );
    return;
  }

  reader.animating = true;
  playPageSound();

  const oldView = reader.currentView;
  const newView = reader.activeViews[newIndex];

  if (reader.viewMode === 'single') {
    flipFace.value = { front: oldView.right, back: newView.right };
  } else if (direction === 'next') {
    flipFace.value = { front: oldView.right, back: newView.left };
  } else {
    flipFace.value = { front: oldView.left, back: newView.right };
  }
  flipDirection.value = direction;

  await nextTick();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (flipEl.value) {
        flipEl.value.style.transform = direction === 'next' ? 'rotateY(-180deg)' : 'rotateY(180deg)';
      }
    });
  });

  setTimeout(() => {
    reader.currentIndex = newIndex;
    flipFace.value = null;
    flipDirection.value = null;
    reader.animating = false;
  }, 620);
}

defineExpose({ animateTurn });

// ---- page-turn sound (identical synth approach to the mockup) -----------
let audioCtx = null;
function playPageSound() {
  if (!reader.soundEnabled) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const dur = 0.5;
    const bufferSize = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.6);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const band = audioCtx.createBiquadFilter();
    band.type = 'bandpass'; band.Q.value = 0.8;
    band.frequency.setValueAtTime(1000, audioCtx.currentTime);
    band.frequency.linearRampToValueAtTime(3200, audioCtx.currentTime + dur * 0.35);
    band.frequency.linearRampToValueAtTime(700, audioCtx.currentTime + dur);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.55, audioCtx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    src.connect(band).connect(gain).connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + dur);
  } catch {
    // Web Audio unavailable/blocked — silently skip the sound rather than error the page turn.
  }
}
</script>

<template>
  <div class="book-wrap" :class="{ 'single-mode': reader.viewMode === 'single', 'paywall-preview-blur': reader.edition?.locked }" :style="{ transform: `scale(${reader.zoom})` }">
    <div ref="bookEl" class="book" tabindex="0" aria-label="Newspaper reader. Use left and right arrow keys to turn pages.">
      <div class="page-slot left" v-show="!!reader.currentView.left">
        <PageFace v-if="reader.currentView.left" :page="reader.currentView.left" :locked="pageLocked(reader.currentView.left)" @open-pullout="emit('open-pullout', $event)" />
      </div>
      <div class="page-slot right" v-show="!!reader.currentView.right">
        <PageFace v-if="reader.currentView.right" :page="reader.currentView.right" :locked="pageLocked(reader.currentView.right)" @open-pullout="emit('open-pullout', $event)" />
      </div>

      <div v-if="flipFace" ref="flipEl" class="flip-page" :style="{ left: reader.viewMode === 'single' ? '1%' : (flipDirection === 'next' ? 'calc(50% - 1px)' : '1%'), width: reader.viewMode === 'single' ? '98%' : undefined, transformOrigin: flipDirection === 'next' ? 'left center' : 'right center' }">
        <div class="face front">
          <PageFace v-if="flipFace.front" :page="flipFace.front" :locked="pageLocked(flipFace.front)" @open-pullout="emit('open-pullout', $event)" />
        </div>
        <div class="face back">
          <PageFace v-if="flipFace.back" :page="flipFace.back" :locked="pageLocked(flipFace.back)" @open-pullout="emit('open-pullout', $event)" />
        </div>
      </div>
    </div>
  </div>
</template>