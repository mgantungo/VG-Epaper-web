<script setup>
/**
 * Route: /[...date] — /, /2026/08/22, etc.
 * No date in the URL -> defaults to today, same rule as the middleware's
 * `GET /api/editions/today` endpoint (this page just calls that with an
 * explicit ISO date so links/bookmarks are stable, rather than baking
 * "today" into the URL itself).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from '#imports';
import { useReaderStore } from '~/stores/reader';
import { useAccountStore } from '~/stores/account';
import { useResponsiveReaderMode } from '~/composables/useBreakpoint';
import EpaperToolbar from '~/components/reader/EpaperToolbar.vue';
import BookReader from '~/components/reader/BookReader.vue';
import SideNavPrev from '~/components/reader/SideNavPrev.vue';
import SideNavNext from '~/components/reader/SideNavNext.vue';
import PulloutPanel from '~/components/reader/PulloutPanel.vue';
import ArchiveModal from '~/components/reader/ArchiveModal.vue';
import PaywallModal from '~/components/reader/PaywallModal.vue';

const route = useRoute();
const router = useRouter();
const reader = useReaderStore();
const account = useAccountStore();

const bookReaderRef = ref(null);
const openStory = ref(null);
const archiveOpen = ref(false);
const paywallOpen = ref(false);

const dateIso = computed(() => {
  const parts = route.params.date || [];
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${y}-${m}-${d}`;
  }
  return reader.todayIso();
});

// Responsive default: single-page on mobile/tablet, spread on desktop.
useResponsiveReaderMode();

async function openDate(iso) {
  const [y, m, d] = iso.split('-');
  await router.push(`/${y}/${m}/${d}`);
}

// Account/entitlement state depends entirely on browser-only mechanisms —
// the access-token cookie and Strapi's httpOnly refresh cookie — neither of
// which a plain server-side fetch() automatically carries the way a real
// browser request does. Running this during SSR meant every initial page
// load silently 401'd server-side with no cookie attached at all, which is
// what was actually behind the repeated "Sign in required" errors — not
// anything wrong with the refresh logic itself. So: no `immediate: true`
// here (that would still fire during SSR); the first load happens in
// onMounted below instead, which never runs on the server, only once
// hydrated in the real browser. Subsequent client-side route changes (e.g.
// picking an archive date) still go through this watcher normally.
watch(dateIso, load);

async function load() {
  await account.refresh();
  await reader.loadEdition(dateIso.value);
  archiveOpen.value = false;
  paywallOpen.value = Boolean(reader.edition?.locked);
}

function handleTurn(direction) {
  bookReaderRef.value?.animateTurn(direction);
}
function handleFirst() {
  if (reader.edition?.pages?.[0]) reader.jumpTo(reader.edition.pages[0].pageNumber);
}
function handleLast() {
  const pages = reader.edition?.pages || [];
  if (pages.length) reader.jumpTo(pages[pages.length - 1].pageNumber);
}
function handleSelectArchiveDate(iso) {
  openDate(iso);
}

function closePaywall() {
  paywallOpen.value = false;
}

function onKeydown(e) {
  if (openStory.value) { if (e.key === 'Escape') openStory.value = null; return; }
  if (paywallOpen.value) { if (e.key === 'Escape') closePaywall(); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); handleTurn('next'); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); handleTurn('prev'); }
  else if (e.key === 'Escape') { archiveOpen.value = false; }
}
onMounted(() => {
  load();
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="min-h-screen flex flex-col items-center">
    <EpaperToolbar
      @turn="handleTurn"
      @first="handleFirst"
      @last="handleLast"
      @open-archive="archiveOpen = true"
    />

    <div class="pt-[52px] w-full flex-1 flex flex-col items-center justify-center px-3 md:px-6 py-6">
      <div v-if="reader.loading" class="text-neutral-400 font-mono text-sm">Loading edition…</div>
      <div v-else-if="reader.loadError" class="text-neutral-400 font-mono text-sm text-center px-6">
        <template v-if="reader.loadError === 'not_found'">No edition has been published for {{ dateIso }} yet.</template>
        <template v-else>Something went wrong loading this edition. Please try again.</template>
      </div>
      <div v-else class="flex items-center justify-center gap-2 md:gap-5 w-full">
        <SideNavPrev @turn="handleTurn" />
        <BookReader ref="bookReaderRef" @open-pullout="openStory = $event" />
        <SideNavNext @turn="handleTurn" />
      </div>
      <p class="font-mono text-[10px] text-neutral-500 mt-4 text-center px-4">
        Click a highlighted story to pull it out · use the side arrows, toolbar, or ← → keys to turn pages
      </p>
    </div>

    <PulloutPanel :story="openStory" @close="openStory = null" />
    <ArchiveModal :open="archiveOpen" @close="archiveOpen = false" @select-date="handleSelectArchiveDate" />
    <PaywallModal
      :open="paywallOpen"
      :date-iso="dateIso"
      :price="reader.edition?.price"
      @close="closePaywall"
    />
  </div>
</template>