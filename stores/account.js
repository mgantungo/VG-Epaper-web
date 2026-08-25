import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCookie } from '#imports';
import { useEpaperApi } from '~/composables/useEpaperApi';

export const useAccountStore = defineStore('account', () => {
  // Captured once at store creation (valid synchronous context) — same
  // reasoning as the fix in stores/reader.js.
  const api = useEpaperApi();
  const token = useCookie('token', { maxAge: 60 * 60 * 24 * 30 }); // 30 days

  const subscriptionActive = ref(false);
  const subscriptionExpiresAt = ref(null);
  const purchasedDates = ref([]);
  const loaded = ref(false);
  const user = ref(null); // { id, username, email } | null

  const loggedIn = computed(() => Boolean(token.value));

  async function refresh() {
    try {
      const me = await api.getAccount();
      subscriptionActive.value = me.subscriptionActive;
      subscriptionExpiresAt.value = me.subscriptionExpiresAt;
      purchasedDates.value = me.purchasedDates;
      if (me.user) user.value = me.user; // repopulates after a page refresh, not just right after login/register
    } catch {
      // not signed in, token expired, or middleware unreachable — treat as no entitlements
      subscriptionActive.value = false;
      purchasedDates.value = [];
    } finally {
      loaded.value = true;
    }
  }

  function hasPurchased(dateIso) {
    return purchasedDates.value.includes(dateIso);
  }

  async function login(identifier, password) {
    const res = await api.login(identifier, password); // throws on 400/401 — let the caller show the error
    token.value = res.jwt;
    user.value = res.user;
    await refresh();
  }

  async function register(username, email, password) {
    const res = await api.register(username, email, password);
    token.value = res.jwt;
    user.value = res.user;
    await refresh();
  }

  function logout() {
    token.value = null;
    user.value = null;
    subscriptionActive.value = false;
    purchasedDates.value = [];
  }

  return {
    subscriptionActive, subscriptionExpiresAt, purchasedDates, loaded, user,
    loggedIn, refresh, hasPurchased, login, register, logout
  };
});