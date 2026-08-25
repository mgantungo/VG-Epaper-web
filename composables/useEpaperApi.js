import { useRuntimeConfig, useCookie, $fetch } from '#imports';

export function useEpaperApi() {
  const config = useRuntimeConfig();
  const token = useCookie('token'); // short-lived Strapi access token, set at login — see routes/auth.js for why it's short-lived

  function authHeaders() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  }

  /**
   * Wraps an authenticated call: on a 401 (access token expired — expected
   * to happen regularly, since Strapi's `jwtManagement: 'refresh'` mode
   * issues short-lived tokens on purpose), silently exchanges the httpOnly
   * refresh cookie for a new access token via POST /api/auth/refresh, then
   * retries the original call ONCE. If the refresh itself fails (refresh
   * token also expired/revoked — a real "please sign in again" situation),
   * the token cookie is cleared and the original 401 is re-thrown so the
   * caller's normal not-signed-in handling takes over.
   *
   * Centralizing this here means every other file — the account store, the
   * paywall, every page — just calls getAccount()/startCheckout()/etc. as
   * if tokens never expired, without needing its own retry logic.
   */
  async function authedFetch(url, opts = {}) {
    const attempt = () => $fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), ...authHeaders() },
      credentials: 'include'
    });

    try {
      return await attempt();
    } catch (err) {
      const status = err?.response?.status ?? err?.statusCode ?? err?.status;
      if (status !== 401 || !token.value) throw err;

      try {
        const refreshed = await $fetch(`${config.public.middlewareUrl}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });
        token.value = refreshed.jwt;
      } catch {
        token.value = null; // refresh token's gone too — genuinely signed out now
        throw err; // surface the ORIGINAL 401, not the refresh failure
      }

      return await attempt(); // retry once with the freshly-issued token
    }
  }

  async function getEdition(dateIso) {
    return authedFetch(`${config.public.middlewareUrl}/api/editions/${dateIso}`);
  }

  async function getPurchasedDates() {
    return authedFetch(`${config.public.middlewareUrl}/api/editions/me/purchased-dates`);
  }

  async function getAccount() {
    return authedFetch(`${config.public.middlewareUrl}/api/account/me`);
  }

  async function startCheckout(dateIso) {
    return authedFetch(`${config.public.middlewareUrl}/api/pay/checkout`, {
      method: 'POST',
      body: { date: dateIso }
    });
  }

  async function login(identifier, password) {
    return $fetch(`${config.public.middlewareUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: { identifier, password }
    });
  }

  async function register(username, email, password) {
    return $fetch(`${config.public.middlewareUrl}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      body: { username, email, password }
    });
  }

  function pageImageSrc(dateIso, pageNumber) {
    // The middleware re-checks entitlement on every request to this path —
    // see apps/middleware/src/routes/editions.js — so this URL is safe to
    // put directly in an <img src>, it isn't a bypassable "unlocked" link.
    // Note: unlike the calls above, a plain <img> tag can't be retried via
    // authedFetch — if the access token expires mid-session, images will
    // 402 until the next page navigation re-authenticates. Acceptable for
    // now; revisit if that proves disruptive in practice.
    return `${config.public.middlewareUrl}/api/editions/${dateIso}/pages/${String(pageNumber).padStart(2, '0')}.jpg`;
  }

  return { getEdition, getPurchasedDates, getAccount, startCheckout, login, register, pageImageSrc };
}