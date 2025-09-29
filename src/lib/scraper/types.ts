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

export interface ExtractionResult {
  success: boolean;
  data?: ScrapedRecipeData;
  error?: string;
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
