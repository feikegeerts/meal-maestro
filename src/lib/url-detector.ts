export interface DetectedUrl {
  url: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
}

export class UrlDetector {
  private static readonly URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  
  private static readonly RECIPE_SITE_INDICATORS = [
    'recipe',
    'cooking',
    'kitchen',
    'food',
    'chef',
    'allrecipes',
    'foodnetwork',
    'epicurious',
    'tasty',
    'delish',
    'seriouseats',
    'simplyrecipes',
    'bbcgoodfood',
    'jamieoliver',
    'ah.nl',
    'marmiton',
    'cuisine',
    'recept'
  ];

  /**
   * Detects all URLs in a given text
   */
  static detectUrls(text: string): DetectedUrl[] {
    const urls: DetectedUrl[] = [];
    const regex = new RegExp(this.URL_REGEX);
    let match;

    while ((match = regex.exec(text)) !== null) {
      urls.push({
        url: match[0],
        originalText: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    return urls;
  }

  /**
   * Detects URLs that are likely to contain recipes
   */
  static detectRecipeUrls(text: string): DetectedUrl[] {
    const allUrls = this.detectUrls(text);
    
    return allUrls.filter(urlInfo => 
      this.isLikelyRecipeUrl(urlInfo.url)
    );
  }

  /**
   * Checks if a URL is likely to contain a recipe based on domain and path patterns
   */
  static isLikelyRecipeUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathname = urlObj.pathname.toLowerCase();
      const fullUrl = url.toLowerCase();

      // Check if domain or path contains recipe-related keywords
      return this.RECIPE_SITE_INDICATORS.some(indicator => 
        hostname.includes(indicator) || 
        pathname.includes(indicator) ||
        fullUrl.includes(indicator)
      );
    } catch {
      return false;
    }
  }

  /**
   * Extracts the first URL from text, regardless of whether it's recipe-related
   */
  static extractFirstUrl(text: string): string | null {
    const urls = this.detectUrls(text);
    return urls.length > 0 ? urls[0].url : null;
  }

  /**
   * Extracts the first recipe-related URL from text
   */
  static extractFirstRecipeUrl(text: string): string | null {
    const recipeUrls = this.detectRecipeUrls(text);
    return recipeUrls.length > 0 ? recipeUrls[0].url : null;
  }

  /**
   * Checks if text contains any URLs
   */
  static hasUrls(text: string): boolean {
    return this.URL_REGEX.test(text);
  }

  /**
   * Checks if text contains recipe-related URLs
   */
  static hasRecipeUrls(text: string): boolean {
    return this.detectRecipeUrls(text).length > 0;
  }

  /**
   * Removes URLs from text, optionally replacing them with a placeholder
   */
  static removeUrls(text: string, placeholder: string = ''): string {
    return text.replace(this.URL_REGEX, placeholder);
  }

  /**
   * Validates if a string is a valid URL
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Cleans and normalizes a URL
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'ref', 'source', 'campaign'
      ];
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });

      return urlObj.toString();
    } catch {
      return url; // Return original if parsing fails
    }
  }

  /**
   * Gets a user-friendly description of the URL domain
   */
  static getDomainDescription(url: string): string {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname.toLowerCase();
      
      // Remove 'www.' prefix
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }

      // Map common domains to friendly names
      const domainMap: Record<string, string> = {
        'allrecipes.com': 'Allrecipes',
        'foodnetwork.com': 'Food Network',
        'epicurious.com': 'Epicurious',
        'tasty.co': 'Tasty',
        'delish.com': 'Delish',
        'seriouseats.com': 'Serious Eats',
        'simplyrecipes.com': 'Simply Recipes',
        'bbcgoodfood.com': 'BBC Good Food',
        'jamieoliver.com': 'Jamie Oliver',
        'ah.nl': 'Albert Heijn',
        'marmiton.org': 'Marmiton'
      };

      return domainMap[hostname] || hostname;
    } catch {
      return 'Unknown site';
    }
  }
}