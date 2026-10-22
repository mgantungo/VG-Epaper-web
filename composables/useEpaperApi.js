import { useRuntimeConfig, useCookie, $fetch } from '#imports';

/**
 * apps/web/composables/useEpaperApi.js  (srcDir-relative)     MODIFIED (organisations)
 * Change: adds `orgAdmin` (Organisation Admin dashboard calls) and
 * inspectInvite()/acceptInvite(). Everything that was here is unchanged.
 *
 * Phase 0 (publications, 23 Oct 2026): every paper is sold separately, so
 * editions, access ranges, plans and checkout all name a publication.
 * getCatalogue() feeds the landing page; mediaUrl() makes a public URL
 * (front-page covers) usable directly in <img src>.
 */

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

  /** dateIso: YYYY-MM-DD, 'today' or 'latest'. publication: NV, BK, … */
  async function getEdition(publication, dateIso) {
    const pub = String(publication || 'nv').toLowerCase();
    return authedFetch(`${config.public.middlewareUrl}/api/editions/${pub}/${dateIso}`);
  }

  /** What this reader can open of one publication: { ranges: [{ start, end, source }] }. */
  async function getRanges(publication) {
    return authedFetch(`${config.public.middlewareUrl}/api/editions/me/ranges`, { query: { publication } });
  }

  /** Landing page: titles -> publications (latest edition, reader's access), plans. */
  async function getCatalogue() {
    return authedFetch(`${config.public.middlewareUrl}/api/catalogue`);
  }

  /** Absolute URL for a public middleware path (e.g. a cover.jpg). */
  function mediaUrl(relativeUrl) {
    return relativeUrl ? `${config.public.middlewareUrl}${relativeUrl}` : null;
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
  /**
   * Real plan data (key, label, price, currency, kind, durationDays) from
   * Strapi's epaper-plan collection — powers the paywall's plan picker
   * with actual, currently-configured prices instead of a hardcoded
   * value. Not authedFetch: plan listings are public information (the
   * same prices anyone would see on a pricing page), no reason to require
   * a valid session just to view them.
   */
  async function getPlans(publication) {
    return $fetch(`${config.public.middlewareUrl}/api/pay/plans`, { query: publication ? { publication } : {} });
  }

  /**
   * Starts a real payment — phoneNumber/paymentmethod are required by the
   * middleware's /checkout (it proxies to Strapi's epaper-transaction
   * initialize, which needs both to actually request a PIN prompt from
   * the integrator). planKey is now explicit — which plan the reader
   * picked in the radio selector — rather than always being silently
   * derived from the date; omit it to fall back to the old
   * today-is-daily/otherwise-single_archive behavior. Returns
   * { receiptToken, invoiceNumber, amount, currency, status } — NOT a
   * checkoutUrl to redirect to; there's no hosted checkout page, the
   * integrator pushes the prompt straight to the customer's phone.
   * Callers should show a "check your phone" state and poll
   * getPaymentStatus(receiptToken) — see PaywallModal.vue.
   */
  /**
   * Phase 0: { planKey, phoneNumber, paymentmethod, dates? }. dates is only
   * used by single-issue plans (the edition(s) being bought); the server
   * works out the price and the editions itself.
   */
  async function startCheckout({ planKey, phoneNumber, paymentmethod, dates }) {
    return authedFetch(`${config.public.middlewareUrl}/api/pay/checkout`, {
      method: 'POST',
      body: { planKey, phoneNumber, paymentmethod, ...(dates?.length ? { dates } : {}) }
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
  // silently 400s, since the field just isn't there at all. (This exact
  // mistake made it back into this file once already, from editing a
  // stale prior copy — see the login flow that surfaced it.)
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

  // ---- Organisation Admin dashboard (pages/organisation/*) -------------
  // ADDED (organisations). All authedFetch, so an expired access token is
  // refreshed and retried exactly like every other signed-in call. Whether
  // the reader is actually an Org Admin is decided by the server on every
  // request (403 otherwise); nothing here sends an organisation id.
  const orgAdminBase = () => `${config.public.middlewareUrl}/api/org-admin`;
  const orgAdmin = {
    summary: () => authedFetch(`${orgAdminBase()}/summary`),
    members: (query = {}) => authedFetch(`${orgAdminBase()}/members`, { query }),
    addMember: (body) => authedFetch(`${orgAdminBase()}/members`, { method: 'POST', body }),
    grantAccess: (seatId, body) => authedFetch(`${orgAdminBase()}/members/${seatId}/access`, { method: 'POST', body }),
    setStatus: (seatId, status, reason) => authedFetch(`${orgAdminBase()}/members/${seatId}/status`, { method: 'POST', body: { status, reason } }),
    setRole: (seatId, role) => authedFetch(`${orgAdminBase()}/members/${seatId}/role`, { method: 'POST', body: { role } }),
    remove: (seatId, reason) => authedFetch(`${orgAdminBase()}/members/${seatId}/remove`, { method: 'POST', body: { reason } }),
    resendInvite: (seatId) => authedFetch(`${orgAdminBase()}/members/${seatId}/resend-invite`, { method: 'POST' }),
    // Phase 0: which paid publications this member reads, e.g. ['NV', 'BK']
    setPublications: (seatId, publications) => authedFetch(`${orgAdminBase()}/members/${seatId}/publications`, { method: 'POST', body: { publications } }),
    audit: (query = {}) => authedFetch(`${orgAdminBase()}/audit`, { query }),
    template: () => authedFetch(`${orgAdminBase()}/import/template`, { responseType: 'blob' }),
    // formData: FormData with `file` and optionally `defaults` (JSON string)
    previewImport: (formData) => authedFetch(`${orgAdminBase()}/import/preview`, { method: 'POST', body: formData }),
    commitImport: (importId) => authedFetch(`${orgAdminBase()}/import/${importId}/commit`, { method: 'POST' })
  };

  // ---- Organisation invites (pages/invite.vue) ---------------------------
  // Not authedFetch: the person accepting has no session yet. acceptInvite
  // returns { jwt, user } like login(), and sets the refresh cookie.
  async function inspectInvite(token) {
    return $fetch(`${config.public.middlewareUrl}/api/auth/invite/inspect`, { method: 'POST', body: { token } });
  }
  async function acceptInvite(token, password, displayName) {
    return $fetch(`${config.public.middlewareUrl}/api/auth/invite/accept`, {
      method: 'POST',
      credentials: 'include',
      body: { token, password, displayName }
    });
  }

  return {
    getEdition, getRanges, getCatalogue, mediaUrl, getAccount, startCheckout, getPaymentStatus, getPlans,
    login, register, fetchImageBlob,
    orgAdmin, inspectInvite, acceptInvite
  };
}