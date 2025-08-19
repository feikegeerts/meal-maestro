import { load } from 'cheerio';
import { RecipeIngredient } from '@/types/recipe';
import { promisify } from 'util';
import { lookup } from 'dns';

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
  source: 'json-ld' | 'meta-tags' | 'html-parsing' | 'blocked' | 'failed';
  suggestions?: string[];
}

export class RecipeScraper {
  private static readonly USER_AGENT = 'MealMaestro-RecipeBot/1.0';
  private static readonly TIMEOUT_MS = 10000;
  private static readonly MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB (reduced from 5MB for security)
  private static readonly dnsLookup = promisify(lookup);
  private static readonly MAX_REDIRECTS = 3;
  private static circuitBreakerState = new Map<string, { failures: number; lastFailure: number; blockedUntil: number }>();

  static async scrapeRecipe(url: string): Promise<ScrapeResult> {
    try {
      // Validate URL
      const validatedUrl = await this.validateUrl(url);
      if (!validatedUrl) {
        return {
          success: false,
          error: 'Invalid URL format or blocked for security reasons',
          source: 'failed'
        };
      }

      // Check circuit breaker
      const domain = new URL(validatedUrl).hostname;
      if (this.isCircuitBreakerOpen(domain)) {
        return {
          success: false,
          error: 'Domain temporarily unavailable due to repeated failures',
          source: 'blocked'
        };
      }

      try {
        // Fetch page content with timeout and size limit
        const html = await this.fetchPage(validatedUrl);
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(domain);
        
        // Try extraction methods in order of reliability
        const jsonLdResult = this.extractFromJsonLd(html);
        if (jsonLdResult.success) {
          return { ...jsonLdResult, source: 'json-ld' };
        }

        const metaTagsResult = this.extractFromMetaTags(html);
        if (metaTagsResult.success) {
          return { ...metaTagsResult, source: 'meta-tags' };
        }

        const htmlParsingResult = this.extractFromHtml(html);
        if (htmlParsingResult.success) {
          return { ...htmlParsingResult, source: 'html-parsing' };
        }

        return {
          success: false,
          error: 'No recipe data found on the page',
          source: 'failed'
        };
      } catch (fetchError) {
        // Record failure in circuit breaker
        this.recordCircuitBreakerFailure(domain);
        throw fetchError;
      }

    } catch (error) {
      // Handle errors with sanitized messaging to prevent information leakage
      const urlTitle = this.extractTitleFromUrl(url);
      const suggestions = this.getSuggestionsForDomain(url);
      
      let errorMessage = this.sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown scraping error');
      let source: 'blocked' | 'failed' = 'failed';
      
      // Check if this is a blocked site (403 error)
      if (errorMessage.includes('HTTP_403_BLOCKED')) {
        source = 'blocked';
        errorMessage = 'Site blocked access - try copying the recipe manually';
      }
      
      if (urlTitle) {
        errorMessage += ` However, I found "${this.sanitizeText(urlTitle)}" in the URL.`;
      }
      
      return {
        success: false,
        error: errorMessage,
        source,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        data: urlTitle ? { title: this.sanitizeText(urlTitle), url: this.sanitizeUrl(url) } : undefined
      };
    }
  }

  private static async validateUrl(url: string): Promise<string | null> {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }

      const hostname = urlObj.hostname;
      
      // Block localhost variants (IPv4 and IPv6)
      if (
        hostname === 'localhost' ||
        hostname === '::1' ||
        hostname === '::ffff:127.0.0.1' ||
        hostname.startsWith('127.') ||
        hostname.includes('.local')
      ) {
        return null;
      }

