import { load } from 'cheerio';
import { RecipeIngredient } from '@/types/recipe';

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
  private static readonly MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  static async scrapeRecipe(url: string): Promise<ScrapeResult> {
    try {
      // Validate URL
      const validatedUrl = this.validateUrl(url);
      if (!validatedUrl) {
        return {
          success: false,
          error: 'Invalid URL format',
          source: 'failed'
        };
      }

      // Fetch page content with timeout and size limit
      const html = await this.fetchPage(validatedUrl);
      
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

    } catch (error) {
      // Handle errors with enhanced messaging and URL title extraction
      const urlTitle = this.extractTitleFromUrl(url);
      const suggestions = this.getSuggestionsForDomain(url);
      
      let errorMessage = error instanceof Error ? error.message : 'Unknown scraping error';
      let source: 'blocked' | 'failed' = 'failed';
      
      // Check if this is a blocked site (403 error)
      if (errorMessage.includes('HTTP_403_BLOCKED')) {
        source = 'blocked';
        errorMessage = errorMessage.replace('HTTP_403_BLOCKED:', 'Site blocked access (403 Forbidden): ');
      }
      
      if (urlTitle) {
        errorMessage += ` However, I extracted "${urlTitle}" from the URL.`;
      }
      
      return {
        success: false,
        error: errorMessage,
        source,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        data: urlTitle ? { title: urlTitle, url } : undefined
      };
    }
  }

  private static validateUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }

      // Block local/private networks for security
      const hostname = urlObj.hostname;
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.includes('.local')
      ) {
        return null;
      }

      return urlObj.toString();
    } catch {
      return null;
    }
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

      const text = await response.text();
      
      // Additional size check after reading
      if (text.length > this.MAX_SIZE_BYTES) {
        throw new Error('Page content too large');
      }

      return text;
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
          const data = JSON.parse(scriptContent);
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
      result.title = recipe.name.trim();
    }

    // Ingredients
    if (Array.isArray(recipe.recipeIngredient)) {
      result.ingredients = recipe.recipeIngredient
        .filter((ing: unknown): ing is string => typeof ing === 'string')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0);
    }

    // Instructions/Description
    if (Array.isArray(recipe.recipeInstructions)) {
      const instructions = recipe.recipeInstructions
        .map((instruction: unknown) => {
          if (typeof instruction === 'string') return instruction.trim();
          if (typeof instruction === 'object' && instruction && 'text' in instruction) {
            const instructionObj = instruction as { text?: unknown };
            return typeof instructionObj.text === 'string' ? instructionObj.text.trim() : '';
          }
          return '';
        })
        .filter(inst => inst.length > 0);
      
      result.description = instructions.length > 0 ? instructions.join('\n\n') : undefined;
    } else if (typeof recipe.recipeInstructions === 'string') {
      result.description = recipe.recipeInstructions.trim();
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
        result.title = result.title.trim();
      }

      // Description
      const description = 
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content');

      if (description) {
        result.description = description.trim();
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
        result.title = result.title.trim();
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
            const text = $(el).text().trim();
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
          const text = instructionEl.text().trim();
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
}