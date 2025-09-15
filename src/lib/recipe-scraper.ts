import { load } from "cheerio";
import { RecipeIngredient } from "@/types/recipe";
import { promisify } from "util";
import { lookup } from "dns";

export interface ScrapedRecipeData {
  title?: string;
  ingredients?: string[];
  description?: string;
  category?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  cuisine?: string;
  image?: string;
  url?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedRecipeData;
  error?: string;
  source:
    | "json-ld"
    | "meta-tags"
    | "html-parsing"
    | "text-extraction"
    | "blocked"
    | "failed";
  suggestions?: string[];
}

export class RecipeScraper {
  private static debug =
    process.env.NODE_ENV === "development" ||
    process.env.RECIPE_SCRAPER_DEBUG === "true";

  private static log(message: string, data?: unknown) {
    if (this.debug) {
      console.log(`[RecipeScraper] ${message}`, data || "");
    }
  }
  private static readonly USER_AGENT = "MealMaestro-RecipeBot/1.0";
  private static readonly TIMEOUT_MS = 8000; // Reduce to 8s to allow time for AI processing
  private static readonly MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB (reduced from 5MB for security)
  private static readonly dnsLookup = promisify(lookup);
  private static readonly MAX_REDIRECTS = 3;
  private static circuitBreakerState = new Map<
    string,
    { failures: number; lastFailure: number; blockedUntil: number }
  >();

  static async scrapeRecipe(url: string): Promise<ScrapeResult> {
    this.log("Starting recipe scrape", { url });
    try {
      // Validate URL
      this.log("Validating URL...");
      const validatedUrl = await this.validateUrl(url);
      if (!validatedUrl) {
        this.log("URL validation failed", { original: url });
        return {
          success: false,
          error: "Invalid URL format or blocked for security reasons",
          source: "failed",
        };
      }

      this.log("URL validated successfully", { validatedUrl });

      // Check circuit breaker
      const domain = new URL(validatedUrl).hostname;
      this.log("Checking circuit breaker", { domain });
      if (this.isCircuitBreakerOpen(domain)) {
        this.log("Circuit breaker is open", { domain });
        return {
          success: false,
          error: "Domain temporarily unavailable due to repeated failures",
          source: "blocked",
        };
      }

      try {
        // Fetch page content with timeout and size limit
        this.log("Fetching page content...");
        const html = await this.fetchPage(validatedUrl);
        this.log("Page content fetched", {
          htmlLength: html.length,
          htmlPreview: html.substring(0, 200) + "...",
        });

        // Reset circuit breaker on success
        this.resetCircuitBreaker(domain);

        // Try extraction methods in order of reliability
        this.log("Attempting JSON-LD extraction...");
        const jsonLdResult = this.extractFromJsonLd(html);
        this.log("JSON-LD extraction result", {
          success: jsonLdResult.success,
          data: jsonLdResult.data,
        });
        if (jsonLdResult.success) {
          this.log("JSON-LD extraction successful, returning result");
          return { ...jsonLdResult, source: "json-ld" };
        }

        // Skip meta tags and HTML parsing, go straight to text extraction
        this.log("Attempting text-only extraction...");
        const textResult = this.extractFromText(html);
        this.log("Text extraction result", {
          success: textResult.success,
          data: textResult.data,
        });
        if (textResult.success) {
          this.log("Text extraction successful, returning result");
          return { ...textResult, source: "text-extraction" };
        }

        // Fallback to meta tags if text extraction fails
        this.log("Attempting meta tags extraction as fallback...");
        const metaTagsResult = this.extractFromMetaTags(html);
        this.log("Meta tags extraction result", {
          success: metaTagsResult.success,
          data: metaTagsResult.data,
        });
        if (metaTagsResult.success) {
          this.log("Meta tags extraction successful, returning result");
          return { ...metaTagsResult, source: "meta-tags" };
        }

        this.log("All extraction methods failed");
        return {
          success: false,
          error: "No recipe data found on the page",
          source: "failed",
        };
      } catch (fetchError) {
        // Record failure in circuit breaker
        this.log("Fetch error occurred", { error: fetchError });
        this.recordCircuitBreakerFailure(domain);
        throw fetchError;
      }
    } catch (error) {
      // Handle errors with sanitized messaging to prevent information leakage
      this.log("Error in scrapeRecipe", { error, url });
      const urlTitle = this.extractTitleFromUrl(url);
      this.log("Extracted URL title", { urlTitle });
      const suggestions = this.getSuggestionsForDomain(url);

      let errorMessage = this.sanitizeErrorMessage(
        error instanceof Error ? error.message : "Unknown scraping error"
      );
      let source: "blocked" | "failed" = "failed";

      // Check if this is a blocked site (403 error)
      if (errorMessage.includes("HTTP_403_BLOCKED")) {
        source = "blocked";
        errorMessage = "Site blocked access - try copying the recipe manually";
      }

      if (urlTitle) {
        errorMessage += ` However, I found "${this.sanitizeText(
          urlTitle
        )}" in the URL.`;
      }

      return {
        success: false,
        error: errorMessage,
        source,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        data: urlTitle
          ? { title: this.sanitizeText(urlTitle), url: this.sanitizeUrl(url) }
          : undefined,
      };
    }
  }

