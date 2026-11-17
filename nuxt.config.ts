// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-16",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  // The app runs in the browser only: drafts are kept in the browser's storage.
  ssr: false,
  // There is no start page: the app opens on the upload step.
  routeRules: {
    "/": { redirect: "/import" },
  },

  modules: ["@nuxt/ui", "@nuxt/eslint"],
  // UI fonts are self-hosted by Nuxt Fonts (bundled with Nuxt UI).
  fonts: {
    families: [
      {
        name: "Instrument Sans",
        provider: "google",
        weights: [400, 500, 600, 700],
      },
      { name: "IBM Plex Mono", provider: "google", weights: [400, 500] },
    ],
  },
  icon: {
    serverBundle: { collections: ["lucide"] },
  },
  eslint: {},
});
