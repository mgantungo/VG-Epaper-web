<script setup>
/**
 * Route: /                                            NEW FILE (Phase 0)
 *
 * The landing page: readers choose what to read. Every paper is sold on its
 * own (agreed 23 Oct 2026), so each title (New Vision, Bukedde, …) gets a
 * card with a row per publication (daily, weekend, …): its latest edition,
 * the reader's access to it, and a way in. Below: the plans for that title,
 * bundles across titles, and other publications (monthly, yearly, …).
 *
 * Everything comes from GET /api/catalogue — publications, prices and
 * plans are managed in handle, never hard-coded here.
 * Loaded in the browser only (the access-token cookie is client-side).
 */
import { ref, computed, onMounted } from 'vue';
import { NuxtLink } from '#components';
import { useEpaperApi } from '~/composables/useEpaperApi';
import { useAccountStore } from '~/stores/account';

useHead({ title: 'Vision Group e-papers' });

const api = useEpaperApi();
const account = useAccountStore();

const catalogue = ref(null);
const loading = ref(true);
const loadError = ref(null);

const MAIN_FREQUENCIES = ['daily', 'weekend'];

onMounted(async () => {
  try {
    catalogue.value = await api.getCatalogue();
  } catch {
    loadError.value = 'Publications could not be loaded. Please try again.';
  } finally {
    loading.value = false;
  }
  account.refresh();
});

const titles = computed(() => catalogue.value?.titles || []);
const mainTitles = computed(() => titles.value.filter(t => t.publications.some(p => MAIN_FREQUENCIES.includes(p.frequency))));
const otherTitles = computed(() => titles.value.filter(t => !mainTitles.value.includes(t)));
const plans = computed(() => catalogue.value?.plans || []);

function titleCodes(t) {
  return t.publications.map(p => p.code);
}
function plansFor(t) {
  const codes = titleCodes(t);
  return plans.value.filter(p => p.publications.every(c => codes.includes(c)));
}
const bundles = computed(() => plans.value.filter(p => !titles.value.some(t => p.publications.every(c => titleCodes(t).includes(c)))));

const pubByCode = computed(() => {
  const m = {};
  for (const t of titles.value) for (const p of t.publications) m[p.code] = p;
  return m;
});

