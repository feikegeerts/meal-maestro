import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [
      "./src/test-setup/polyfills.ts",
      "./src/__tests__/msw-setup.js",
      "./src/__tests__/setup.ts",
    ],
    include: ["src/**/*.test.{ts,tsx,js}", "src/**/*.spec.{ts,tsx,js}"],
    exclude: [
      "**/node_modules/**",
      "**/old/**",
      "src/__tests__/setup.ts",
      "src/__tests__/test-utils.tsx",
      "src/__tests__/msw-setup.js",
      "src/__tests__/integration/**",
    ],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next-intl": path.resolve(__dirname, "./src/__mocks__/next-intl.ts"),
      "next-intl/routing": path.resolve(__dirname, "./src/__mocks__/routing.ts"),
      "next-intl/navigation": path.resolve(
        __dirname,
        "./src/__mocks__/routing.ts"
      ),
      "@/app/i18n/routing": path.resolve(
        __dirname,
        "./src/__mocks__/routing.ts"
      ),
      "@/messages": path.resolve(__dirname, "./src/__mocks__/messages.ts"),
    },
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**/*.{js,jsx,ts,tsx}",
        "src/app/api/**/*.{ts,tsx}",
        "src/components/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/__tests__/**",
        "src/__mocks__/**",
        "src/test-setup/**",
        "src/test-support/**",
      ],
      thresholds: {
        branches: 65,
        functions: 65,
        lines: 65,
        statements: 65,
      },
      reporter: ["text", "lcov", "json"],
    },
    maxWorkers: process.env.CI ? 1 : "50%",
    testTimeout: 30000,
  },
});
