import { load } from "cheerio";
import { ScrapedRecipeData, ExtractionResult } from "@/lib/scraper/types";
import { sanitizeText } from "@/lib/scraper/sanitize";

export function extractFromText(html: string): ExtractionResult {
  try {
    const $ = load(html);

    $(
      "script, style, nav, header, footer, .nav, .navbar, .header, .footer, " +
        ".advertisement, .ad, .ads, .sidebar, .widget, .popup, .modal, " +
        ".social, .share, .comment, .comments, .related, .suggested, " +
        ".breadcrumb, .pagination, .tags, .categories, .author-info, " +
        ".newsletter, .subscription, .cookie, .gdpr, .privacy"
    ).remove();

    const mainContentSelectors = [
      "main",
      ".main",
      ".content",
      ".entry-content",
      ".post-content",
      ".article-content",
      ".recipe-content",
      "article",
      ".recipe",
      '[role="main"]',
    ];

    let contentElement = $("body");
    for (const selector of mainContentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        contentElement = element as typeof contentElement;
        break;
      }
    }

    let textContent = contentElement.text();
    textContent = textContent
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    if (textContent.length < 100) {
      return { success: false, error: "Not enough text content found" };
    }

    const title = $("h1").first().text() || $("title").first().text() || "";
    const cleanTitle = sanitizeText(title);

    const result: ScrapedRecipeData = {
      title: cleanTitle || undefined,
      description: textContent,
    };

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: `Text extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
