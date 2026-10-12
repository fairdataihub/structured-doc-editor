<script setup lang="ts">
// Home: one deployment shows two DMP prototypes side by side. /d is this editor (a Nuxt page);
// /x is a teammate's single static page in public/x/, so it's linked with a full page load.

useSeoMeta({ title: "Home" });

const PROTOTYPES = [
  {
    path: "/d",
    href: "/d",
    name: "DMP Bridge",
    blurb:
      "Edit the plan on its pages: one fixed style, automatic numbering, drag to reorder and colors for checking the structure. Exports JSON.",
  },
  {
    path: "/x",
    href: "/x/index.html",
    name: "DMP import: Review structure",
    blurb:
      "Upload a PDF, review the structure the extraction found, and export JSON.",
  },
];
</script>

<template>
  <div class="start">
    <header class="top">
      <span class="home-name">Structured Document Editor</span>

      <span class="flex-1" />

      <UColorModeButton />
    </header>

    <main class="start-main">
      <h1 class="start-title">Two DMP prototypes</h1>

      <p class="start-lead">
        Both start from the same extracted Data Management Plan. Pick one to
        try.
      </p>

      <nav class="home-list" aria-label="Prototypes">
        <a
          v-for="p in PROTOTYPES"
          :key="p.path"
          :href="p.href"
          class="home-card"
        >
          <span class="home-path">{{ p.path }}</span>

          <span class="home-body">
            <span class="home-card-name">{{ p.name }}</span>

            <span class="home-blurb">{{ p.blurb }}</span>
          </span>

          <UIcon name="i-lucide-arrow-right" class="home-arrow size-4" />
        </a>
      </nav>
    </main>
  </div>
</template>
