import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/integration/**/*.test.{ts,tsx,js}"],
    setupFiles: [
      "./src/test-setup/polyfills.ts",
      "./src/test-support/integration-env-setup.js",
      "./src/__tests__/msw-setup.js",
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
    maxWorkers: 1,
    testTimeout: 60000,
    coverage: {
      provider: "v8",
      include: [
        "src/app/api/**/*.{ts,tsx}",
        "src/app/auth/callback/**/*.{ts,tsx}",
        "src/app/i18n/**/*.{ts,tsx}",
        "src/middleware.{ts,tsx}",
      ],
      reporter: ["json", "lcov", "text", "text-summary"],
    },
  },
});
