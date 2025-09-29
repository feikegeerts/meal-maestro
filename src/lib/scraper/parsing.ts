export function extractTitleFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split("/").filter((s) => s.length > 0);
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment || lastSegment.length < 5) {
      return null;
    }

    let title = lastSegment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();

    title = title.replace(/\.(html?|php|aspx?)$/i, "");

    if (/^[A-Z]-[A-Z]\d+/.test(title) || title.length < 8) {
      return null;
    }

    return title;
  } catch {
    return null;
  }
}
