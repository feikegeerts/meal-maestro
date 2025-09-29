import { load } from "cheerio";
import { ScrapedRecipeData, ExtractionResult } from "@/lib/scraper/types";
import { sanitizeText } from "@/lib/scraper/sanitize";

export function extractFromMetaTags(html: string): ExtractionResult {
  try {
    const $ = load(html);
    const result: ScrapedRecipeData = {};

    const ogTitle = $('meta[property="og:title"]').attr("content");
    const twitterTitle = $('meta[name="twitter:title"]').attr("content");
    const titleTag = $("title").text();
    result.title = ogTitle || twitterTitle || titleTag || undefined;
    if (result.title) result.title = sanitizeText(result.title);

    const ogDescription = $('meta[property="og:description"]').attr("content");
    const metaDescription = $('meta[name="description"]').attr("content");
    const twitterDescription = $('meta[name="twitter:description"]').attr(
      "content"
    );
    const description = ogDescription || metaDescription || twitterDescription;
    if (description) result.description = sanitizeText(description);

    const ogImage = $('meta[property="og:image"]').attr("content");
    const twitterImage = $('meta[name="twitter:image"]').attr("content");
    const image = ogImage || twitterImage;
    if (image) result.image = image;

    if (result.title && result.description) {
      return { success: true, data: result };
    }
    return { success: false, error: "Insufficient recipe data in meta tags" };
  } catch (error) {
    return {
      success: false,
      error: `Meta tags extraction failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
