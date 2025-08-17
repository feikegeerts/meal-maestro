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
  redirect: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
});

// Mock navigation functions
export const Link = ({ children }: { children: React.ReactNode }) => {
  return children;
};

export const redirect = jest.fn();

export const usePathname = jest.fn(() => '/');

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
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