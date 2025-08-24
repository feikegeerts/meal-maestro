export const FORM_CONFIG = {
  DEBOUNCE_DELAY: 300,
  SCROLL_DELAY: 300,
  MIN_SERVINGS: 1,
  MAX_SERVINGS: 100,
  DEFAULT_SERVINGS: 4,
  MIN_TEXTAREA_HEIGHT: 120,
  MOBILE_INPUT_HEIGHT: "h-8",
  DESKTOP_INPUT_HEIGHT: "h-9",
  MOBILE_TEXT_SIZE: "text-sm",
} as const;

export const GRID_CONFIG = {
  TAG_COLUMNS: "grid-cols-2 sm:grid-cols-3",
  FORM_BASIC_COLUMNS: "grid-cols-1 sm:grid-cols-3",
  DESKTOP_LAYOUT: "lg:grid lg:grid-cols-12",
  CHAT_COLUMNS: "lg:col-span-5",
  FORM_COLUMNS: "lg:col-span-7",
  FORM_FULL_COLUMNS: "lg:col-span-12",
} as const;

export const SPACING_CONFIG = {
  CARD_SPACING: "space-y-4 sm:space-y-6",
  DESKTOP_SPACING: "lg:space-y-0 lg:gap-8",
  SECTION_SPACING: "space-y-3 sm:space-y-4",
  TAG_SPACING: "space-y-6",
  INPUT_SPACING: "space-y-2",
} as const;

export const VALIDATION_MESSAGES = {
  TITLE_REQUIRED: "Title is required",
  DESCRIPTION_REQUIRED: "Instructions are required", 
  INGREDIENTS_REQUIRED: "At least one ingredient is required",
  CATEGORY_REQUIRED: "Category is required",
} as const;