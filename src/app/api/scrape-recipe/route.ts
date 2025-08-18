import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { RecipeScraper } from "@/lib/recipe-scraper";
import { UrlDetector } from "@/lib/url-detector";
import { usageTrackingService } from "@/lib/usage-tracking-service";

interface ScrapeRequest {
  url: string;
}

interface ScrapeResponse {
  success: boolean;
  data?: {
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
    source: 'json-ld' | 'meta-tags' | 'html-parsing';
    domainDescription?: string;
  };
  error?: string;
}

// Rate limiting - simple in-memory store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimits = rateLimitStore.get(userId);

  if (!userLimits || now > userLimits.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userLimits.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimits.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    // Check rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. Please try again in a minute." 
        },
        { status: 429 }
      );
    }

    const body: ScrapeRequest = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    
    // Validate URL format
    if (!UrlDetector.isValidUrl(trimmedUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Normalize URL to remove tracking parameters
    const normalizedUrl = UrlDetector.normalizeUrl(trimmedUrl);
    
    // Log the scraping attempt for monitoring
    console.log(`🔍 [Recipe Scraper] Attempting to scrape: ${normalizedUrl} for user ${user.id}`);

    // Perform the scraping
    const scrapeResult = await RecipeScraper.scrapeRecipe(normalizedUrl);

    // Log usage for monitoring (treating scraping as a lightweight operation)
    const usageLog = await usageTrackingService.logUsage(
      user.id,
      '/api/scrape-recipe',
      {
        model: 'scraper',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    );

    if (!usageLog.success) {
      console.warn('🟡 [Scraper] Failed to log usage:', usageLog.error);
    }

    if (!scrapeResult.success) {
      console.warn(`🟡 [Recipe Scraper] Failed to scrape ${normalizedUrl}: ${scrapeResult.error}`);
      return NextResponse.json({
        success: false,
        error: scrapeResult.error || 'Failed to extract recipe data from the provided URL'
      }, { status: 422 });
    }

    // Enhance the response with additional metadata
    const response: ScrapeResponse = {
      success: true,
      data: {
        ...scrapeResult.data,
        source: scrapeResult.source as 'json-ld' | 'meta-tags' | 'html-parsing',
        url: normalizedUrl,
        domainDescription: UrlDetector.getDomainDescription(normalizedUrl)
      }
    };

    console.log(`✅ [Recipe Scraper] Successfully scraped recipe from ${normalizedUrl} using ${scrapeResult.source}`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("🔴 [Recipe Scraper] API error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return NextResponse.json(
          { success: false, error: "Request timeout - the website took too long to respond" },
          { status: 408 }
        );
      }

      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { success: false, error: "Failed to fetch the webpage. Please check the URL and try again." },
          { status: 502 }
        );
      }

      if (error.message.includes('too large')) {
        return NextResponse.json(
          { success: false, error: "The webpage is too large to process" },
          { status: 413 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Internal server error while scraping recipe" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to scrape a recipe." },
    { status: 405 }
  );
}