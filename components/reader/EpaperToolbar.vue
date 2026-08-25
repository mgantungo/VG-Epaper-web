<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from '#imports';
import { NuxtLink } from '#components';
import { useReaderStore } from '~/stores/reader';
import { useAccountStore } from '~/stores/account';

const route = useRoute();
const reader = useReaderStore();
const account = useAccountStore();
const emit = defineEmits(['turn', 'first', 'last', 'open-archive', 'open-search', 'open-contents']);

const pageIndicator = computed(() => {
  const v = reader.currentView;
  const count = reader.edition?.pageCount ?? 0;
  if (reader.viewMode === 'single') return `${v.right?.pageNumber ?? '–'} / ${count}`;
  if (v.left && v.right) return `${v.left.pageNumber}\u2013${v.right.pageNumber} / ${count}`;
  return `${(v.left ?? v.right)?.pageNumber ?? '–'} / ${count}`;
});

// Info and the hamburger menu are small, self-contained popovers (no page
// image/pullout state involved), so they're handled entirely within this
// component — unlike Archive/Search/Contents, which need to affect state
// that lives up in pages/[...date].vue (jumping pages, opening a pullout),
// so those stay as emitted events the same way `open-archive` always was.
const infoOpen = ref(false);
const menuOpen = ref(false);
function closePopovers() { infoOpen.value = false; menuOpen.value = false; }
function toggleInfo() { const next = !infoOpen.value; closePopovers(); infoOpen.value = next; }
function toggleMenu() { const next = !menuOpen.value; closePopovers(); menuOpen.value = next; }

