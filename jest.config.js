// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

/** @type {import('jest').Config} */
const makeJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const config = {
  displayName: "unit",
  coverageProvider: "v8",
  testEnvironment: "jest-fixed-jsdom",
  // Add more setup options before each test is run
  setupFiles: [
    "<rootDir>/src/test-setup/polyfills.ts",
    "<rootDir>/src/__tests__/msw-setup.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  modulePathIgnorePatterns: ["<rootDir>/old/"],
  testPathIgnorePatterns: [
    "<rootDir>/old/",
    "<rootDir>/src/__tests__/setup.ts",
    "<rootDir>/src/__tests__/test-utils.tsx",
    "<rootDir>/src/__tests__/msw-setup.js",
    "<rootDir>/src/__tests__/integration/",
  ],
  // Module name mapping for path aliases
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^next-intl$": "<rootDir>/src/__mocks__/next-intl.ts",
    "^next-intl/routing$": "<rootDir>/src/__mocks__/routing.ts",
    "^next-intl/navigation$": "<rootDir>/src/__mocks__/routing.ts",
    "^@/app/i18n/routing$": "<rootDir>/src/__mocks__/routing.ts",
    "^@/messages$": "<rootDir>/src/__mocks__/messages.ts",
  },
  // Transform ESM modules
  transformIgnorePatterns: [
    // Jest 30 doesn't transpile ESM-only deps in node_modules by default.
    // Allowlist msw + until-async (pnpm nested paths included) so their ESM exports get transformed to CJS.
    "node_modules/(?!.*(next-intl|use-intl|msw|@mswjs/interceptors|until-async)/)"
  ],
  // CI-specific optimizations
  maxWorkers: process.env.CI ? 1 : "50%",
  workerIdleMemoryLimit: process.env.CI ? "512MB" : undefined,
  collectCoverageFrom: [
    "src/lib/**/*.{js,jsx,ts,tsx}",
    "src/app/api/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
    "!src/__mocks__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },
};

const customJestConfig = async () => {
  const baseConfig = await makeJestConfig(config)();
  return {
    ...baseConfig,
    transformIgnorePatterns: [
      "node_modules/(?!.*(next-intl|use-intl|msw|@mswjs/interceptors|until-async)/)",
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
};

module.exports = customJestConfig;
