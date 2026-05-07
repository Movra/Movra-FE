import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    css: true,
    environment: "jsdom",
    fileParallelism: false,
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 15000,
  },
});
