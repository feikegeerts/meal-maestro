// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  displayName: "integration-coverage",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/integration/**/*.test.{ts,tsx,js}"],
  setupFiles: [
    "<rootDir>/src/test-support/integration-env-setup.js",
    "<rootDir>/src/__tests__/msw-setup.js",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next-intl$": "<rootDir>/src/__mocks__/next-intl.ts",
    "^next-intl/routing$": "<rootDir>/src/__mocks__/routing.ts",
    "^next-intl/navigation$": "<rootDir>/src/__mocks__/routing.ts",
    "^@/app/i18n/routing$": "<rootDir>/src/__mocks__/routing.ts",
    "^@/messages$": "<rootDir>/src/__mocks__/messages.ts",
  },
  transformIgnorePatterns: ["node_modules/(?!(next-intl|use-intl)/)"],
  maxWorkers: 1,
  testTimeout: 60000,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/app/api/**/*.{ts,tsx}",
    "src/app/auth/callback/**/*.{ts,tsx}",
    "src/app/i18n/**/*.{ts,tsx}",
    "src/middleware.{ts,tsx}",
  ],
  coverageProvider: "v8",
  coverageReporters: ["json", "lcov", "text", "text-summary"],
};

module.exports = createJestConfig(config);
