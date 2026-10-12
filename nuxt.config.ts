// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-16",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  // The editor (Tiptap) is browser-only, so the app renders on the client.
  ssr: false,

  modules: ["@nuxt/ui", "@nuxt/eslint"],
  runtimeConfig: {
    public: {
      // The Styles panel is for demos and admins. NUXT_PUBLIC_SHOW_STYLES_PANEL=false hides it from researchers.
      showStylesPanel: true,
    },
  },
  // UI fonts are self-hosted by Nuxt Fonts (bundled with Nuxt UI).
  // The plan's paper font is NOT loaded this way: see public/fonts and app/assets/css/paper.css.
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
