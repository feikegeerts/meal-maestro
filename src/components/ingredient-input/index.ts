export { StructuredIngredientInput } from "./structured-ingredient-input";

// Export hooks for potential reuse in other components
export { useIngredientState } from "./hooks/use-ingredient-state";
export { useDragAndDrop } from "./hooks/use-drag-and-drop";
export { useResponsiveLayout } from "./hooks/use-responsive-layout";

// Export individual components for potential reuse
export { DesktopIngredientItem } from "./desktop/desktop-ingredient-item";
export { MobileIngredientItem } from "./mobile/mobile-ingredient-item";
export { AddIngredientButton } from "./shared/add-ingredient-button";
export { EmptyState } from "./shared/empty-state";