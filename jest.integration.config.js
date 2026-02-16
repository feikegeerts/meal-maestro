// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const makeJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  displayName: "integration",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/integration/**/*.test.{ts,tsx,js}"],
  setupFiles: [
    "<rootDir>/src/test-setup/polyfills.ts",
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
  transformIgnorePatterns: [
    "node_modules/(?!.*(next-intl|use-intl|msw|@mswjs/interceptors|until-async)/)",
  ],
  maxWorkers: 1,
  testTimeout: 60000,
};

const customJestConfig = async () => {
  const baseConfig = await makeJestConfig(config)();
  return {
    ...baseConfig,
    transformIgnorePatterns: [
      "node_modules/(?!.*(next-intl|use-intl|msw|@mswjs/interceptors|until-async|@neondatabase|better-auth|better-call|nanostores|jose|rou3|@noble)/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
};

module.exports = customJestConfig;