function fmtDay(iso, withWeekday = true) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    ...(withWeekday ? { weekday: 'short' } : {}), day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
}
function editionText(p) {
  const e = p.latestEdition;
  if (!e) return 'No edition yet';
  const when = e.coversTo && e.coversTo !== e.coversFrom ? `${fmtDay(e.coversFrom, true)} – ${fmtDay(e.coversTo, true)}` : fmtDay(e.date);
  const isCurrent = e.coversTo >= (catalogue.value?.today || '');
  return `${isCurrent ? '' : 'Latest: '}${when}${e.pageCount ? ` · ${e.pageCount} pages` : ''}`;
}
function readPath(p) {
  return `/${p.code.toLowerCase()}`;
}
function accessText(p) {
  if (!p.access) return null;
  if (p.access.today) {
    const until = p.access.until && p.access.until < '9999' ? ` until ${fmtDay(p.access.until, false)}` : '';
    return p.access.via === 'organisation' ? `Through your organisation${until}` : `Subscribed${until}`;
  }
  return null;
}
function termText(plan) {
  if (plan.kind === 'single_issue') return 'one edition';
  const n = plan.durationCount || 1;
  return `${n} ${plan.durationUnit}${n === 1 ? '' : 's'}`;
}
const money = (plan) => `${plan.currency || 'UGX'} ${Number(plan.price).toLocaleString()}`;
function planPath(plan) {
  return { path: `/${plan.publications[0].toLowerCase()}`, query: { plan: plan.key } };
}
function chipStyle(code) {
  const c = pubByCode.value[code]?.colour || '#525252';
  return { background: `${c}33`, color: '#f5f5f5', boxShadow: `inset 0 0 0 1px ${c}` };
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-100">
    <header class="h-[60px] bg-neutral-900 border-b border-black flex items-center gap-4 px-4 sm:px-5">
      <img src="/logo.png" alt="" class="w-10 h-10 rounded-md object-contain flex-none" />
      <span class="font-mono text-sm text-neutral-300">Vision Group e-papers</span>
      <span class="flex-1" />
      <span class="hidden sm:inline font-mono text-xs text-neutral-400">{{ catalogue ? fmtDay(catalogue.today) : '' }}</span>
      <NuxtLink v-if="!account.loggedIn" to="/login" class="h-10 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm flex items-center">Sign in</NuxtLink>
      <span v-else class="h-10 px-3 rounded-lg bg-neutral-800 text-sm flex items-center truncate max-w-[220px]">{{ account.user?.displayName || account.user?.email || 'My account' }}</span>
    </header>

    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 class="font-serif font-extrabold text-3xl sm:text-4xl tracking-tight">What would you like to read?</h1>
      <p class="text-neutral-400 mt-2 mb-8 max-w-2xl">Each publication has its own subscription at a standard price, or take a bundle. A weekend edition covers Saturday and Sunday.</p>

      <p v-if="loading" class="font-mono text-sm text-neutral-500">Loading publications…</p>
      <p v-else-if="loadError" class="text-sm text-red-400">{{ loadError }}</p>

      <template v-else>
        <div class="flex flex-wrap gap-6">
          <section
            v-for="t in mainTitles" :key="t.title"
            class="flex-[1_1_480px] min-w-0 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden"
            :aria-labelledby="`t-${t.title}`"
          >
            <div class="px-5 py-4 flex items-center gap-3" :style="{ background: `linear-gradient(90deg, ${t.colour || '#262626'}40, transparent)` }">
              <span class="w-3 h-3 rounded-sm" :style="{ background: t.colour || '#737373' }" />
              <h2 :id="`t-${t.title}`" class="font-serif font-bold text-2xl">{{ t.title }}</h2>
              <span class="font-mono text-xs text-neutral-400">{{ t.language }}</span>
            </div>

            <div v-for="p in t.publications" :key="p.code" class="flex flex-wrap items-center gap-4 px-5 py-4 border-t border-neutral-800">
              <img v-if="p.latestEdition?.coverUrl" :src="api.mediaUrl(p.latestEdition.coverUrl)" :alt="`Front page, ${p.name}`" loading="lazy" class="w-[72px] aspect-[900/1056] object-cover rounded shadow-lg bg-neutral-200 flex-none">
              <div v-else class="w-[72px] aspect-[900/1056] rounded bg-neutral-800 flex-none" aria-hidden="true" />
              <div class="flex-[1_1_200px] min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold">{{ p.editionLabel || p.name }}</span>
                  <span class="font-mono text-[11px] px-2 py-0.5 rounded-md" :style="chipStyle(p.code)">{{ p.code }}<template v-if="p.scheduleNote"> · {{ p.scheduleNote }}</template></span>
                </div>
                <p class="font-mono text-xs text-neutral-400 mt-1">{{ editionText(p) }}</p>
                <p v-if="accessText(p)" class="text-[13px] text-emerald-300 mt-1">✓ {{ accessText(p) }}</p>
                <p v-else-if="p.latestEdition" class="text-[13px] text-neutral-400 mt-1">Front page free to preview</p>
              </div>
              <NuxtLink
                v-if="p.latestEdition"
                :to="readPath(p)"
                class="h-11 px-4 rounded-lg text-sm font-semibold flex items-center"
                :class="accessText(p) ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-neutral-100 hover:bg-white text-neutral-900'"
              >{{ accessText(p) ? 'Read' : 'Preview & subscribe' }}</NuxtLink>
            </div>

            <div v-if="plansFor(t).length" class="px-5 pt-3 pb-4 border-t border-neutral-800">
              <p class="font-mono text-[11px] uppercase tracking-wider text-neutral-500">{{ t.title }} plans</p>
              <NuxtLink v-for="plan in plansFor(t)" :key="plan.key" :to="planPath(plan)" class="flex justify-between gap-3 py-2 border-t border-neutral-800/70 first-of-type:border-t-0 text-sm hover:text-white text-neutral-300">
                <span>{{ plan.label }} <span class="text-neutral-500">· {{ termText(plan) }}</span></span>
                <span class="font-mono">{{ money(plan) }}</span>
              </NuxtLink>
            </div>
          </section>
        </div>

        <template v-if="bundles.length">
          <h2 class="font-bold text-xl mt-10">Bundles</h2>
          <p class="text-neutral-400 text-sm mb-3">More than one paper in one subscription.</p>
          <div class="flex flex-wrap gap-4">
            <NuxtLink v-for="b in bundles" :key="b.key" :to="planPath(b)" class="flex-[1_1_280px] min-w-0 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-xl p-5 flex flex-col gap-2">
              <span class="flex flex-wrap gap-1.5">
                <span v-for="c in b.publications" :key="c" class="font-mono text-[11px] px-2 py-0.5 rounded-md" :style="chipStyle(c)">{{ c }}</span>
              </span>
              <span class="font-semibold">{{ b.label }}</span>
              <span class="text-[13px] text-neutral-400">{{ b.description || b.publications.map(c => pubByCode[c]?.name || c).join(' + ') }} · {{ termText(b) }}</span>
              <span class="font-mono mt-auto">{{ money(b) }}</span>
            </NuxtLink>
          </div>
        </template>

        <template v-if="otherTitles.length">
          <h2 class="font-bold text-xl mt-10 mb-3">More publications</h2>
          <div class="flex flex-wrap gap-4">
            <NuxtLink v-for="p in otherTitles.flatMap(t => t.publications)" :key="p.code" :to="readPath(p)" class="flex-[1_1_280px] min-w-0 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-xl p-4 flex items-center gap-4">
              <img v-if="p.latestEdition?.coverUrl" :src="api.mediaUrl(p.latestEdition.coverUrl)" alt="" loading="lazy" class="w-14 aspect-[900/1056] object-cover rounded bg-neutral-200 flex-none">
              <span class="min-w-0">
                <span class="block font-semibold">{{ p.name }}</span>
                <span class="block font-mono text-xs text-neutral-400">{{ p.latestEdition ? `Latest issue · out ${fmtDay(p.latestEdition.date, false)}` : 'No issue yet' }}</span>
                <span v-if="accessText(p)" class="block text-[12px] text-emerald-300">✓ {{ accessText(p) }}</span>
              </span>
            </NuxtLink>
          </div>
        </template>

        <p class="text-[13px] text-neutral-500 mt-10 max-w-3xl">
          Reading through your organisation? The publications your organisation pays for open automatically.
          Your administrator sees the days you signed in and the publications you opened — not what you read.
        </p>
      </template>
    </main>
  </div>
</template>
