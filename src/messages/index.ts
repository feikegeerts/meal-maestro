import { useTranslations } from 'next-intl';
import { RecipeCategory, RecipeTag, RecipeSeason } from '@/types/recipe';

export function useRecipeTranslations() {
  const tCategories = useTranslations('categories');
  const tSeasons = useTranslations('seasons');
  const tTags = useTranslations('tags');

  const translateCategory = (category: RecipeCategory): string => {
    return tCategories(category);
  };

  const translateSeason = (season: RecipeSeason): string => {
    return tSeasons(season);
  };

  const translateTag = (tag: RecipeTag): string => {
    return tTags(tag);
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

  const getAllTranslatedTags = (): Array<{ value: RecipeTag; label: string }> => {
    return Object.values(RecipeTag).map(tag => ({
      value: tag,
      label: translateTag(tag)
    }));
  };

  return {
    translateCategory,
    translateSeason,
    translateTag,
    getAllTranslatedCategories,
    getAllTranslatedSeasons,
    getAllTranslatedTags
  };
}