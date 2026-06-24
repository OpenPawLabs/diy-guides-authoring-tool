import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/diy-guides-authoring-tool/",
  plugins: [react(), tailwindcss()],
  // Ensure the linked @openpawlabs/diy-guides-ui shares this app's single React copy.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