  private static async validateUrl(url: string): Promise<string | null> {
    try {
      const urlObj = new URL(url);

      // Only allow HTTP/HTTPS
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return null;
      }

      const hostname = urlObj.hostname;

      // Block localhost variants (IPv4 and IPv6)
      if (
        hostname === "localhost" ||
        hostname === "::1" ||
        hostname === "::ffff:127.0.0.1" ||
        hostname.startsWith("127.") ||
        hostname.includes(".local")
      ) {
        return null;
      }

      // Block private IP ranges
      if (
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        this.isPrivateIPRange172(hostname) ||
        this.isLinkLocalAddress(hostname)
      ) {
        return null;
      }

      // Block cloud metadata endpoints
      if (
        hostname === "169.254.169.254" ||
        hostname === "metadata.google.internal" ||
        hostname.endsWith(".metadata.google.internal")
      ) {
        return null;
      }

      // DNS resolution validation to prevent DNS rebinding attacks
      if (!this.isIPAddress(hostname)) {
        try {
          const resolvedAddress = await this.dnsLookup(hostname);
          if (
            resolvedAddress &&
            this.isPrivateOrLocalIP(resolvedAddress.address)
          ) {
            return null;
          }
        } catch {
          // DNS resolution failed, allow it to fail naturally in fetch
        }
      } else {
        // Direct IP access - validate the IP itself
        if (this.isPrivateOrLocalIP(hostname)) {
          return null;
        }
      }

      return urlObj.toString();
    } catch {
      return null;
    }
  }

  private static isIPAddress(hostname: string): boolean {
    // Simple IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // Simple IPv6 regex (basic check)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
  }

  private static isPrivateOrLocalIP(ip: string): boolean {
    // Check for private/local IP ranges
    return (
      ip.startsWith("127.") ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      this.isPrivateIPRange172(ip) ||
      this.isLinkLocalAddress(ip) ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      ip === "169.254.169.254"
    );
  }

  private static isPrivateIPRange172(hostname: string): boolean {
    const parts = hostname.split(".");
    if (parts.length !== 4 || parts[0] !== "172") {
      return false;
    }

    const secondOctet = parseInt(parts[1], 10);
    return !isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31;
  }

  private static isLinkLocalAddress(hostname: string): boolean {
    return hostname.startsWith("169.254.");
  }

  private static async fetchPage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": this.USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`HTTP_403_BLOCKED:${response.statusText}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        throw new Error("URL does not return HTML content");
      }

      // Check content size
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > this.MAX_SIZE_BYTES) {
        throw new Error("Page content too large");
      }

      // Use streaming to prevent memory exhaustion
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Unable to read response body");
      }

      const decoder = new TextDecoder();
      let text = "";
      let totalBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          totalBytes += value.length;
          if (totalBytes > this.MAX_SIZE_BYTES) {
            throw new Error("Page content too large");
          }

          text += decoder.decode(value, { stream: true });
        }

        // Final decode call
        text += decoder.decode();

        return text;
      } finally {
        reader.releaseLock();
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static extractFromJsonLd(html: string): Omit<ScrapeResult, "source"> {
    try {
      const $ = load(html);
      const jsonLdScripts = $('script[type="application/ld+json"]');
      this.log("Found JSON-LD scripts", { count: jsonLdScripts.length });

      for (let i = 0; i < jsonLdScripts.length; i++) {
        const scriptContent = $(jsonLdScripts[i]).html();
        this.log(`Processing JSON-LD script ${i + 1}`, {
          contentPreview: scriptContent?.substring(0, 200),
        });
        if (!scriptContent) continue;

        try {
          const data = this.safeJsonParse(scriptContent);
          this.log("Parsed JSON-LD data", { data });
          const recipe = this.findRecipeInJsonLd(data);
          this.log("Found recipe in JSON-LD", { found: !!recipe, recipe });

          if (recipe) {
            const normalized = this.normalizeJsonLdRecipe(
              recipe as Record<string, unknown>
            );
            this.log("Normalized JSON-LD recipe", { normalized });
            return {
              success: true,
              data: normalized,
            };
          }
        } catch (parseError) {
          // Skip invalid JSON
          this.log("Failed to parse JSON-LD script", {
            error: parseError,
            scriptContent: scriptContent.substring(0, 100),
          });
          continue;
        }
      }

      return { success: false, error: "No valid JSON-LD recipe data found" };
    } catch (error) {
      return {
        success: false,
        error: `JSON-LD extraction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  private static findRecipeInJsonLd(data: unknown): unknown {
    if (!data || typeof data !== "object") return null;

    // Handle arrays
    if (Array.isArray(data)) {
      for (const item of data) {
        const recipe = this.findRecipeInJsonLd(item);
        if (recipe) return recipe;
      }
      return null;
    }

    const obj = data as Record<string, unknown>;

    // Check if current object is a recipe
    if (
      obj["@type"] === "Recipe" ||
      (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe"))
    ) {
      return obj;
    }

    // Search nested objects
    for (const value of Object.values(obj)) {
      const recipe = this.findRecipeInJsonLd(value);
      if (recipe) return recipe;
    }

    return null;
  }

  private static normalizeJsonLdRecipe(
    recipe: Record<string, unknown>
  ): ScrapedRecipeData {
    const result: ScrapedRecipeData = {};

    // Title
    if (typeof recipe.name === "string") {
      result.title = this.sanitizeText(recipe.name);
    }

    // Ingredients
    if (Array.isArray(recipe.recipeIngredient)) {
      result.ingredients = recipe.recipeIngredient
        .filter((ing: unknown): ing is string => typeof ing === "string")
        .map((ing) => this.sanitizeText(ing))
        .filter((ing) => ing.length > 0);
    }

    // Instructions/Description
    if (Array.isArray(recipe.recipeInstructions)) {
      const instructions = recipe.recipeInstructions
        .map((instruction: unknown) => {
          if (typeof instruction === "string")
            return this.sanitizeText(instruction);
          if (
            typeof instruction === "object" &&
            instruction &&
            "text" in instruction
          ) {
            const instructionObj = instruction as { text?: unknown };
            return typeof instructionObj.text === "string"
              ? this.sanitizeText(instructionObj.text)
              : "";
          }
          return "";
        })
        .filter((inst) => inst.length > 0);

      result.description =
        instructions.length > 0 ? instructions.join("\n\n") : undefined;
    } else if (typeof recipe.recipeInstructions === "string") {
      result.description = this.sanitizeText(recipe.recipeInstructions);
    }

    // Servings
    if (typeof recipe.recipeYield === "string") {
      const servings = parseInt(recipe.recipeYield);
      if (!isNaN(servings) && servings > 0) {
        result.servings = servings;
      }
    } else if (typeof recipe.recipeYield === "number") {
      result.servings = recipe.recipeYield;
    }

    // Category/Cuisine
    if (typeof recipe.recipeCuisine === "string") {
      result.cuisine = recipe.recipeCuisine.trim().toLowerCase();
    } else if (Array.isArray(recipe.recipeCuisine) && recipe.recipeCuisine[0]) {
      result.cuisine = String(recipe.recipeCuisine[0]).trim().toLowerCase();
    }

    if (typeof recipe.recipeCategory === "string") {
      result.category = recipe.recipeCategory.trim().toLowerCase();
    } else if (
      Array.isArray(recipe.recipeCategory) &&
      recipe.recipeCategory[0]
    ) {
      result.category = String(recipe.recipeCategory[0]).trim().toLowerCase();
    }

    // Times
    if (typeof recipe.prepTime === "string") {
      result.prepTime = recipe.prepTime;
    }
    if (typeof recipe.cookTime === "string") {
      result.cookTime = recipe.cookTime;
    }
    if (typeof recipe.totalTime === "string") {
      result.totalTime = recipe.totalTime;
    }

    // Image
    if (typeof recipe.image === "string") {
      result.image = recipe.image;
    } else if (Array.isArray(recipe.image) && recipe.image[0]) {
      result.image = String(recipe.image[0]);
    } else if (
      typeof recipe.image === "object" &&
      recipe.image &&
      "url" in recipe.image
    ) {
      const imageObj = recipe.image as { url?: unknown };
      if (typeof imageObj.url === "string") {
        result.image = imageObj.url;
      }
    }

    return result;
  }

  private static extractFromMetaTags(
    html: string
  ): Omit<ScrapeResult, "source"> {
    try {
      const $ = load(html);
      const result: ScrapedRecipeData = {};
      this.log("Starting meta tags extraction");

      // Title from various meta tags
      const ogTitle = $('meta[property="og:title"]').attr("content");
      const twitterTitle = $('meta[name="twitter:title"]').attr("content");
      const titleTag = $("title").text();

      this.log("Meta tag titles found", { ogTitle, twitterTitle, titleTag });

      result.title = ogTitle || twitterTitle || titleTag || undefined;

      if (result.title) {
        result.title = this.sanitizeText(result.title);
      }

      // Description
      const ogDescription = $('meta[property="og:description"]').attr(
        "content"
      );
      const metaDescription = $('meta[name="description"]').attr("content");
      const twitterDescription = $('meta[name="twitter:description"]').attr(
        "content"
      );

      this.log("Meta tag descriptions found", {
        ogDescription,
        metaDescription,
        twitterDescription,
      });

      const description =
        ogDescription || metaDescription || twitterDescription;

      if (description) {
        result.description = this.sanitizeText(description);
      }

      // Image
      const ogImage = $('meta[property="og:image"]').attr("content");
      const twitterImage = $('meta[name="twitter:image"]').attr("content");

      this.log("Meta tag images found", { ogImage, twitterImage });

      const image = ogImage || twitterImage;

      if (image) {
        result.image = image;
      }

      // Only return success if we found at least title and description
      this.log("Meta tags extraction complete", {
        result,
        hasTitle: !!result.title,
        hasDescription: !!result.description,
      });
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

  private static extractFromText(html: string): Omit<ScrapeResult, "source"> {
    try {
      const $ = load(html);
      this.log("Starting text-only extraction");

      // Remove unwanted elements that add noise
      $(
        "script, style, nav, header, footer, .nav, .navbar, .header, .footer, " +
          ".advertisement, .ad, .ads, .sidebar, .widget, .popup, .modal, " +
          ".social, .share, .comment, .comments, .related, .suggested, " +
          ".breadcrumb, .pagination, .tags, .categories, .author-info, " +
          ".newsletter, .subscription, .cookie, .gdpr, .privacy"
      ).remove();

      this.log("Removed noise elements from HTML");

      // Get the main content area if it exists, otherwise use body
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
          // Cheerio types: the result of $(selector) is Cheerio<Element>, which is compatible with the variable usage
          // We cast to typeof contentElement to keep consistent type without resorting to 'any'
          contentElement = element as typeof contentElement; // Type assertion for Cheerio compatibility
          this.log(`Using content selector: ${selector}`);
          break;
        }
      }

      // Extract clean text content
      let textContent = contentElement.text();

      // Clean up the text
      textContent = textContent
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, "\n") // Remove excessive line breaks
        .trim();

      this.log("Extracted text content", {
        textLength: textContent.length,
        textPreview: textContent.substring(0, 300) + "...",
      });

      if (textContent.length < 100) {
        return { success: false, error: "Not enough text content found" };
      }

      // Try to extract a title from h1 or title tags
      const title = $("h1").first().text() || $("title").first().text() || "";
      const cleanTitle = this.sanitizeText(title);

      // Return the raw text content - let AI process it
      const result: ScrapedRecipeData = {
        title: cleanTitle || undefined,
        description: textContent, // Send all text as description for AI processing
        // Let AI extract ingredients from the text content
      };

      this.log("Text extraction complete", {
        hasTitle: !!result.title,
        descriptionLength: result.description?.length || 0,
      });

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

  private static extractFromHtml(html: string): Omit<ScrapeResult, "source"> {
    try {
      const $ = load(html);
      const result: ScrapedRecipeData = {};
      this.log("Starting HTML parsing extraction");

      // Title from h1 or similar
      const h1Title = $("h1").first().text();
      const recipeTitle = $(".recipe-title").first().text();
      const entryTitle = $(".entry-title").first().text();

      this.log("HTML titles found", { h1Title, recipeTitle, entryTitle });

      result.title = h1Title || recipeTitle || entryTitle || undefined;

      if (result.title) {
        result.title = this.sanitizeText(result.title);
      }

      // MORE AGGRESSIVE INGREDIENT EXTRACTION
      const ingredients: string[] = [];

      // Expanded ingredient selectors with more patterns
      const ingredientSelectors = [
        ".recipe-ingredients li",
        ".ingredients li",
        ".recipe-ingredient",
        '[class*="ingredient"] li',
        '[class*="ingredi"] li', // partial match
        'ul:has(li:contains("gr")) li', // Dutch weight units
        'ul:has(li:contains("eetlepel")) li', // Dutch tablespoon
        'ul:has(li:contains("theelepel")) li', // Dutch teaspoon
        'ul:has(li:contains("ml")) li', // ml units
        'ul:has(li:contains("cup")) li', // English units
        'ul:has(li:contains("tablespoon")) li',
        'ul:has(li:contains("teaspoon")) li',
        // More generic patterns
        'ul li:contains("gr")', // Any li with weight
        'ul li:contains("ml")', // Any li with volume
        'ul li:contains("eetlepel")', // Any li with Dutch tbsp
        'ul li:contains("theelepel")', // Any li with Dutch tsp
        'li:contains("gr")', // Very broad - any li with grams
        'li:contains("ml")', // Very broad - any li with ml
        'li:contains("eetlepel")', // Very broad - any li with tbsp
      ];

      for (const selector of ingredientSelectors) {
        const found = $(selector);
        this.log(`Trying ingredient selector: ${selector}`, {
          foundCount: found.length,
        });

        if (found.length >= 2) {
          // Lowered threshold to 2 ingredients
          this.log(`Using ingredient selector: ${selector}`, {
            count: found.length,
          });
          const foundIngredients: string[] = [];

          found.each((_, el) => {
            const text = this.sanitizeText($(el).text());
            if (text && text.length > 2) {
              // Lowered minimum length
              foundIngredients.push(text);
            }
          });

          // Only use this selector if we found substantial ingredients
          if (foundIngredients.length >= 2) {
            ingredients.push(...foundIngredients);
            this.log(
              `Found ${foundIngredients.length} ingredients with selector: ${selector}`,
              { ingredients: foundIngredients }
            );
            break; // Use first successful match
          }
        }
      }

      // FALLBACK: If no structured ingredients found, look for text patterns
      if (ingredients.length === 0) {
        this.log(
          "No structured ingredients found, trying text pattern matching"
        );

        // Look for ingredient-like patterns in the entire page text
        const bodyText = $("body").text();
        const lines = bodyText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        for (const line of lines) {
          // Look for lines that contain measurement units (Dutch and English)
          if (
            /\d+\s*(gr|gram|ml|liter|eetlepel|theelepel|tbsp|tsp|cup|oz|pound|kg)\s+/i.test(
              line
            )
          ) {
            const cleanLine = this.sanitizeText(line);
            if (cleanLine.length > 5 && cleanLine.length < 200) {
              // Reasonable ingredient length
              ingredients.push(cleanLine);
            }
          }
        }

        this.log(
          `Text pattern matching found ${ingredients.length} potential ingredients`,
          { ingredients }
        );
      }

      if (ingredients.length > 0) {
        // Remove duplicates and very similar ingredients
        result.ingredients = [...new Set(ingredients)];
      }

      // MORE AGGRESSIVE INSTRUCTION EXTRACTION
      const instructionSelectors = [
        ".recipe-instructions",
        ".instructions",
        ".recipe-method",
        ".directions",
        '[class*="instruction"]',
        '[class*="method"]',
        '[class*="direction"]',
        '[class*="preparation"]',
        '[class*="bereiding"]', // Dutch for preparation
        ".recipe-content",
        ".entry-content",
        ".content",
      ];

      let foundInstructions = false;
      for (const selector of instructionSelectors) {
        const instructionEl = $(selector).first();
        this.log(`Trying instruction selector: ${selector}`, {
          found: instructionEl.length > 0,
        });
        if (instructionEl.length) {
          const text = this.sanitizeText(instructionEl.text());
          this.log(`Instruction text found`, {
            selector,
            textLength: text.length,
            textPreview: text.substring(0, 200),
          });
          if (text && text.length > 30) {
            // Lowered minimum length
            result.description = text;
            this.log(`Using instructions from selector: ${selector}`);
            foundInstructions = true;
            break;
          }
        }
      }

      // FALLBACK: If no structured instructions, extract larger text blocks
      if (!foundInstructions) {
        this.log("No structured instructions found, looking for text blocks");

        // Look for paragraphs or divs with substantial text content
        const textElements = $("p, div").filter((_, el) => {
          const text = $(el).text().trim();
          return text.length > 100 && text.length < 2000; // Reasonable instruction length
        });

        let bestText = "";
        textElements.each((_, el) => {
          const text = this.sanitizeText($(el).text());
          if (text.length > bestText.length) {
            bestText = text;
          }
        });

        if (bestText.length > 50) {
          result.description = bestText;
          this.log("Using fallback text block as instructions", {
            textLength: bestText.length,
          });
        }
      }

      // Servings - look for numbers near "serving" or "portion" (Dutch and English)
      const servingsText = $("body").text().toLowerCase();
      const servingsMatch = servingsText.match(
        /(\d+)\s*(?:serving|portion|people|personen|porties?)/
      );
      if (servingsMatch) {
        const servings = parseInt(servingsMatch[1]);
        if (!isNaN(servings) && servings > 0 && servings <= 50) {
          result.servings = servings;
        }
      }

      // MUCH MORE PERMISSIVE SUCCESS CRITERIA
      this.log("HTML parsing extraction complete", {
        result,
        hasTitle: !!result.title,
        hasIngredients: !!result.ingredients,
        ingredientsCount: result.ingredients?.length || 0,
        hasDescription: !!result.description,
        descriptionLength: result.description?.length || 0,
      });

      // Success if we have title OR ingredients OR description (much more permissive)
      if (result.title || result.ingredients?.length || result.description) {
        return { success: true, data: result };
      }

      return { success: false, error: "No recipe content found in HTML" };
    } catch (error) {
      return {
        success: false,
        error: `HTML extraction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  static parseIngredientsToStructured(
    ingredients: string[]
  ): RecipeIngredient[] {
    return ingredients.map((ingredient, index) => {
      const cleaned = ingredient.trim();

      // Simple regex to extract amount, unit, and name
      // Matches patterns like: "2 cups flour", "1 tablespoon olive oil", "salt to taste"
      const match = cleaned.match(
        /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/
      );

      if (match) {
        const [, amountStr, unit, name] = match;
        let amount: number | null = null;

        // Parse fraction or decimal
        if (amountStr.includes("/")) {
          const [numerator, denominator] = amountStr.split("/");
          amount = parseFloat(numerator) / parseFloat(denominator);
        } else {
          amount = parseFloat(amountStr);
        }

        return {
          id: `ingredient-scraped-${Date.now()}-${index}`,
          name: name.trim(),
          amount: isNaN(amount) ? null : amount,
          unit: unit && unit.length > 0 ? unit.toLowerCase() : null,
          notes: "",
        };
      }

      // If no pattern matches, treat entire string as ingredient name
      return {
        id: `ingredient-scraped-${Date.now()}-${index}`,
        name: cleaned,
        amount: null,
        unit: null,
        notes: "",
      };
    });
  }

  private static isValidDomain(
    hostname: string,
    targetDomain: string
  ): boolean {
    // Exact match
    if (hostname === targetDomain) {
      return true;
    }

    // Check if it's a valid subdomain (ends with .targetDomain)
    if (hostname.endsWith("." + targetDomain)) {
      return true;
    }

    return false;
  }

  private static getSuggestionsForDomain(url: string): string[] {
    const domain = new URL(url).hostname.toLowerCase();

    if (this.isValidDomain(domain, "ah.nl")) {
      return [
        "Try BBC Good Food for similar recipes",
        "Search Recipe Tin Eats for Dutch-inspired dishes",
        "Copy the recipe text manually and paste it in chat",
        "Look for the recipe title in the URL path for basic info",
      ];
    }

    if (this.isValidDomain(domain, "marmiton.org")) {
      return [
        "Try BBC Good Food for French recipes",
        "Search Serious Eats for detailed French cooking techniques",
        "Copy the recipe text manually and paste it in chat",
      ];
    }

    if (this.isValidDomain(domain, "chefkoch.de")) {
      return [
        "Try Food Network for German-style recipes",
        "Search Simply Recipes for hearty European dishes",
        "Copy the recipe text manually and paste it in chat",
      ];
    }

    // Generic suggestions for blocked sites
    return [
      "Try copying the recipe text manually and pasting it in chat",
      "Look for similar recipes on BBC Good Food or Food Network",
      "The recipe title may be visible in the URL itself",
    ];
  }

  private static extractTitleFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Extract the last segment of the path (usually the recipe slug)
      const segments = pathname.split("/").filter((s) => s.length > 0);
      const lastSegment = segments[segments.length - 1];

      if (!lastSegment || lastSegment.length < 5) {
        return null;
      }

      // Convert URL-friendly slug to readable title
      let title = lastSegment
        .replace(/[-_]/g, " ") // Replace hyphens and underscores with spaces
        .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize first letter of each word
        .trim();

      // Remove common URL patterns
      title = title.replace(/\.(html?|php|aspx?)$/i, "");

      // If it looks like a recipe ID or is too short, return null
      if (/^[A-Z]-[A-Z]\d+/.test(title) || title.length < 8) {
        return null;
      }

      return title;
    } catch {
      return null;
    }
  }

  private static isCircuitBreakerOpen(domain: string): boolean {
    const state = this.circuitBreakerState.get(domain);
    if (!state) return false;

    const now = Date.now();

    // If block period has expired, reset
    if (now > state.blockedUntil) {
      this.circuitBreakerState.delete(domain);
      return false;
    }

    return state.failures >= 3; // Block after 3 failures
  }

  private static recordCircuitBreakerFailure(domain: string): void {
    const now = Date.now();
    const state = this.circuitBreakerState.get(domain);

    if (!state) {
      this.circuitBreakerState.set(domain, {
        failures: 1,
        lastFailure: now,
        blockedUntil: now + 5 * 60 * 1000, // Block for 5 minutes
      });
    } else {
      state.failures++;
      state.lastFailure = now;
      // Exponential backoff: 5min, 15min, 30min, 1hr
      const blockDuration = Math.min(
        5 * 60 * 1000 * Math.pow(2, state.failures - 1),
        60 * 60 * 1000
      );
      state.blockedUntil = now + blockDuration;
    }
  }

  private static resetCircuitBreaker(domain: string): void {
    this.circuitBreakerState.delete(domain);
  }

  private static safeJsonParse(jsonString: string): unknown {
    // Prevent ReDoS attacks by limiting input size
    if (jsonString.length > 100000) {
      // 100KB limit for JSON
      throw new Error("JSON too large");
    }

    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Sanitize to prevent prototype pollution
    return this.sanitizeObject(parsed);
  }

  private static sanitizeObject(obj: unknown): unknown {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;

    for (const [key, value] of Object.entries(objRecord)) {
      // Block dangerous keys that could lead to prototype pollution
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  private static sanitizeText(text: string): string {
    // Remove potential XSS vectors while preserving recipe content
    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "") // Remove iframe tags
      .replace(/<object[^>]*>.*?<\/object>/gi, "") // Remove object tags
      .replace(/<embed[^>]*>/gi, "") // Remove embed tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/data:text\/html/gi, "") // Remove data URLs
      .trim();
  }

  private static sanitizeErrorMessage(errorMessage: string): string {
    // Preserve HTTP_403_BLOCKED marker for later processing
    if (errorMessage.includes("HTTP_403_BLOCKED")) {
      return errorMessage;
    }

    // Remove sensitive information from error messages
    const sanitized = errorMessage
      // Remove IP addresses
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP_HIDDEN]")
      // Remove internal hostnames
      .replace(/\b[\w-]+\.local\b/gi, "[LOCAL_HOST]")
      .replace(/\blocalhost\b/gi, "[LOCAL_HOST]")
      // Remove internal ports
      .replace(/:\d{2,5}\b/g, "")
      // Remove file paths
      .replace(/[a-zA-Z]:\\[^\s]*/g, "[PATH_HIDDEN]")
      .replace(/\/[a-zA-Z0-9_\-\/]+/g, "[PATH_HIDDEN]")
      // Remove stack traces
      .replace(/\s+at\s+.*/g, "")
      // Remove detailed network errors
      .replace(
        /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET/gi,
        "NETWORK_ERROR"
      );

    // Map to user-friendly messages
    if (sanitized.includes("NETWORK_ERROR") || sanitized.includes("fetch")) {
      return "Unable to access the website - please check the URL and try again";
    }
    if (sanitized.includes("timeout") || sanitized.includes("TIMEOUT")) {
      return "Website took too long to respond - please try again later";
    }
    if (sanitized.includes("too large")) {
      return "Website content is too large to process";
    }
    if (sanitized.includes("HTML content")) {
      return "URL does not contain a valid webpage";
    }
    if (sanitized.includes("Invalid URL")) {
      return "Please provide a valid website URL";
    }

    // Return generic message for unknown errors
    return "Unable to process the website - please try a different URL";
  }

  private static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Only return the origin and pathname, remove sensitive query parameters
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return "[INVALID_URL]";
    }
  }
}
