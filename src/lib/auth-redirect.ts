const STORAGE_KEY = "meal-maestro:auth-redirect";

type StoredAuthRedirect = {
  path: string;
  locale?: string | null;
};

const isBrowser = () => typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const sanitizeRedirectPath = (rawPath: string | null | undefined): string | null => {
  if (!rawPath) {
    return null;
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("/")) {
    return null;
  }

  // Prevent protocol-relative or absolute URLs
  if (trimmed.startsWith("//") || trimmed.includes("://")) {
    return null;
  }

  return trimmed;
};

export const setPendingAuthRedirect = (path: string | null, locale?: string | null) => {
  if (!isBrowser()) {
    return;
  }

  const sanitized = sanitizeRedirectPath(path);
  if (!sanitized) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  const payload: StoredAuthRedirect = { path: sanitized, locale: locale ?? null };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to store pending auth redirect", error);
  }
};

export const getPendingAuthRedirect = (): StoredAuthRedirect | null => {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuthRedirect;
    const sanitized = sanitizeRedirectPath(parsed?.path);
    if (!sanitized) {
      return null;
    }

    return { path: sanitized, locale: parsed?.locale ?? null };
  } catch (error) {
    console.error("Failed to parse pending auth redirect", error);
    return null;
  }
};

export const consumePendingAuthRedirect = (): StoredAuthRedirect | null => {
  const current = getPendingAuthRedirect();
  if (isBrowser()) {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
  return current;
};

export const clearPendingAuthRedirect = () => {
  if (isBrowser()) {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
};

type LocaleAwarePathOptions = {
  path: string | null;
  locale: string | null | undefined;
  availableLocales: readonly string[];
  defaultLocale: string;
};

export const resolveLocaleAwarePath = ({
  path,
  locale,
  availableLocales,
  defaultLocale,
}: LocaleAwarePathOptions): { path: string; locale: string } => {
  const sanitizedPath = sanitizeRedirectPath(path) ?? "/";

  let localeFromPath: string | null = null;
  for (const loc of availableLocales) {
    if (
      sanitizedPath === `/${loc}` ||
      sanitizedPath.startsWith(`/${loc}/`) ||
      sanitizedPath.startsWith(`/${loc}?`)
    ) {
      localeFromPath = loc;
      break;
    }
  }

  if (localeFromPath) {
    return { path: sanitizedPath, locale: localeFromPath };
  }

  const fallbackLocale = locale ?? defaultLocale;
  const normalizedLocale = availableLocales.includes(fallbackLocale) ? fallbackLocale : defaultLocale;

  if (sanitizedPath === "/") {
    return { path: `/${normalizedLocale}`, locale: normalizedLocale };
  }

  return { path: `/${normalizedLocale}${sanitizedPath}`, locale: normalizedLocale };
};
