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

# Meal Maestro

An AI-powered recipe management system built with Next.js, Supabase, and OpenAI. Built with modern UI components using shadcn/ui and Tailwind CSS v4. Meal Maestro helps you organize, discover, and manage your recipes through natural language conversations.

## Features

- **AI-Powered Recipe Management**: Natural language recipe operations via OpenAI GPT
- **User Authentication**: Google OAuth integration with Supabase Auth
- **Recipe CRUD Operations**: Full recipe lifecycle management
- **Advanced Search & Filtering**: Multi-criteria recipe discovery
- **Action Logging**: Comprehensive audit trail of all operations
- **Cost Tracking**: OpenAI API usage monitoring and budget management
- **Responsive Design**: Mobile-first UI with dark mode support

## Getting Started

### Prerequisites

- Node.js 20.x or later
- pnpm (recommended) or npm
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/meal-maestro.git
cd meal-maestro
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

Pull environment variables from Vercel (recommended):

```bash
npx vercel env pull .env.local
```

Or manually create `.env.local`:

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-nano or mini
OPENAI_DAILY_BUDGET=1.00
```

4. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Database Setup

This project uses Supabase for the database. Run the migrations in the `supabase/migrations/` directory to set up the required tables:

- Recipe management with categories, tags, and seasonal filtering
- User profiles and authentication
- Action logging and API usage tracking
- Row Level Security (RLS) policies for data isolation

## Project Structure

```
meal-maestro/
├── src/
│   └── app/                 # Next.js App Router
│       ├── globals.css      # Global styles
│       ├── layout.tsx       # Root layout
│       └── page.tsx         # Home page
├── supabase/
│   └── migrations/          # Database migrations
├── old/                     # Legacy codebase for reference
└── public/                  # Static assets
```

## Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Release Workflow

This project uses semantic-release for automated version management and releases.

### Developer Workflow

1. **Development**: Work in `preview` branch with multiple commits and iterations
2. **Testing**: Preview branch automatically deploys to Vercel preview environment
3. **Release**: When ready, rebase `main` branch onto `preview` and push to production
4. **Automatic Versioning**: GitHub Actions automatically analyzes commits and bumps version

### Commit Convention

Follow conventional commits for automatic versioning:

- `feat: add new feature` → **Minor version bump** (0.1.0 → 0.2.0)
- `fix: resolve bug` → **Patch version bump** (0.1.0 → 0.1.1)  
- `feat!: breaking change` or `BREAKING CHANGE:` → **Major version bump** (0.1.0 → 1.0.0)
- `docs:`, `refactor:`, `test:`, `chore:` → **No version bump**

### Release Process

1. **Develop**: Make changes in `preview` branch with conventional commit messages
2. **Test**: Verify changes in preview environment
3. **Release**: Rebase `main` onto `preview` and push
4. **Automatic**: GitHub Actions will:
   - Analyze commits since last release
   - Calculate new version number
   - Update `package.json` and `CHANGELOG.md`
   - Create GitHub release with auto-generated notes
   - Deploy to production

### Manual Release (if needed)

```bash
# Preview what would happen
npx semantic-release --dry-run

# Perform actual release (not recommended for production)
npx semantic-release
```

### Version Information

- **Current version**: Always available in the About page (reads from `package.json`)
- **Check latest release**: `git tag --sort=-version:refname | head -1`
- **Version history**: Check GitHub releases or `CHANGELOG.md`

### Troubleshooting

- **No release created**: Check that commit messages follow conventional commit format
- **Wrong version bump**: Review commit types (`feat`/`fix`/`BREAKING CHANGE`)
- **Failed workflow**: Check GitHub Actions logs and ensure `GITHUB_TOKEN` has write permissions

## Deployment

This application is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

The app includes automatic database migrations and optimized builds for production.
