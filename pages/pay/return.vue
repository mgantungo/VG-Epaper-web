<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from '#imports';
import { NuxtLink } from '#components';
import { useEpaperApi } from '~/composables/useEpaperApi';
import { useAccountStore } from '~/stores/account';

const route = useRoute();
const router = useRouter();
const api = useEpaperApi();
const account = useAccountStore();

const receiptToken = route.query.receiptToken;
const dateIso = route.query.date;

// 'waiting' | 'success' | 'failed' | 'timeout' | 'error'
const status = ref('waiting');
const failureReason = ref(null);
let pollTimer = null;

function editionPath() {
  if (!dateIso) return '/';
  const [y, m, d] = dateIso.split('-');
  return `/${y}/${m}/${d}`;
}

async function poll(startedAt) {
  if (!receiptToken) {
    status.value = 'error';
    return;
  }
  // Real PIN-prompt payments can genuinely take a while — this window is
  // deliberately longer than the old "assume yes" placeholder ever needed,
  // since that granted access instantly and never had anything to wait on.
  const maxWaitMs = 90 * 1000;
  if (Date.now() - startedAt > maxWaitMs) {
    status.value = 'timeout';
    return;
  }

  try {
    const result = await api.getPaymentStatus(receiptToken);

    if (result.frontend_status === 'success') {
      status.value = 'success';
      await account.refresh(); // pick up the entitlement that just got granted
      setTimeout(() => router.push(editionPath()), 1200);
      return;
    }
    if (result.frontend_status === 'failed') {
      status.value = 'failed';
      failureReason.value = result.failure_reason;
      return;
    }
    if (result.frontend_status === 'timeout') {
      status.value = 'timeout';
      return;
    }
    // still pending/processing — customer hasn't approved (or declined) the
    // prompt yet, keep waiting
    pollTimer = setTimeout(() => poll(startedAt), 2500);
  } catch {
    status.value = 'error';
  }
}

onMounted(() => poll(Date.now()));
onUnmounted(() => { if (pollTimer) clearTimeout(pollTimer); });
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-6">
    <div class="w-full max-w-sm bg-white text-neutral-900 rounded-xl p-8 shadow-2xl text-center">
      <template v-if="status === 'waiting'">
        <div class="text-4xl mb-3 animate-pulse">📱</div>
        <h1 class="font-serif font-extrabold text-xl mb-1">Check your phone</h1>
        <p class="text-sm text-neutral-500">Approve the payment prompt with your PIN to unlock this edition.</p>
      </template>

      <template v-else-if="status === 'success'">
        <div class="text-4xl mb-3">✅</div>
        <h1 class="font-serif font-extrabold text-xl mb-1">Payment confirmed</h1>
        <p class="text-sm text-neutral-500">Taking you to your edition…</p>
      </template>

      <template v-else-if="status === 'failed'">
        <div class="text-4xl mb-3">✕</div>
        <h1 class="font-serif font-extrabold text-xl mb-1">Payment didn't go through</h1>
        <p class="text-sm text-neutral-500 mb-4">{{ failureReason || 'Please try again.' }}</p>
        <NuxtLink :to="editionPath()" class="text-sm underline">Back to the edition</NuxtLink>
      </template>

      <template v-else-if="status === 'timeout'">
        <div class="text-4xl mb-3">⏱</div>
        <h1 class="font-serif font-extrabold text-xl mb-1">Still waiting</h1>
        <p class="text-sm text-neutral-500 mb-4">This is taking longer than expected. If you already approved it on your phone, try reopening the edition in a moment.</p>
        <NuxtLink :to="editionPath()" class="text-sm underline">Back to the edition</NuxtLink>
      </template>

      <template v-else>
        <div class="text-4xl mb-3">⚠️</div>
        <h1 class="font-serif font-extrabold text-xl mb-1">Something went wrong</h1>
        <NuxtLink to="/" class="text-sm underline">Back home</NuxtLink>
      </template>
    </div>
  </div>
</template>