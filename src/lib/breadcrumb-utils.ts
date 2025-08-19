import { Recipe } from "@/types/recipe";
import { Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrentPage?: boolean;
}

interface BreadcrumbOptions {
  recipes?: Recipe[];
  recipe?: Recipe;
  t?: (key: string) => string;
}

export function generateBreadcrumbs(
  pathname: string,
  options: BreadcrumbOptions = {}
): BreadcrumbItem[] {
  const { recipes, recipe, t } = options;
  const segments = pathname.split('/').filter(Boolean);
  
  // Remove locale segment if present
  const localePattern = /^(en|nl)$/;
  if (segments.length > 0 && localePattern.test(segments[0])) {
    segments.shift();
  }

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: '',
      href: '/',
      icon: Home,
    },
  ];

  // Handle different route patterns
  if (segments.length === 0) {
    // Home page - just mark as current
    breadcrumbs[0].isCurrentPage = true;
    return breadcrumbs;
  }

  // Handle /recipes routes
  if (segments[0] === 'recipes') {
    // Add recipes breadcrumb
    if (segments.length === 1) {
      // /recipes - this is the current page
      breadcrumbs.push({
        label: t?.('recipes') || 'Recipes',
        isCurrentPage: true,
      });
    } else {
      // /recipes/... - add as link
      breadcrumbs.push({
        label: t?.('recipes') || 'Recipes',
        href: '/recipes',
      });

      if (segments[1] === 'add') {
        // /recipes/add
        breadcrumbs.push({
          label: t?.('addRecipe') || 'Add Recipe',
          isCurrentPage: true,
        });
      } else {
        // /recipes/[id] or /recipes/[id]/edit
        const recipeId = segments[1];
        let recipeTitle = 'Recipe';
        
        // Try to get recipe title from context or provided recipe
        if (recipe && recipe.id === recipeId) {
          recipeTitle = recipe.title;
        } else if (recipes) {
          const foundRecipe = recipes.find(r => r.id === recipeId);
          if (foundRecipe) {
            recipeTitle = foundRecipe.title;
          }
        }

        // Truncate long recipe titles for breadcrumb
        const displayTitle = recipeTitle.length > 30 
          ? `${recipeTitle.substring(0, 27)}...` 
          : recipeTitle;

        if (segments.length === 2) {
          // /recipes/[id] - recipe detail page
          breadcrumbs.push({
            label: displayTitle,
            isCurrentPage: true,
          });
        } else if (segments[2] === 'edit') {
          // /recipes/[id]/edit
          breadcrumbs.push({
            label: displayTitle,
            href: `/recipes/${recipeId}`,
          });
          breadcrumbs.push({
            label: t?.('edit') || 'Edit',
            isCurrentPage: true,
          });
        }
      }
    }
  }

  // Handle other routes (admin, etc.)
  if (segments[0] === 'admin') {
    breadcrumbs.push({
      label: t?.('admin') || 'Admin',
      isCurrentPage: segments.length === 1,
    });
  }

  return breadcrumbs;
}

export function getPageTitle(pathname: string, options: BreadcrumbOptions = {}): string {
  const { recipe, t } = options;
  const segments = pathname.split('/').filter(Boolean);
  
  // Remove locale segment if present
  const localePattern = /^(en|nl)$/;
  if (segments.length > 0 && localePattern.test(segments[0])) {
    segments.shift();
  }

  if (segments.length === 0) {
    return t?.('home') || 'Home';
  }

  if (segments[0] === 'recipes') {
    if (segments.length === 1) {
      return t?.('recipes') || 'Recipes';
    }
    if (segments[1] === 'add') {
      return t?.('addNewRecipe') || 'Add New Recipe';
    }
    if (segments.length >= 2) {
      const recipeId = segments[1];
      if (recipe && recipe.id === recipeId) {
        if (segments[2] === 'edit') {
          return t?.('editRecipe') || 'Edit Recipe';
        }
        return recipe.title;
      }
      if (segments[2] === 'edit') {
        return t?.('editRecipe') || 'Edit Recipe';
      }
      return t?.('recipeDetail') || 'Recipe Details';
    }
  }

  if (segments[0] === 'admin') {
    return t?.('admin') || 'Admin';
  }

  // Fallback
  return segments[segments.length - 1]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}