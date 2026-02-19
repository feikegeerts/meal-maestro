// Mock for i18n routing
export const routing = {
  locales: ['nl', 'en'],
  defaultLocale: 'nl'
};

// Mock defineRouting function
export const defineRouting = (config: { locales: string[]; defaultLocale: string }) => config;

// Mock createNavigation function
export const createNavigation = () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  redirect: vi.fn(),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
});

// Mock navigation functions
export const Link = ({ children }: { children: React.ReactNode }) => {
  return children;
};

export const redirect = vi.fn();

export const usePathname = vi.fn(() => '/');

export const useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}));

const mockExports = {
  routing,
  defineRouting,
  createNavigation,
  Link,
  redirect,
  usePathname,
  useRouter,
};

export default mockExports;