function onDocClick(e) {
  if (!e.target.closest?.('.tb-popover-wrap')) closePopovers();
}
onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <div class="fixed top-0 left-0 right-0 h-[52px] z-[200] bg-neutral-900 border-b border-black flex items-stretch shadow-lg overflow-x-auto">
    <div class="flex items-center gap-2 px-3 flex-none">
      <div class="w-[30px] h-[30px] rounded-md bg-gradient-to-br from-neutral-700 to-black text-neutral-100 flex items-center justify-center font-serif font-bold text-xs">NV</div>
      <div v-if="reader.edition" class="hidden sm:flex flex-col leading-tight pl-1">
        <span class="font-mono text-[11px] text-neutral-200 whitespace-nowrap">
          {{ new Date(reader.edition.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}
        </span>
        <span v-if="reader.edition.volume" class="font-mono text-[9px] text-neutral-500 whitespace-nowrap">Vol.{{ reader.edition.volume }} No.{{ reader.edition.issueNumber }}</span>
      </div>
    </div>
    <div class="w-px bg-neutral-700 my-2 mx-1" />

    <!-- fit-screen + zoom -->
    <div class="flex items-center gap-1 px-2 flex-none">
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700" title="Fit to screen" @click="reader.resetZoom()">⤢</button>
      <button class="w-8 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.zoom <= 0.7" title="Zoom out" @click="reader.setZoom(reader.zoom - 0.1)">−</button>
      <input
        type="range" min="0.7" max="1.5" step="0.05" :value="reader.zoom"
        class="w-16 accent-neutral-300" title="Zoom"
        @input="reader.setZoom(Number($event.target.value))"
      >
      <button class="w-8 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.zoom >= 1.5" title="Zoom in" @click="reader.setZoom(reader.zoom + 0.1)">+</button>
      <span class="font-mono text-[9.5px] text-neutral-500 w-8 text-center">{{ Math.round(reader.zoom * 100) }}%</span>
    </div>
    <div class="w-px bg-neutral-700 my-2 mx-1" />

    <!-- single/double page mode -->
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

    <!-- navigation -->
    <div class="flex items-center gap-1 px-2 flex-none">
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atStart || reader.animating" @click="emit('first')">⏮</button>
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atStart || reader.animating" @click="emit('turn', 'prev')">‹</button>
      <span class="font-mono text-[13px] text-neutral-200 px-2 min-w-[70px] text-center">{{ pageIndicator }}</span>
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atEnd || reader.animating" @click="emit('turn', 'next')">›</button>
      <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30" :disabled="reader.atEnd || reader.animating" @click="emit('last')">⏭</button>
    </div>

    <div class="flex-1" />

    <div class="flex items-center gap-2 px-3 flex-none">
      <!-- info -->
      <div class="relative tb-popover-wrap">
        <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700" title="Edition info" @click.stop="toggleInfo">ⓘ</button>
        <div v-if="infoOpen" class="absolute right-0 top-[44px] w-64 bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl p-4 font-mono text-[11px] text-neutral-200 z-10">
          <div class="font-serif font-bold text-sm text-white mb-2">Edition details</div>
          <div class="flex justify-between py-1 border-b border-neutral-700"><span>Date</span><span>{{ reader.edition?.date || '—' }}</span></div>
          <div class="flex justify-between py-1 border-b border-neutral-700"><span>Vol. / No.</span><span>{{ reader.edition?.volume || '—' }} / {{ reader.edition?.issueNumber || '—' }}</span></div>
          <div class="flex justify-between py-1 border-b border-neutral-700"><span>Pages</span><span>{{ reader.edition?.pageCount || '—' }}</span></div>
          <div class="flex justify-between py-1"><span>Cover price</span><span>{{ reader.edition?.coverPrice ? `${reader.edition.coverPrice} ${reader.edition.currency}` : '—' }}</span></div>
        </div>
      </div>

      <button class="flex items-center gap-2 h-[34px] px-3 rounded-md border border-neutral-600 text-white text-[11.5px] font-mono hover:bg-neutral-700" @click="emit('open-search')">🔍</button>
      <button class="flex items-center gap-2 h-[34px] px-3 rounded-md border border-neutral-600 text-white text-[11.5px] font-mono hover:bg-neutral-700" title="Contents" @click="emit('open-contents')">☰</button>

      <button
        class="flex items-center gap-2 h-[34px] px-3 rounded-md border border-neutral-600 text-white text-[11.5px] font-mono hover:bg-neutral-700"
        @click="emit('open-archive')"
      >📦 Archive</button>

      <!-- hamburger menu -->
      <div class="relative tb-popover-wrap">
        <button class="w-9 h-9 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-700" title="Menu" @click.stop="toggleMenu">≡</button>
        <div v-if="menuOpen" class="absolute right-0 top-[44px] w-56 bg-neutral-800 border border-neutral-600 rounded-lg shadow-2xl p-2 font-mono text-[11.5px] text-neutral-200 z-10">
          <button class="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-neutral-700 text-left" @click="reader.toggleSound()">
            <span>Page-turn sound</span>
            <span class="w-7 h-4 rounded-full relative" :class="reader.soundEnabled ? 'bg-white/80' : 'bg-neutral-600'">
              <span class="absolute top-0.5 w-3 h-3 rounded-full bg-neutral-900 transition-all" :class="reader.soundEnabled ? 'left-3.5' : 'left-0.5'" />
            </span>
          </button>
          <div class="border-t border-neutral-700 my-1" />
          <div class="px-3 py-2 text-[9.5px] text-neutral-500 leading-relaxed">
            ← → to turn pages · Esc to close panels. Copying, selecting and printing are disabled in this edition.
          </div>
        </div>
      </div>

      <NuxtLink
        v-if="!account.loggedIn"
        :to="{ path: '/login', query: { redirect: route.fullPath } }"
        class="flex items-center h-[34px] px-3 rounded-md border border-neutral-600 text-white text-[11.5px] font-mono hover:bg-neutral-700"
      >Sign in</NuxtLink>
      <div v-else class="flex items-center gap-2 h-[34px] px-3 rounded-md border border-neutral-600 text-[11.5px] font-mono">
        <span class="text-neutral-300 truncate max-w-[120px]">{{ account.user?.email || 'Account' }}</span>
        <button class="text-neutral-500 hover:text-white" @click="account.logout()">Sign out</button>
      </div>
    </div>
  </div>
</template>