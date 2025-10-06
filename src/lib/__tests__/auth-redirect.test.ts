import {
  consumePendingAuthRedirect,
  getPendingAuthRedirect,
  resolveLocaleAwarePath,
  sanitizeRedirectPath,
  setPendingAuthRedirect,
  clearPendingAuthRedirect,
} from "../auth-redirect";

describe("auth-redirect utilities", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("rejects invalid redirect paths", () => {
    expect(sanitizeRedirectPath(null)).toBeNull();
    expect(sanitizeRedirectPath(" ")).toBeNull();
    expect(sanitizeRedirectPath("login")).toBeNull();
    expect(sanitizeRedirectPath("//evil.com")).toBeNull();
    expect(sanitizeRedirectPath("http://evil.com")).toBeNull();
  });

  it("allows relative paths", () => {
    expect(sanitizeRedirectPath("/recipes")).toBe("/recipes");
    expect(sanitizeRedirectPath("/share/test?token=123")).toBe(
      "/share/test?token=123"
    );
  });

  it("stores and retrieves pending redirects", () => {
    setPendingAuthRedirect("/share/item", "en");

    const stored = getPendingAuthRedirect();
    expect(stored).toEqual({ path: "/share/item", locale: "en" });

    const consumed = consumePendingAuthRedirect();
    expect(consumed).toEqual({ path: "/share/item", locale: "en" });
    expect(getPendingAuthRedirect()).toBeNull();
  });

  it("resolves locale-aware paths", () => {
    const locales = ["nl", "en"] as const;
    const defaultLocale = "nl";

    const resolvedDirect = resolveLocaleAwarePath({
      path: "/recipes",
      locale: "en",
      availableLocales: locales,
      defaultLocale,
    });
    expect(resolvedDirect).toEqual({ path: "/en/recipes", locale: "en" });

    const resolvedLocalized = resolveLocaleAwarePath({
      path: "/en/recipes",
      locale: "nl",
      availableLocales: locales,
      defaultLocale,
    });
    expect(resolvedLocalized).toEqual({ path: "/en/recipes", locale: "en" });

    const resolvedRoot = resolveLocaleAwarePath({
      path: "/",
      locale: "en",
      availableLocales: locales,
      defaultLocale,
    });
    expect(resolvedRoot).toEqual({ path: "/en", locale: "en" });

    const resolvedFallback = resolveLocaleAwarePath({
      path: "/recipes",
      locale: "fr",
      availableLocales: locales,
      defaultLocale,
    });
    expect(resolvedFallback).toEqual({ path: "/nl/recipes", locale: "nl" });

    const resolvedQuery = resolveLocaleAwarePath({
      path: "/en?foo=bar",
      locale: null,
      availableLocales: locales,
      defaultLocale,
    });
    expect(resolvedQuery).toEqual({ path: "/en?foo=bar", locale: "en" });
  });

  it("clears pending redirects", () => {
    setPendingAuthRedirect("/recipes", "nl");
    expect(getPendingAuthRedirect()).not.toBeNull();
    clearPendingAuthRedirect();
    expect(getPendingAuthRedirect()).toBeNull();
  });
});
