import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      clearMocks: true,
      environment: "node",
      exclude: ["**/node_modules/**", "**/dist/**", "../opensrc/**"],
      include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
      restoreMocks: true,
    },
  }),
);
