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
  // Replaces purchasedDates (a flat array of individually-purchased days) —
  // one entitlement can now span a whole subscription period, so this is a
  // list of { start, end } ranges instead. See the middleware's
  // getEntitlementRanges() for why.
  const entitlementRanges = ref([]);
  const loaded = ref(false);
  const user = ref(null); // { id, username, email } | null

  const loggedIn = computed(() => Boolean(token.value));

  async function refresh() {
    try {
      const me = await api.getAccount();
      subscriptionActive.value = me.subscriptionActive;
      subscriptionExpiresAt.value = me.subscriptionExpiresAt;
      entitlementRanges.value = me.entitlementRanges || [];
      if (me.user) user.value = me.user; // repopulates after a page refresh, not just right after login/register
    } catch {
      // not signed in, token expired, or middleware unreachable — treat as no entitlements
      subscriptionActive.value = false;
      entitlementRanges.value = [];
    } finally {
      loaded.value = true;
    }
  }

  /** Is this date covered by ANY of the reader's entitlement ranges —
   * personal or via an org seat? Replaces the old flat-array .includes()
   * check, since a range can now span more than one day. */
  function hasPurchased(dateIso) {
    return entitlementRanges.value.some(r => dateIso >= r.start && dateIso <= r.end);
  }

  // email/password/displayName/phone — matches the epaper-user identity
  // store now, not Strapi's old username/identifier shape.
  async function login(email, password) {
    const res = await api.login(email, password); // throws on 400/401 — let the caller show the error
    token.value = res.jwt;
    user.value = res.user;
    await refresh();
  }

  async function register(email, password, displayName, phone) {
    const res = await api.register(email, password, displayName, phone);
    token.value = res.jwt;
    user.value = res.user;
    await refresh();
  }

  function logout() {
    token.value = null;
    user.value = null;
    subscriptionActive.value = false;
    entitlementRanges.value = [];
  }

  return {
    subscriptionActive, subscriptionExpiresAt, entitlementRanges, loaded, user,
    loggedIn, refresh, hasPurchased, login, register, logout
  };
});