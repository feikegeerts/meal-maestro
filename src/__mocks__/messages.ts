// Mock for messages
export function useRecipeTranslations() {
  const translateCategory = (category: string): string => {
    return category;
  };

  const translateSeason = (season: string): string => {
    return season;
  };

  const translateTag = (tag: string): string => {
    return tag;
  };

  const getAllTranslatedCategories = () => {
    return [];
  };

  const getAllTranslatedSeasons = () => {
    return [];
  };

  const getAllTranslatedTags = () => {
    return [];
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