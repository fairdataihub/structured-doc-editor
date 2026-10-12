export default defineAppConfig({
  ui: {
    button: {
      defaultVariants: {
        size: "md",
      },
      slots: {
        base: "cursor-pointer rounded-lg",
      },
    },
    colors: {
      neutral: "slate",
      primary: "indigo",
    },
  },
});
