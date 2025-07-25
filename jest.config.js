// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: "v8",
  testEnvironment: "jest-fixed-jsdom",
  // Add more setup options before each test is run
  setupFiles: [
    "<rootDir>/src/__tests__/react-act-polyfill.js",
    "<rootDir>/src/__tests__/msw-setup.js"
  ],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  modulePathIgnorePatterns: ["<rootDir>/old/"],
  testPathIgnorePatterns: [
    "<rootDir>/old/",
    "<rootDir>/src/__tests__/setup.ts",
    "<rootDir>/src/__tests__/test-utils.tsx",
    "<rootDir>/src/__tests__/msw-setup.js",
    "<rootDir>/src/__tests__/react-act-polyfill.js",
  ],
  // CI-specific optimizations
  maxWorkers: process.env.CI ? 1 : "50%",
  workerIdleMemoryLimit: process.env.CI ? "512MB" : undefined,
  collectCoverageFrom: [
    "src/lib/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
    "!src/__mocks__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

module.exports = createJestConfig(config);
