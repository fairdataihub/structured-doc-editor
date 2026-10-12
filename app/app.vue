<script setup lang="ts">
const colorMode = useColorMode();

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [{ href: "/favicon.ico", rel: "icon" }],
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    {
      name: "theme-color",
      content: colorMode.value === "dark" ? "#0f1116" : "#f6f7f9",
      key: "theme-color",
    },
  ],
});

useSeoMeta({
  titleTemplate: "%s - DMP Bridge",
  description:
    "Prototype editor for reviewing and editing an extracted Data Management Plan on its PDF pages.",
});
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
