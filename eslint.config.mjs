import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/.venv/**",
      "coverage/**",
      "public/**",
      "temp.html",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: [
      "**/*.test.{ts,tsx,js}",
      "**/*.spec.{ts,tsx,js}",
      "src/__tests__/**",
      "src/__mocks__/**",
      "src/test-setup/**",
      "src/test-support/**",
    ],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
  {
    files: ["next-pwa.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
