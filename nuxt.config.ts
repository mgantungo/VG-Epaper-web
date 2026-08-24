export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/tailwindcss'],

  // Components in components/reader/* are used by their bare filename
  // (<BookReader>, <EpaperToolbar>, ...) throughout the app, not Nuxt's
  // default folder-prefixed name (<ReaderBookReader>) — disable the prefix
  // for this directory so that resolves correctly.
  components: [
    { path: '~/components/reader', pathPrefix: false }
  ],

  css: ['~/assets/css/main.css'],

  // Everything client-side talks to the middleware, never to Strapi directly —
  // see apps/middleware/README.md for why.
  runtimeConfig: {
    public: {
      middlewareUrl: process.env.NUXT_PUBLIC_MIDDLEWARE_URL || 'http://localhost:4161'
    }
  },

  app: {
    head: {
      title: 'New Vision — e-paper',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover'
    }
  },

  // SSR is fine for the shell/metadata (good for SEO on the archive/date
  // routes), but the actual page images are fetched client-side post-auth-
  // check anyway since they're entitlement-gated per request.
  ssr: true
});
