import { defineConfig } from "vitest/config";

export default defineConfig({
  // Ensure the linked @openpawlabs/diy-guides-ui shares this app's single React copy.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
