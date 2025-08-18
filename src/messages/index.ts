import { useTranslations } from 'next-intl';
import { 
  RecipeCategory, 
  RecipeSeason
} from '@/types/recipe';

export function useRecipeTranslations() {
  const tCategories = useTranslations('categories');
  const tSeasons = useTranslations('seasons');
  const tCuisines = useTranslations('cuisines');
  const tDietTypes = useTranslations('dietTypes');
  const tCookingMethods = useTranslations('cookingMethods');
  const tDishTypes = useTranslations('dishTypes');
  const tProteinTypes = useTranslations('proteinTypes');
  const tOccasionTypes = useTranslations('occasionTypes');
  const tCharacteristicTypes = useTranslations('characteristicTypes');

  const translateCategory = (category: RecipeCategory): string => {
    return tCategories(category);
  };

  const translateSeason = (season: RecipeSeason): string => {
    return tSeasons(season);
  };

  const translateTag = (tagType: string, tag: string): string => {
    switch (tagType) {
      case 'cuisine':
        return tCuisines(tag);
      case 'dietType':
        return tDietTypes(tag);
      case 'cookingMethod':
        return tCookingMethods(tag);
      case 'dishType':
        return tDishTypes(tag);
      case 'protein':
        return tProteinTypes(tag);
      case 'occasion':
        return tOccasionTypes(tag);
      case 'characteristic':
        return tCharacteristicTypes(tag);
      default:
        return tag;
    }
  };

  const getAllTranslatedCategories = (): Array<{ value: RecipeCategory; label: string }> => {
    return Object.values(RecipeCategory).map(category => ({
      value: category,
      label: translateCategory(category)
    }));
  };

  const getAllTranslatedSeasons = (): Array<{ value: RecipeSeason; label: string }> => {
    return Object.values(RecipeSeason).map(season => ({
      value: season,
      label: translateSeason(season)
    }));
  };

  return {
    translateCategory,
    translateSeason,
    translateTag,
    getAllTranslatedCategories,
    getAllTranslatedSeasons
  };
}