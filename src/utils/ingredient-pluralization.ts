import { RecipeIngredient } from "@/types/recipe";
import { normalizeIngredientUnit, formatFraction, pluralizeUnit } from "@/types/recipe";

// Translation adapter interfaces
export interface UnitTranslator {
  (unit: string): string;
}

export interface IngredientPluralizationMappings {
  [singular: string]: string;
}

export interface TranslationAdapter {
  translateUnit: UnitTranslator;
  translateIngredientPlurals: (key: string) => string;
}

/**
 * Service class for ingredient formatting with pluralization support
 * Uses dependency injection and caching for optimal performance
 */
export class IngredientFormatterService {
  private readonly translationAdapter: TranslationAdapter;
  private readonly pluralToSingularCache = new Map<string, string>();

  constructor(translationAdapter: TranslationAdapter) {
    this.translationAdapter = translationAdapter;
  }

  /**
   * Get pluralized form of ingredient name
   * Public method for component access
   */
  public pluralizeIngredientName(ingredientName: string): string {
    try {
      const plural = this.translationAdapter.translateIngredientPlurals(ingredientName);
      // Only return the plural if we got a real translation (not the key back)
      if (plural && plural !== ingredientName && !plural.startsWith('ingredientPlurals.')) {
        // Cache the reverse lookup for singularization
        this.pluralToSingularCache.set(plural, ingredientName);
        return plural;
      }
    } catch {
      // Silently ignore translation errors
    }
    return ingredientName;
  }






  /**
   * Get singular form of ingredient name  
   * Public method for component access
   */
  public singularizeIngredientName(ingredientName: string): string {
    // Check if we already cached the reverse lookup
    if (this.pluralToSingularCache.has(ingredientName)) {
      return this.pluralToSingularCache.get(ingredientName)!;
    }
    
    // This is more complex - we need to find if this ingredient is a plural form
    // For now, just return the original name since we can't efficiently reverse-lookup
    return ingredientName;
  }

  /**
   * Apply pluralization logic based on amount
   * Handles both singular->plural and plural->singular transformations
   */
  private applyIngredientPluralization(ingredientName: string, amount: number): string {
    if (amount > 1) {
      // Try to pluralize, fallback to original if no mapping exists
      return this.pluralizeIngredientName(ingredientName);
    } else if (amount === 1) {
      // Try to singularize, fallback to original if no reverse mapping exists
      return this.singularizeIngredientName(ingredientName);
    }
    
    // For amounts between 0 and 1, keep original form
    return ingredientName;
  }

  /**
   * Format ingredient with proper pluralization and unit handling
   * Main public method for ingredient display
   */
  formatIngredient(ingredient: RecipeIngredient): string {
    // Handle null amounts (ingredients without quantities)
    if (ingredient.amount === null) {
      const notes = ingredient.notes ? ` (${ingredient.notes})` : '';
      return `${ingredient.name}${notes}`;
    }
    
    // Handle invalid numbers
    if (!Number.isFinite(ingredient.amount)) {
      const notes = ingredient.notes ? ` (${ingredient.notes})` : '';
      return `${ingredient.name}${notes}`;
    }
    
    // Apply smart unit conversion and normalization
    const smartResult = normalizeIngredientUnit(ingredient.amount, ingredient.unit);
    const finalAmount = smartResult?.amount ?? ingredient.amount;
    const finalUnit = smartResult?.unit ?? ingredient.unit;
    
    // Apply unit pluralization (existing logic)
    const pluralizedUnit = pluralizeUnit(finalUnit, finalAmount);
    
    // Apply ingredient name pluralization
    const pluralizedIngredientName = this.applyIngredientPluralization(
      ingredient.name, 
      finalAmount
    );
    
    // Build final display string
    const amount = formatFraction(finalAmount);
    const unit = pluralizedUnit 
      ? ` ${this.translationAdapter.translateUnit(pluralizedUnit) || pluralizedUnit}` 
      : '';
    const notes = ingredient.notes ? ` (${ingredient.notes})` : '';
    
    return `${amount}${unit} ${pluralizedIngredientName}${notes}`;
  }
}

/**
 * Factory function to create translation adapter from next-intl translation functions
 * Abstracts the i18n implementation details with flexible type handling
 */
export function createTranslationAdapter(
  translateUnit: UnitTranslator,
  translateIngredientPlurals: (key: string) => string
): TranslationAdapter {
  return {
    translateUnit,
    translateIngredientPlurals: (key: string) => {
      // Instead of calling the translation function directly,
      // let's suppress console errors and use a global error handler
      const originalConsoleError = console.error;
      let errorOccurred = false;
      
      // Temporarily suppress console errors
      console.error = (...args: unknown[]) => {
        const errorStr = args.join(' ');
        if (errorStr.includes('MISSING_MESSAGE') || errorStr.includes('Could not resolve')) {
          errorOccurred = true;
          return; // Suppress this error
        }
        originalConsoleError(...args); // Let other errors through
      };
      
      try {
        const result = translateIngredientPlurals(key);
        
        // Restore console.error
        console.error = originalConsoleError;
        
        // If an error occurred, return the key
        if (errorOccurred) {
          return key;
        }
        
        return result;
      } catch {
        // Restore console.error
        console.error = originalConsoleError;
        
        // Return the original key for any error
        return key;
      }
    }
  };
}