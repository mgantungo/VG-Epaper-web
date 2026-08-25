import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useEpaperApi } from '~/composables/useEpaperApi';

export const useAccountStore = defineStore('account', () => {
  // Same fix as stores/reader.js — capture once at store creation (valid
  // synchronous context), not fresh inside the async action below.
  const api = useEpaperApi();

  const subscriptionActive = ref(false);
  const subscriptionExpiresAt = ref(null);
  const purchasedDates = ref([]);
  const loaded = ref(false);

  async function refresh() {
    try {
      const me = await api.getAccount();
      subscriptionActive.value = me.subscriptionActive;
      subscriptionExpiresAt.value = me.subscriptionExpiresAt;
      purchasedDates.value = me.purchasedDates;
    } catch {
      // not signed in, or middleware unreachable — treat as no entitlements
      subscriptionActive.value = false;
      purchasedDates.value = [];
    } finally {
      loaded.value = true;
    }
  }

  function hasPurchased(dateIso) {
    return purchasedDates.value.includes(dateIso);
  }

  return { subscriptionActive, subscriptionExpiresAt, purchasedDates, loaded, refresh, hasPurchased };
});