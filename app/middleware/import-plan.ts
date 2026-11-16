// The review and export steps need a plan: a loaded one, or a draft saved in this browser.
export default defineNuxtRouteMiddleware(() => {
  const { loaded } = useDmpImport();

  if (!loaded.value) return navigateTo("/import");
});
