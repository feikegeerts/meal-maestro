# Resources to load in the context for every prompt:

- @README.md for an overview of this project
- @ToDo.md for a todo list of things that need to be done
- @MIGRATION_SPEC.md for an overview of an old project on which this project is based
- @old/src/lib for and overview of the services that were used in that old project

## Tech Stack

### Frontend

| Technology   | Website                                          | GitHub                                                                             |
| ------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| React        | [react.dev](https://react.dev)                   | [github.com/facebook/react](https://github.com/facebook/react)                     |
| Next.js      | [nextjs.org](https://nextjs.org)                 | [github.com/vercel/next.js](https://github.com/vercel/next.js)                     |
| Tailwind CSS | [tailwindcss.com](https://tailwindcss.com)       | [github.com/tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| shadcn/ui    | [ui.shadcn.com](https://ui.shadcn.com)           | [github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui)                         |
| TypeScript   | [typescriptlang.org](https://typescriptlang.org) | [github.com/microsoft/TypeScript](https://github.com/microsoft/TypeScript)         |
| Lucide Icons | [lucide.dev](https://lucide.dev)                 | [github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide)           |

### Tooling

| Technology  | Website                                                      | GitHub                                                                           |
| ----------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| pnpm        | [pnpm.io](https://pnpm.io)                                   | [github.com/pnpm/pnpm](https://github.com/pnpm/pnpm)                             |
| ESLint      | [eslint.org](https://eslint.org)                             | [github.com/eslint/eslint](https://github.com/eslint/eslint)                     |
| Prettier    | [prettier.io](https://prettier.io)                           | [github.com/prettier/prettier](https://github.com/prettier/prettier)             |
| Husky       | [typicode.github.io/husky](https://typicode.github.io/husky) | [github.com/typicode/husky](https://github.com/typicode/husky)                   |
| lint-staged | N/A                                                          | [github.com/lint-staged/lint-staged](https://github.com/lint-staged/lint-staged) |
| dotenv      | N/A                                                          | [github.com/motdotla/dotenv](https://github.com/motdotla/dotenv)                 |

### Backend / Hosting

| Technology | Website                          | GitHub                                                       |
| ---------- | -------------------------------- | ------------------------------------------------------------ |
| Vercel     | [vercel.com](https://vercel.com) | [github.com/vercel/vercel](https://github.com/vercel/vercel) |

### Testing

| Technology            | Website                                            | GitHub                                                                                                       |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Jest                  | [jestjs.io](https://jestjs.io)                     | [github.com/jestjs/jest](https://github.com/jestjs/jest)                                                     |
| React Testing Library | [testing-library.com](https://testing-library.com) | [github.com/testing-library/react-testing-library](https://github.com/testing-library/react-testing-library) |
| Playwright            | [playwright.dev](https://playwright.dev)           | [github.com/microsoft/playwright](https://github.com/microsoft/playwright)                                   |
| Mock Service Worker   | [mswjs.io](https://mswjs.io)                       | [github.com/mswjs/msw](https://github.com/mswjs/msw)                                                         |

# Coding guidelines

**IMPORTANT**

- Do not add comments when the code is self explanatory
- use shadcn components when possible to avoid custom components

# Auth Notes

- Google OAuth PKCE: Use client-side callback page (`/auth/callback/page.tsx`), not server-side route. Supabase handles PKCE with `detectSessionInUrl: true`.
