<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from '#imports';
import { useEpaperApi } from '~/composables/useEpaperApi';
import { useReaderStore } from '~/stores/reader';
import { useAccountStore } from '~/stores/account';

const props = defineProps({
  open: { type: Boolean, required: true },
  dateIso: { type: String, required: true },
  price: { type: Object, default: null } // { amount, currency, kind }
});
const emit = defineEmits(['close']);

const route = useRoute();
const router = useRouter();
const api = useEpaperApi();
const reader = useReaderStore();
const account = useAccountStore();
const isToday = computed(() => props.dateIso === reader.todayIso());
const submitting = ref(false);
const error = ref(null);

async function continueToPayment() {
  if (!account.loggedIn) {
    // Nothing to check out as an anonymous reader — send them to sign in
    // first, then straight back to this exact page (and this paywall will
    // re-open automatically here, since it's driven by the same locked
    // edition state) rather than surfacing a confusing 401 from checkout.
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  submitting.value = true;
  error.value = null;
  try {
    const res = await api.startCheckout(props.dateIso);
    // Real redirect to your gateway's hosted checkout page. It calls back to
    // POST /api/pay/webhook on completion (server-to-server), and the user is
    // sent back to /pay/return, which polls until the webhook has landed.
    window.location.href = `${res.checkoutUrl}&returnTo=${encodeURIComponent(`${window.location.origin}/pay/return?date=${props.dateIso}`)}`;
  } catch (e) {
    error.value = e?.data?.error || 'Could not start checkout. Please try again.';
    submitting.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[240] flex items-center justify-center p-6 bg-black/60 transition-opacity"
    :class="open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    @click.self="emit('close')"
  >
    <div v-if="open" class="w-full max-w-md bg-white text-neutral-900 rounded-xl p-8 text-center relative shadow-2xl">
      <button class="absolute top-3 right-4 w-8 h-8 rounded-full text-neutral-500 hover:bg-black/5" @click="emit('close')">✕</button>
      <div class="text-3xl mb-3">🔒</div>
      <h2 class="font-serif font-extrabold text-xl mb-2">
        {{ isToday ? 'Subscribe to keep reading' : 'Unlock this edition' }}
      </h2>
      <p class="text-sm text-neutral-600 mb-4">
        <template v-if="isToday">Your subscription covers today's e-paper.</template>
        <template v-else>Your subscription only covers today's edition — {{ dateIso }} is in the archive and is billed separately.</template>
      </p>
      <div v-if="price" class="font-mono text-xl font-bold mb-4">{{ price.amount.toLocaleString() }} {{ price.currency }}<template v-if="isToday"> / month</template></div>
      <button
        class="w-full bg-neutral-900 text-white rounded-lg py-3 font-mono text-sm disabled:opacity-60"
        :disabled="submitting"
        @click="continueToPayment"
      >{{ submitting ? 'Redirecting to payment…' : (!account.loggedIn ? 'Sign in to continue' : (isToday ? 'Subscribe now' : 'Pay & unlock this edition')) }}</button>
      <p v-if="error" class="text-red-600 text-xs mt-3">{{ error }}</p>
      <p class="text-[10px] text-neutral-400 mt-4">You'll be taken to our payment provider to complete this securely.</p>
    </div>
  </div>
</template>