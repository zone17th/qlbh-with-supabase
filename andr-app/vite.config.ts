import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: "..",
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [".."],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "../frontend/src/test/setup.ts",
    globals: false,
  },
});
