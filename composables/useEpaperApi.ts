import { useRuntimeConfig, useCookie, $fetch } from '#imports';

export function useEpaperApi() {
  const config = useRuntimeConfig();
  const token = useCookie('token'); // Strapi users-permissions JWT, set at login

  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  }

  async function getEdition(dateIso: string) {
    return $fetch(`${config.public.middlewareUrl}/api/editions/${dateIso}`, {
      headers: authHeaders(),
      credentials: 'include'
    });
  }

  async function getPurchasedDates() {
    return $fetch<{ dates: string[] }>(`${config.public.middlewareUrl}/api/editions/me/purchased-dates`, {
      headers: authHeaders(),
      credentials: 'include'
    });
  }

  async function getAccount() {
    return $fetch(`${config.public.middlewareUrl}/api/account/me`, {
      headers: authHeaders(),
      credentials: 'include'
    });
  }

  async function startCheckout(dateIso: string) {
    return $fetch<{ checkoutUrl: string; purchaseId: string | null; amount: number; currency: string; kind: string }>(
      `${config.public.middlewareUrl}/api/pay/checkout`,
      {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: { date: dateIso }
      }
    );
  }

  function pageImageSrc(dateIso: string, pageNumber: number) {
    // The middleware re-checks entitlement on every request to this path —
    // see apps/middleware/src/routes/editions.js — so this URL is safe to
    // put directly in an <img src>, it isn't a bypassable "unlocked" link.
    return `${config.public.middlewareUrl}/api/editions/${dateIso}/pages/${String(pageNumber).padStart(2, '0')}.jpg`;
  }

  return { getEdition, getPurchasedDates, getAccount, startCheckout, pageImageSrc };
}
