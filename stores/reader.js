import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useEpaperApi } from '~/composables/useEpaperApi';

/**
 * Shape of one page as returned by GET /api/editions/:date, for reference
 * (not enforced — this is a plain-JS project now):
 *   { pageNumber, section?, imageUrl?, stories?: [{ id, top, left, width,
 *     height, kicker?, headline, byline?, teaser?, body? }] }
 *
 * Shape of the edition response itself:
 *   { date, locked, pageCount, volume?, issueNumber?, coverPrice?, currency?,
 *     price?: { amount, currency, kind: 'subscription' | 'archive_purchase' },
 *     pages: [...] }
 */

export const useReaderStore = defineStore('reader', () => {
  // Captured once, synchronously, at store creation — which always happens
  // inside a component's valid setup context (the first `useReaderStore()`
  // call, e.g. in pages/[...date].vue). Re-calling useEpaperApi() (and the
  // useRuntimeConfig()/useCookie() it wraps) *inside* an async action after
  // that action has been invoked post-await is what triggers Nuxt's
  // NUXT_E1001 "composable called outside context" warning — capturing it
  // once here and reusing it below avoids that entirely.
  const api = useEpaperApi();

  const currentDate = ref(todayIso());
  const edition = ref(null);
  const viewMode = ref('double'); // 'single' | 'double'
  const viewModeManuallySet = ref(false); // stops useResponsiveReaderMode fighting a manual toolbar choice
  const currentIndex = ref(0);
  const animating = ref(false);
  const loading = ref(true); // starts true: the initial load now only ever happens client-side (see pages/[...date].vue), so the server-rendered page shows "Loading edition…" instead of a blank book shell until that first client fetch completes
  const loadError = ref(null); // null | 'not_found' | 'error' — see loadEdition()
  const zoom = ref(1);
  const soundEnabled = ref(true);

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  // ---- spread geometry, same rule as the mockup: page 1 alone on the right,
  // the last page alone on the left, everything between as two-up spreads.
  const doubleViews = computed(() => {
    const pages = edition.value?.pages || [];
    if (!pages.length) return [];
    const views = [];
    views.push({ left: null, right: pages[0] });
    let i = 1;
    while (i < pages.length - 1) {
      views.push({ left: pages[i], right: pages[i + 1] });
      i += 2;
    }
    views.push({ left: pages[pages.length - 1], right: null });
    return views;
  });
  const singleViews = computed(() =>
    (edition.value?.pages || []).map(p => ({ left: null, right: p }))
  );
  const activeViews = computed(() => (viewMode.value === 'double' ? doubleViews.value : singleViews.value));
  const currentView = computed(() => activeViews.value[currentIndex.value] || { left: null, right: null });

  const atStart = computed(() => currentIndex.value === 0);
  const atEnd = computed(() => currentIndex.value === Math.max(activeViews.value.length - 1, 0));

  async function loadEdition(dateIso) {
    loading.value = true;
    loadError.value = null;
    currentDate.value = dateIso;
    currentIndex.value = 0;
    try {
      edition.value = await api.getEdition(dateIso);
    } catch (err) {
      // Critical: clear out whatever the PREVIOUS date's edition was. This
      // is the actual fix for "the archive shows the same copy for every
      // date" — that was never a caching bug, it was this catch block
      // simply not existing, so a failed fetch (e.g. 404, nothing
      // published for that date) left the last successful edition sitting
      // in state indefinitely while the UI kept rendering it.
      edition.value = null;
      const status = err?.response?.status ?? err?.statusCode ?? err?.status;
      loadError.value = status === 404 ? 'not_found' : 'error';
    } finally {
      loading.value = false;
    }
  }

  function setViewMode(mode, manual = false) {
    if (manual) viewModeManuallySet.value = true;
    if (mode === viewMode.value) return;
    // Preserve roughly where the reader was when switching spread <-> single.
    const primaryPageNum = currentPrimaryPageNumber();
    viewMode.value = mode;
    if (primaryPageNum != null) {
      const idx = indexForPageNumber(mode, primaryPageNum);
      if (idx >= 0) currentIndex.value = idx;
    }
  }

  function currentPrimaryPageNumber() {
    const v = currentView.value;
    if (viewMode.value === 'single') return v.right?.pageNumber ?? null;
    return v.right?.pageNumber ?? v.left?.pageNumber ?? null;
  }
  function indexForPageNumber(mode, num) {
    const views = mode === 'double' ? doubleViews.value : singleViews.value;
    return views.findIndex(v => v.left?.pageNumber === num || v.right?.pageNumber === num);
  }

  function turn(direction) {
    if (animating.value) return;
    const delta = direction === 'next' ? 1 : -1;
    const newIndex = currentIndex.value + delta;
    if (newIndex < 0 || newIndex >= activeViews.value.length) return; // component decides how to show the "can't go further" bounce
    animating.value = true;
    // The actual 3D flip transition is driven in BookReader.vue (it needs
    // direct DOM/transform access); this store just owns the index and the
    // animating flag so the toolbar/side-nav buttons can disable correctly
    // while a flip is in progress.
    setTimeout(() => {
      currentIndex.value = newIndex;
      animating.value = false;
    }, 620); // keep in sync with BookReader.vue's transition duration
  }

  function jumpTo(pageNumber) {
    if (animating.value) return;
    const idx = indexForPageNumber(viewMode.value, pageNumber);
    if (idx >= 0) currentIndex.value = idx;
  }

  function setZoom(z) {
    zoom.value = Math.max(0.7, Math.min(1.5, z));
  }
  function resetZoom() {
    zoom.value = 1;
  }
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value;
  }

  return {
    currentDate, edition, viewMode, viewModeManuallySet, currentIndex, animating, loading, loadError,
    zoom, soundEnabled,
    doubleViews, singleViews, activeViews, currentView, atStart, atEnd,
    loadEdition, setViewMode, turn, jumpTo, todayIso, setZoom, resetZoom, toggleSound
  };
});