import { Recipe } from "@/types/recipe";

/**
 * Extracts meaningful food-related keywords from recipe title
 */
function extractFoodKeywords(title: string): string[] {
  // Common non-food words to filter out
  const skipWords = new Set([
    'special', 'speciale', 'easy', 'quick', 'simple', 'best', 'perfect', 
    'homemade', 'traditional', 'authentic', 'delicious', 'healthy',
    'vegan', 'vegetarian', 'gluten-free', 'keto', 'low-carb',
    'with', 'and', 'or', 'the', 'a', 'an', 'de', 'het', 'een',
    'van', 'met', 'en', 'of'
  ]);

  // Extract words, filter out non-food terms
  const words = title
    .toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ') // Remove special characters
    .split(/\s+/)
    .filter(word => word.length > 2 && !skipWords.has(word));

  return words.slice(0, 2); // Take first 2 meaningful words
}

/**
 * Generate category-based fallback search terms
 */
function getCategorySearchTerms(category: string): string[] {
  const categoryMap: Record<string, string[]> = {
    'breakfast': ['breakfast', 'pancakes', 'eggs'],
    'lunch': ['sandwich', 'salad', 'soup'],
    'dinner': ['pasta', 'chicken', 'vegetables'],
    'snack': ['snacks', 'fruit', 'nuts'],
    'dessert': ['cake', 'cookies', 'chocolate'],
    'appetizer': ['appetizers', 'cheese', 'bread'],
    'beverage': ['drinks', 'smoothie', 'coffee'],
    'side-dish': ['vegetables', 'rice', 'potatoes'],
    'main-course': ['meat', 'fish', 'pasta']
  };

  return categoryMap[category] || ['food', 'cooking', 'meal'];
}

/**
 * Generate Unsplash image URL with smart search terms and fallbacks
 */
export function getRecipeImageUrl(recipe: Recipe, size: { width: number; height: number } = { width: 400, height: 300 }): string {
  const { width, height } = size;
  
  // Try 1: Extract meaningful keywords from title
  const foodKeywords = extractFoodKeywords(recipe.title);
  if (foodKeywords.length > 0) {
    const searchTerm = foodKeywords.join('+') + '+food';
    return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(searchTerm)}`;
  }

  // Try 2: Use category-based search
  const categoryTerms = getCategorySearchTerms(recipe.category);
  const categorySearch = categoryTerms[0] + '+food';
  return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(categorySearch)}`;
}

/**
 * Generate image URL with error handling and placeholder fallback
 */
export function getRecipeImageUrlWithFallback(recipe: Recipe, size: { width: number; height: number } = { width: 400, height: 300 }): string {
  try {
    return getRecipeImageUrl(recipe, size);
  } catch (error) {
    console.warn('Failed to generate recipe image URL:', error);
    // Fallback to a generic food placeholder
    return `https://source.unsplash.com/${size.width}x${size.height}/?food+cooking`;
  }
}

/**
 * Handle image load errors by providing alternative sources
 */
export function getImageErrorHandler(recipe: Recipe, size: { width: number; height: number }) {
  const categoryTerms = getCategorySearchTerms(recipe.category);
  
  const fallbacks = [
    // Try category-based Unsplash search
    `https://source.unsplash.com/${size.width}x${size.height}/?${categoryTerms[0]}+food`,
    // Try generic food search
    `https://source.unsplash.com/${size.width}x${size.height}/?cooking+food`,
    `https://source.unsplash.com/${size.width}x${size.height}/?food`,
    // Fallback to Picsum (random images)
    `https://picsum.photos/${size.width}/${size.height}?random=1`,
    // Final fallback - placeholder
    `https://via.placeholder.com/${size.width}x${size.height}/e2e8f0/64748b?text=Recipe`
  ];

  return (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const currentSrc = img.src;
    
    // Find next fallback that we haven't tried yet
    let nextFallback = fallbacks[0];
    
    // If we're already on a fallback, try the next one
    for (let i = 0; i < fallbacks.length - 1; i++) {
      if (currentSrc.includes(fallbacks[i].split('?')[0]) || 
          currentSrc.includes(fallbacks[i].split('/').slice(-2, -1)[0])) {
        nextFallback = fallbacks[i + 1];
        break;
      }
    }
    
    // Only change if we found a different fallback
    if (nextFallback && !currentSrc.includes(nextFallback.split('?')[0])) {
      console.log(`Image failed to load: ${currentSrc}. Trying fallback: ${nextFallback}`);
      img.src = nextFallback;
    }
  };
}