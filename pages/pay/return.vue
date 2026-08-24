<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from '#imports';
import { NuxtLink } from '#components';
import { useAccountStore } from '~/stores/account';

const route = useRoute();
const router = useRouter();
const account = useAccountStore();
const dateIso = route.query.date as string;

const status = ref<'polling' | 'unlocked' | 'timeout'>('polling');

onMounted(async () => {
  const isToday = dateIso === new Date().toISOString().slice(0, 10);
  const deadline = Date.now() + 20_000; // webhooks are usually near-instant; 20s covers reasonable gateway latency

  while (Date.now() < deadline) {
    await account.refresh();
    const unlocked = isToday ? account.subscriptionActive : account.hasPurchased(dateIso);
    if (unlocked) {
      status.value = 'unlocked';
      const [y, m, d] = dateIso.split('-');
      setTimeout(() => router.push(`/${y}/${m}/${d}`), 900);
      return;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  status.value = 'timeout';
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-950 text-white text-center p-6">
    <div v-if="status === 'polling'">
      <div class="animate-pulse font-mono text-sm">Confirming your payment…</div>
    </div>
    <div v-else-if="status === 'unlocked'">
      <div class="font-mono text-sm">Payment received — opening your edition…</div>
    </div>
    <div v-else>
      <div class="font-mono text-sm mb-3">Still waiting on confirmation from the payment provider.</div>
      <NuxtLink :to="`/${dateIso.replaceAll('-', '/')}`" class="underline">Go back to the edition</NuxtLink>
    </div>
  </div>
</template>