      // Block private IP ranges
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        this.isPrivateIPRange172(hostname) ||
        this.isLinkLocalAddress(hostname)
      ) {
        return null;
      }

      // Block cloud metadata endpoints
      if (
        hostname === '169.254.169.254' ||
        hostname === 'metadata.google.internal' ||
        hostname.endsWith('.metadata.google.internal')
      ) {
        return null;
      }

      // DNS resolution validation to prevent DNS rebinding attacks
      if (!this.isIPAddress(hostname)) {
        try {
          const resolvedAddress = await this.dnsLookup(hostname);
          if (resolvedAddress && this.isPrivateOrLocalIP(resolvedAddress.address)) {
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
      ip.startsWith('127.') ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      this.isPrivateIPRange172(ip) ||
      this.isLinkLocalAddress(ip) ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip === '169.254.169.254'
    );
  }

  private static isPrivateIPRange172(hostname: string): boolean {
    const parts = hostname.split('.');
    if (parts.length !== 4 || parts[0] !== '172') {
      return false;
    }
    
    const secondOctet = parseInt(parts[1], 10);
    return !isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31;
  }

  private static isLinkLocalAddress(hostname: string): boolean {
    return hostname.startsWith('169.254.');
  }

  private static async fetchPage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error('URL does not return HTML content');
      }

      // Check content size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.MAX_SIZE_BYTES) {
        throw new Error('Page content too large');
      }

      // Use streaming to prevent memory exhaustion
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Unable to read response body');
      }

      const decoder = new TextDecoder();
      let text = '';
      let totalBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          totalBytes += value.length;
          if (totalBytes > this.MAX_SIZE_BYTES) {
            throw new Error('Page content too large');
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

  private static extractFromJsonLd(html: string): Omit<ScrapeResult, 'source'> {
    try {
      const $ = load(html);
      const jsonLdScripts = $('script[type="application/ld+json"]');
      
      for (let i = 0; i < jsonLdScripts.length; i++) {
        const scriptContent = $(jsonLdScripts[i]).html();
        if (!scriptContent) continue;

        try {
          const data = this.safeJsonParse(scriptContent);
          const recipe = this.findRecipeInJsonLd(data);
          
          if (recipe) {
            return {
              success: true,
              data: this.normalizeJsonLdRecipe(recipe as Record<string, unknown>)
            };
          }
        } catch {
          // Skip invalid JSON
          continue;
        }
      }

      return { success: false, error: 'No valid JSON-LD recipe data found' };
    } catch (error) {
      return { 
        success: false, 
        error: `JSON-LD extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static findRecipeInJsonLd(data: unknown): unknown {
    if (!data || typeof data !== 'object') return null;

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
    if (obj['@type'] === 'Recipe' || 
        (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
      return obj;
    }

    // Search nested objects
    for (const value of Object.values(obj)) {
      const recipe = this.findRecipeInJsonLd(value);
      if (recipe) return recipe;
    }

    return null;
  }

  private static normalizeJsonLdRecipe(recipe: Record<string, unknown>): ScrapedRecipeData {
    const result: ScrapedRecipeData = {};

    // Title
    if (typeof recipe.name === 'string') {
      result.title = this.sanitizeText(recipe.name);
    }

    // Ingredients
    if (Array.isArray(recipe.recipeIngredient)) {
      result.ingredients = recipe.recipeIngredient
        .filter((ing: unknown): ing is string => typeof ing === 'string')
        .map(ing => this.sanitizeText(ing))
        .filter(ing => ing.length > 0);
    }

    // Instructions/Description
    if (Array.isArray(recipe.recipeInstructions)) {
      const instructions = recipe.recipeInstructions
        .map((instruction: unknown) => {
          if (typeof instruction === 'string') return this.sanitizeText(instruction);
          if (typeof instruction === 'object' && instruction && 'text' in instruction) {
            const instructionObj = instruction as { text?: unknown };
            return typeof instructionObj.text === 'string' ? this.sanitizeText(instructionObj.text) : '';
          }
          return '';
        })
        .filter(inst => inst.length > 0);
      
      result.description = instructions.length > 0 ? instructions.join('\n\n') : undefined;
    } else if (typeof recipe.recipeInstructions === 'string') {
      result.description = this.sanitizeText(recipe.recipeInstructions);
    }

    // Servings
    if (typeof recipe.recipeYield === 'string') {
      const servings = parseInt(recipe.recipeYield);
      if (!isNaN(servings) && servings > 0) {
        result.servings = servings;
      }
    } else if (typeof recipe.recipeYield === 'number') {
      result.servings = recipe.recipeYield;
    }

    // Category/Cuisine
    if (typeof recipe.recipeCuisine === 'string') {
      result.cuisine = recipe.recipeCuisine.trim().toLowerCase();
    } else if (Array.isArray(recipe.recipeCuisine) && recipe.recipeCuisine[0]) {
      result.cuisine = String(recipe.recipeCuisine[0]).trim().toLowerCase();
    }

    if (typeof recipe.recipeCategory === 'string') {
      result.category = recipe.recipeCategory.trim().toLowerCase();
    } else if (Array.isArray(recipe.recipeCategory) && recipe.recipeCategory[0]) {
      result.category = String(recipe.recipeCategory[0]).trim().toLowerCase();
    }

    // Times
    if (typeof recipe.prepTime === 'string') {
      result.prepTime = recipe.prepTime;
    }
    if (typeof recipe.cookTime === 'string') {
      result.cookTime = recipe.cookTime;
    }
    if (typeof recipe.totalTime === 'string') {
      result.totalTime = recipe.totalTime;
    }

    // Image
    if (typeof recipe.image === 'string') {
      result.image = recipe.image;
    } else if (Array.isArray(recipe.image) && recipe.image[0]) {
      result.image = String(recipe.image[0]);
    } else if (typeof recipe.image === 'object' && recipe.image && 'url' in recipe.image) {
      const imageObj = recipe.image as { url?: unknown };
      if (typeof imageObj.url === 'string') {
        result.image = imageObj.url;
      }
    }

    return result;
  }

  private static extractFromMetaTags(html: string): Omit<ScrapeResult, 'source'> {
    try {
      const $ = load(html);
      const result: ScrapedRecipeData = {};

      // Title from various meta tags
      result.title = 
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        undefined;

      if (result.title) {
        result.title = this.sanitizeText(result.title);
      }

      // Description
      const description = 
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content');

      if (description) {
        result.description = this.sanitizeText(description);
      }

      // Image
      const image = 
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content');

      if (image) {
        result.image = image;
      }

      // Only return success if we found at least title and description
      if (result.title && result.description) {
        return { success: true, data: result };
      }

      return { success: false, error: 'Insufficient recipe data in meta tags' };
    } catch (error) {
      return { 
        success: false, 
        error: `Meta tags extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static extractFromHtml(html: string): Omit<ScrapeResult, 'source'> {
    try {
      const $ = load(html);
      const result: ScrapedRecipeData = {};

      // Title from h1 or similar
      result.title = 
        $('h1').first().text() ||
        $('.recipe-title').first().text() ||
        $('.entry-title').first().text() ||
        undefined;

      if (result.title) {
        result.title = this.sanitizeText(result.title);
      }

      // Ingredients - look for common patterns
      const ingredients: string[] = [];
      const ingredientSelectors = [
        '.recipe-ingredients li',
        '.ingredients li',
        '.recipe-ingredient',
        '[class*="ingredient"] li',
        'ul:has(li:contains("cup")):has(li:contains("tablespoon")):has(li:contains("teaspoon")) li'
      ];

      for (const selector of ingredientSelectors) {
        const found = $(selector);
        if (found.length > 2) { // At least 3 ingredients to be considered valid
          found.each((_, el) => {
            const text = this.sanitizeText($(el).text());
            if (text && text.length > 3) { // Filter out very short text
              ingredients.push(text);
            }
          });
          break; // Use first successful match
        }
      }

      if (ingredients.length > 0) {
        result.ingredients = ingredients;
      }

      // Instructions
      const instructionSelectors = [
        '.recipe-instructions',
        '.instructions',
        '.recipe-method',
        '.directions',
        '[class*="instruction"]'
      ];

      for (const selector of instructionSelectors) {
        const instructionEl = $(selector).first();
        if (instructionEl.length) {
          const text = this.sanitizeText(instructionEl.text());
          if (text && text.length > 50) { // Reasonable minimum length
            result.description = text;
            break;
          }
        }
      }

      // Servings - look for numbers near "serving" or "portion"
      const servingsText = $('body').text().toLowerCase();
      const servingsMatch = servingsText.match(/(\d+)\s*(?:serving|portion|people)/);
      if (servingsMatch) {
        const servings = parseInt(servingsMatch[1]);
        if (!isNaN(servings) && servings > 0 && servings <= 50) {
          result.servings = servings;
        }
      }

      // Only return success if we found title and at least ingredients or description
      if (result.title && (result.ingredients || result.description)) {
        return { success: true, data: result };
      }

      return { success: false, error: 'Insufficient recipe data found in HTML' };
    } catch (error) {
      return { 
        success: false, 
        error: `HTML extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static parseIngredientsToStructured(ingredients: string[]): RecipeIngredient[] {
    return ingredients.map((ingredient, index) => {
      const cleaned = ingredient.trim();
      
      // Simple regex to extract amount, unit, and name
      // Matches patterns like: "2 cups flour", "1 tablespoon olive oil", "salt to taste"
      const match = cleaned.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
      
      if (match) {
        const [, amountStr, unit, name] = match;
        let amount: number | null = null;
        
        // Parse fraction or decimal
        if (amountStr.includes('/')) {
          const [numerator, denominator] = amountStr.split('/');
          amount = parseFloat(numerator) / parseFloat(denominator);
        } else {
          amount = parseFloat(amountStr);
        }
        
        return {
          id: `ingredient-scraped-${Date.now()}-${index}`,
          name: name.trim(),
          amount: isNaN(amount) ? null : amount,
          unit: unit && unit.length > 0 ? unit.toLowerCase() : null,
          notes: ''
        };
      }
      
      // If no pattern matches, treat entire string as ingredient name
      return {
        id: `ingredient-scraped-${Date.now()}-${index}`,
        name: cleaned,
        amount: null,
        unit: null,
        notes: ''
      };
    });
  }

  private static isValidDomain(hostname: string, targetDomain: string): boolean {
    // Exact match
    if (hostname === targetDomain) {
      return true;
    }
    
    // Check if it's a valid subdomain (ends with .targetDomain)
    if (hostname.endsWith('.' + targetDomain)) {
      return true;
    }
    
    return false;
  }

  private static getSuggestionsForDomain(url: string): string[] {
    const domain = new URL(url).hostname.toLowerCase();
    
    if (this.isValidDomain(domain, 'ah.nl')) {
      return [
        'Try BBC Good Food for similar recipes',
        'Search Recipe Tin Eats for Dutch-inspired dishes',
        'Copy the recipe text manually and paste it in chat',
        'Look for the recipe title in the URL path for basic info'
      ];
    }
    
    if (this.isValidDomain(domain, 'marmiton.org')) {
      return [
        'Try BBC Good Food for French recipes',
        'Search Serious Eats for detailed French cooking techniques',
        'Copy the recipe text manually and paste it in chat'
      ];
    }
    
    if (this.isValidDomain(domain, 'chefkoch.de')) {
      return [
        'Try Food Network for German-style recipes',
        'Search Simply Recipes for hearty European dishes',
        'Copy the recipe text manually and paste it in chat'
      ];
    }
    
    // Generic suggestions for blocked sites
    return [
      'Try copying the recipe text manually and pasting it in chat',
      'Look for similar recipes on BBC Good Food or Food Network',
      'The recipe title may be visible in the URL itself'
    ];
  }

  private static extractTitleFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract the last segment of the path (usually the recipe slug)
      const segments = pathname.split('/').filter(s => s.length > 0);
      const lastSegment = segments[segments.length - 1];
      
      if (!lastSegment || lastSegment.length < 5) {
        return null;
      }
      
      // Convert URL-friendly slug to readable title
      let title = lastSegment
        .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
        .trim();
      
      // Remove common URL patterns
      title = title.replace(/\.(html?|php|aspx?)$/i, '');
      
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
        blockedUntil: now + (5 * 60 * 1000) // Block for 5 minutes
      });
    } else {
      state.failures++;
      state.lastFailure = now;
      // Exponential backoff: 5min, 15min, 30min, 1hr
      const blockDuration = Math.min(5 * 60 * 1000 * Math.pow(2, state.failures - 1), 60 * 60 * 1000);
      state.blockedUntil = now + blockDuration;
    }
  }

  private static resetCircuitBreaker(domain: string): void {
    this.circuitBreakerState.delete(domain);
  }

  private static safeJsonParse(jsonString: string): unknown {
    // Prevent ReDoS attacks by limiting input size
    if (jsonString.length > 100000) { // 100KB limit for JSON
      throw new Error('JSON too large');
    }

    // Parse JSON
    const parsed = JSON.parse(jsonString);
    
    // Sanitize to prevent prototype pollution
    return this.sanitizeObject(parsed);
  }

  private static sanitizeObject(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: Record<string, unknown> = {};
    const objRecord = obj as Record<string, unknown>;

    for (const [key, value] of Object.entries(objRecord)) {
      // Block dangerous keys that could lead to prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
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
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
      .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remove object tags
      .replace(/<embed[^>]*>/gi, '') // Remove embed tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .trim();
  }

  private static sanitizeErrorMessage(errorMessage: string): string {
    // Remove sensitive information from error messages
    const sanitized = errorMessage
      // Remove IP addresses
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_HIDDEN]')
      // Remove internal hostnames
      .replace(/\b[\w-]+\.local\b/gi, '[LOCAL_HOST]')
      .replace(/\blocalhost\b/gi, '[LOCAL_HOST]')
      // Remove internal ports
      .replace(/:\d{2,5}\b/g, '')
      // Remove file paths
      .replace(/[a-zA-Z]:\\[^\s]*/g, '[PATH_HIDDEN]')
      .replace(/\/[a-zA-Z0-9_\-\/]+/g, '[PATH_HIDDEN]')
      // Remove stack traces
      .replace(/\s+at\s+.*/g, '')
      // Remove detailed network errors
      .replace(/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET/gi, 'NETWORK_ERROR');

    // Map to user-friendly messages
    if (sanitized.includes('NETWORK_ERROR') || sanitized.includes('fetch')) {
      return 'Unable to access the website - please check the URL and try again';
    }
    if (sanitized.includes('timeout') || sanitized.includes('TIMEOUT')) {
      return 'Website took too long to respond - please try again later';
    }
    if (sanitized.includes('too large')) {
      return 'Website content is too large to process';
    }
    if (sanitized.includes('HTML content')) {
      return 'URL does not contain a valid webpage';
    }
    if (sanitized.includes('Invalid URL')) {
      return 'Please provide a valid website URL';
    }

    // Return generic message for unknown errors
    return 'Unable to process the website - please try a different URL';
  }

  private static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Only return the origin and pathname, remove sensitive query parameters
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return '[INVALID_URL]';
    }
  }
}