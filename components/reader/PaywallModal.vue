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

const phoneNumber = ref('');
// Adjust these to whatever values your integrator actually expects — this
// wasn't documented anywhere I had access to, so "MTN"/"Airtel" are a
// reasonable Uganda-market default, not confirmed against the real API.
const paymentMethod = ref('MTN');
const submitting = ref(false);
const error = ref(null);

async function continueToPayment() {
  if (!account.loggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  if (!phoneNumber.value.trim()) {
    error.value = 'Enter the phone number to pay with.';
    return;
  }

  submitting.value = true;
  error.value = null;
  try {
    const res = await api.startCheckout(props.dateIso, phoneNumber.value.trim(), paymentMethod.value);
    // No checkoutUrl to redirect to — the integrator sends a PIN prompt
    // straight to the phone number just entered. /pay/return owns all the
    // "wait for the customer to approve it" polling/status UI from here.
    emit('close');
    router.push({ path: '/pay/return', query: { receiptToken: res.receiptToken, date: props.dateIso } });
  } catch (e) {
    error.value = e?.data?.error || 'Could not start payment. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity"
    :class="open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    @click.self="emit('close')"
  >
    <div v-if="open" class="relative w-full max-w-sm bg-white text-neutral-900 rounded-2xl shadow-2xl p-8 text-center">
      <button class="absolute top-3 right-4 text-neutral-400 hover:text-neutral-900" @click="emit('close')">✕</button>
      <div class="text-5xl mb-3">🔒</div>
      <h2 class="font-serif font-extrabold text-2xl mb-1">Subscribe to keep reading</h2>
      <p class="text-sm text-neutral-500 mb-5">
        {{ isToday ? "Your subscription covers today's e-paper." : "Unlock this archive edition." }}
      </p>

      <div v-if="price" class="font-mono text-lg font-bold mb-5">
        {{ price.amount?.toLocaleString() }} {{ price.currency }}{{ isToday ? ' / month' : '' }}
      </div>

      <template v-if="!account.loggedIn">
        <button
          class="w-full bg-neutral-900 text-white rounded-lg py-3 font-mono text-sm"
          @click="continueToPayment"
        >Sign in to continue</button>
      </template>

      <template v-else>
        <div class="text-left space-y-3 mb-4">
          <label class="block">
            <span class="text-xs font-mono text-neutral-600">Phone number to pay with</span>
            <input
              v-model="phoneNumber" type="tel" placeholder="07XXXXXXXX" autocomplete="tel"
              class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
            >
          </label>
          <label class="block">
            <span class="text-xs font-mono text-neutral-600">Payment method</span>
            <select
              v-model="paymentMethod"
              class="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-neutral-900"
            >
              <option value="MTN">MTN Mobile Money</option>
              <option value="AIRTEL">Airtel Money</option>
            </select>
          </label>
        </div>

        <button
          :disabled="submitting"
          class="w-full bg-neutral-900 text-white rounded-lg py-3 font-mono text-sm disabled:opacity-60"
          @click="continueToPayment"
        >{{ submitting ? 'Sending payment request…' : (isToday ? 'Subscribe now' : 'Pay & unlock this edition') }}</button>
      </template>

      <p v-if="error" class="text-red-600 text-xs mt-3">{{ error }}</p>
      <p class="text-[10px] text-neutral-400 mt-4">You'll get a payment prompt on your phone — enter your PIN there to complete it.</p>
    </div>
  </div>
</template>