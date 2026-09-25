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

      console.log(`[api] ${url} -> 401, attempting token refresh…`);
      try {
        const refreshed = await $fetch(`${config.public.middlewareUrl}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });
        token.value = refreshed.jwt;
        console.log('[api] refresh succeeded, retrying original request');
      } catch (refreshErr) {
        console.warn('[api] refresh FAILED — treating as signed out:', refreshErr?.data?.error || refreshErr?.message);
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

  /**
   * Starts a real payment — phoneNumber/paymentmethod are now required by
   * the middleware's /checkout (it proxies to Strapi's epaper-transaction
   * initialize, which needs both to actually request a PIN prompt from the
   * integrator). Returns { receiptToken, invoiceNumber, amount, currency,
   * status } — NOT a checkoutUrl to redirect to; there's no hosted
   * checkout page, the integrator pushes the prompt straight to the
   * customer's phone. Callers should show a "check your phone" state and
   * poll getPaymentStatus(receiptToken) — see PaywallModal.vue.
   */
  async function startCheckout(dateIso, phoneNumber, paymentmethod) {
    return authedFetch(`${config.public.middlewareUrl}/api/pay/checkout`, {
      method: 'POST',
      body: { date: dateIso, phoneNumber, paymentmethod }
    });
  }

  /**
   * Polls a transaction's status by its receiptToken — proxies to Strapi's
   * epaper-transaction status action. Deliberately NOT authedFetch: the
   * receiptToken itself is the access control here (24 random bytes, same
   * unguessable-reference pattern as the receipt page), not the reader's
   * own login state — this needs to keep working even if their access
   * token happens to expire mid-poll.
   */
  async function getPaymentStatus(receiptToken) {
    return $fetch(`${config.public.middlewareUrl}/api/pay/status/${receiptToken}`);
  }

  /**
   * A page image is entitlement-gated, which a plain <img src="..."> can't
   * authenticate for two reasons: it can't attach an Authorization header
   * at all, AND the access-token cookie is scoped to this frontend's own
   * domain (set via a plain client-side useCookie), never the middleware's
   * separate API domain — so even the cookie fallback in attachUser never
   * had anything to receive. Fetching the bytes explicitly through
   * authedFetch (same 401-retry-on-expiry handling as every other call)
   * and handing the component back a Blob is the actual fix; the caller
   * turns that into an object URL for the <img> tag. See PageFace.vue.
   */
  async function fetchImageBlob(relativeUrl) {
    return authedFetch(`${config.public.middlewareUrl}${relativeUrl}`, { responseType: 'blob' });
  }

  // email/password — matches the epaper-user identity store (see
  // apps/cms/src/api/epaper-user), not Strapi's users-permissions, which
  // used `identifier` and required a separate username. Sent as `email`
  // specifically because that's the exact body key the middleware's
  // /api/auth/login expects — sending `identifier` (the old key name)
  // would silently 400, since the field just wouldn't be there at all.
  async function login(email, password) {
    return $fetch(`${config.public.middlewareUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: { email, password }
    });
  }

  async function register(email, password, displayName, phone) {
    return $fetch(`${config.public.middlewareUrl}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      body: { email, password, displayName, phone }
    });
  }

  return {
    getEdition, getPurchasedDates, getAccount, startCheckout, getPaymentStatus,
    login, register, fetchImageBlob
  };
}