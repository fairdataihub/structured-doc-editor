<template>
  <!-- The app's name and mark. It leads home (/), where both prototypes are linked. -->
  <NuxtLink to="/" class="brand" aria-label="DMP Bridge, home">
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="7" height="16" rx="1.5" />

      <rect x="13" y="3" width="7" height="16" rx="1.5" />

      <path d="M9 11.5c.8-1.6 3.2-1.6 4 0" stroke-linecap="round" />
    </svg>

    <span class="brand-name">DMP Bridge</span>
  </NuxtLink>
</template>
