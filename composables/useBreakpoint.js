import { useMediaQuery } from '@vueuse/core';
import { onMounted, watch } from 'vue';
import { useReaderStore } from '~/stores/reader';

/**
 * Defaults the reader to single-page mode on phones and tablets, and to a
 * two-page spread on desktop — matching the mockup's request directly.
 *
 * "Tablet" here means anything up to 1024px (covers iPad portrait *and*
 * landscape at 1024px, plus all phones). Desktop = wider than that. Reader
 * decisions are made by measured viewport width, not user-agent sniffing,
 * since UA strings are unreliable and viewport width is what actually
 * determines whether a two-page spread is readable.
 *
 * The user can still manually switch modes via the toolbar at any size — this
 * only controls the *default* and re-applies it on breakpoint *crossings*,
 * not on every resize, so we don't fight a desktop user who intentionally
 * picked single-page mode while resizing their browser window slightly.
 */
export function useResponsiveReaderMode() {
  const isMobileOrTablet = useMediaQuery('(max-width: 1024px)');
  const readerStore = useReaderStore();

  // Apply once on mount, using whatever the viewport is right now.
  onMounted(() => {
    readerStore.setViewMode(isMobileOrTablet.value ? 'single' : 'double');
  });

  // Re-apply only when the breakpoint is actually crossed (not on every
  // pixel of resize), and only if the user hasn't manually overridden it
  // since the last crossing.
  watch(isMobileOrTablet, (nowMobile) => {
    if (readerStore.viewModeManuallySet) return;
    readerStore.setViewMode(nowMobile ? 'single' : 'double');
  });

  return { isMobileOrTablet };
}
