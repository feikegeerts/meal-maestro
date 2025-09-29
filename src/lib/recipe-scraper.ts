import { promisify } from "util";
import { lookup } from "dns";
import {
  sanitizeText as extSanitizeText,
  sanitizeUrl as extSanitizeUrl,
  sanitizeErrorMessage as extSanitizeErrorMessage,
  safeJsonParse as extSafeJsonParse,
  deepSanitizeObject as extDeepSanitizeObject,
} from "@/lib/scraper/sanitize";
import { extractTitleFromUrl as extExtractTitleFromUrl } from "@/lib/scraper/parsing";
import { getActiveStrategies } from "@/lib/scraper/strategies";
import {
  isCircuitBreakerOpen,
  recordCircuitBreakerFailure,
  resetCircuitBreaker,
} from "@/lib/scraper/circuit-breaker";
import { ScrapeResult } from "@/lib/scraper/types";

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
      if (isCircuitBreakerOpen(domain)) {
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
        resetCircuitBreaker(domain);

        // Strategy-based extraction loop
        const activeStrategies = getActiveStrategies();
        this.log("Running extraction strategies", {
          strategies: activeStrategies.map((s) => s.id),
        });

        for (const strategy of activeStrategies) {
          this.log(`Attempting strategy: ${strategy.id}`);
          const result = strategy.run(html);
          this.log(`Strategy result: ${strategy.id}`, {
            success: result.success,
            hasData: !!result.data,
          });
          if (result.success) {
            return { ...result, source: strategy.id } as ScrapeResult;
          }
        }

        this.log("All extraction strategies failed");
        return {
          success: false,
          error: "No recipe data found on the page",
          source: "failed",
        };
      } catch (fetchError) {
        // Record failure in circuit breaker
        this.log("Fetch error occurred", { error: fetchError });
        recordCircuitBreakerFailure(domain);
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
    return extExtractTitleFromUrl(url);
  }

  // Delegated sanitizer helpers (Phase 1 extraction)
  private static safeJsonParse(jsonString: string): unknown {
    return extSafeJsonParse(jsonString);
  }
  private static sanitizeObject(obj: unknown): unknown {
    return extDeepSanitizeObject(obj);
  }
  private static sanitizeText(text: string): string {
    return extSanitizeText(text);
  }
  private static sanitizeErrorMessage(errorMessage: string): string {
    return extSanitizeErrorMessage(errorMessage);
  }
  private static sanitizeUrl(url: string): string {
    return extSanitizeUrl(url);
  }
}
