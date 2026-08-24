import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useEpaperApi } from '~/composables/useEpaperApi';

type PageData = {
  pageNumber: number;
  section?: string;
  imageUrl?: string;
  stories?: Array<{
    id: number; top: number; left: number; width: number; height: number;
    kicker?: string; headline: string; byline?: string; teaser?: string; body?: string;
  }>;
};

type EditionResponse = {
  date: string;
  locked: boolean;
  pageCount: number;
  volume?: string;
  issueNumber?: string;
  coverPrice?: number;
  currency?: string;
  price?: { amount: number; currency: string; kind: 'subscription' | 'archive_purchase' };
  pages: PageData[];
};

export const useReaderStore = defineStore('reader', () => {
  const currentDate = ref(todayIso());
  const edition = ref<EditionResponse | null>(null);
  const viewMode = ref<'single' | 'double'>('double');
  const viewModeManuallySet = ref(false); // stops useResponsiveReaderMode fighting a manual toolbar choice
  const currentIndex = ref(0);
  const animating = ref(false);
  const loading = ref(false);

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  // ---- spread geometry, same rule as the mockup: page 1 alone on the right,
  // the last page alone on the left, everything between as two-up spreads.
  const doubleViews = computed(() => {
    const pages = edition.value?.pages || [];
    if (!pages.length) return [];
    const views: Array<{ left: PageData | null; right: PageData | null }> = [];
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
    (edition.value?.pages || []).map(p => ({ left: null as PageData | null, right: p }))
  );
  const activeViews = computed(() => (viewMode.value === 'double' ? doubleViews.value : singleViews.value));
  const currentView = computed(() => activeViews.value[currentIndex.value] || { left: null, right: null });

  const atStart = computed(() => currentIndex.value === 0);
  const atEnd = computed(() => currentIndex.value === Math.max(activeViews.value.length - 1, 0));

  async function loadEdition(dateIso: string) {
    loading.value = true;
    currentDate.value = dateIso;
    currentIndex.value = 0;
    try {
      const api = useEpaperApi();
      edition.value = await api.getEdition(dateIso) as EditionResponse;
    } finally {
      loading.value = false;
    }
  }

  function setViewMode(mode: 'single' | 'double', manual = false) {
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

  function currentPrimaryPageNumber(): number | null {
    const v = currentView.value;
    if (viewMode.value === 'single') return v.right?.pageNumber ?? null;
    return v.right?.pageNumber ?? v.left?.pageNumber ?? null;
  }
  function indexForPageNumber(mode: 'single' | 'double', num: number): number {
    const views = mode === 'double' ? doubleViews.value : singleViews.value;
    return views.findIndex(v => v.left?.pageNumber === num || v.right?.pageNumber === num);
  }

  function turn(direction: 'next' | 'prev') {
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

  function jumpTo(pageNumber: number) {
    if (animating.value) return;
    const idx = indexForPageNumber(viewMode.value, pageNumber);
    if (idx >= 0) currentIndex.value = idx;
  }

  return {
    currentDate, edition, viewMode, viewModeManuallySet, currentIndex, animating, loading,
    doubleViews, singleViews, activeViews, currentView, atStart, atEnd,
    loadEdition, setViewMode, turn, jumpTo, todayIso
  };
});
