import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useEpaperApi } from '~/composables/useEpaperApi';

export const useAccountStore = defineStore('account', () => {
  const subscriptionActive = ref(false);
  const subscriptionExpiresAt = ref<string | null>(null);
  const purchasedDates = ref<string[]>([]);
  const loaded = ref(false);

  async function refresh() {
    const api = useEpaperApi();
    try {
      const me = await api.getAccount() as any;
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

  function hasPurchased(dateIso: string) {
    return purchasedDates.value.includes(dateIso);
  }

  return { subscriptionActive, subscriptionExpiresAt, purchasedDates, loaded, refresh, hasPurchased };
});
