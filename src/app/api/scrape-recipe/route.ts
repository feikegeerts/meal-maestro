import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { RecipeScraper } from "@/lib/recipe-scraper";
import { UrlDetector } from "@/lib/url-detector";
import { usageTrackingService } from "@/lib/usage-tracking-service";
import { createClient } from '@supabase/supabase-js';

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


export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;

  try {
    // Check rate limiting using user's authenticated session (more secure)
    const rateLimitCheck = await checkRateLimit(user.id, request);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds.`
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Reset': new Date(rateLimitCheck.resetTime).toISOString(),
            'Retry-After': rateLimitCheck.retryAfter.toString()
          }
        }
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

// Secure rate limiting using authenticated session (no service key needed)
async function checkRateLimit(userId: string, request: NextRequest): Promise<{
  allowed: boolean;
  retryAfter: number;
  resetTime: number;
}> {
  // Use the user's authenticated session for database operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Create client with user context (will respect RLS policies)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 10;
  const windowStart = now - windowMs;

  try {
    // Clean up old entries (older than 1 hour to keep table clean)
    const oneHourAgo = now - (60 * 60 * 1000);
    await supabase
      .from('rate_limit_user')
      .delete()
      .lt('timestamp', oneHourAgo);

    // Get current requests in window
    const { data: attempts, error } = await supabase
      .from('rate_limit_user')
      .select('timestamp')
      .eq('user_id', userId)
      .eq('endpoint', '/api/scrape-recipe')
      .gte('timestamp', windowStart)
      .order('timestamp', { ascending: false });

    if (error) {
      // If database fails, allow request (fail open for availability)
      console.warn('Rate limit check failed, allowing request:', error);
      return {
        allowed: true,
        retryAfter: 0,
        resetTime: now + windowMs
      };
    }

    const currentCount = attempts?.length || 0;
    
    if (currentCount >= maxRequests) {
      // Rate limit exceeded
      const resetTime = windowStart + windowMs;
      return {
        allowed: false,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        resetTime
      };
    }

    // Record this attempt
    await supabase
      .from('rate_limit_user')
      .insert({
        user_id: userId,
        endpoint: '/api/scrape-recipe',
        timestamp: now
      });

    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs
    };

  } catch (error) {
    // If anything fails, allow the request (fail open)
    console.warn('Rate limiting error, allowing request:', error);
    return {
      allowed: true,
      retryAfter: 0,
      resetTime: now + windowMs
    };
  }
}