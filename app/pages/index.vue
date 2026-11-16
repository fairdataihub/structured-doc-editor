<script setup lang="ts">
// Home: links to the current DMP Bridge. The earlier prototypes stay online at /x and /d, without a
// link here.

useSeoMeta({ title: "Home" });

const PROTOTYPES = [
  {
    path: "/import",
    href: "/import",
    name: "DMP Bridge",
    blurb: "Idea #1 rebuilt with Nuxt UI, in progress",
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
      <h1 class="start-title">DMP prototype</h1>

      <p class="start-lead">Start from an extracted Data Management Plan.</p>

      <nav class="home-list" aria-label="Prototype">
        <a
          v-for="p in PROTOTYPES"
          :key="p.path"
          :href="p.href"
          class="home-card"
        >
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
