import { generateBreadcrumbs, getPageTitle } from '../breadcrumb-utils';
import { Recipe, RecipeCategory } from '@/types/recipe';
import { Home } from 'lucide-react';

type TranslatorKey =
  | 'home'
  | 'recipes'
  | 'addRecipe'
  | 'addNewRecipe'
  | 'edit'
  | 'editRecipe'
  | 'admin'
  | 'recipeDetail';

const translations: Record<TranslatorKey, string> = {
  home: 'Start',
  recipes: 'Recepten',
  addRecipe: 'Recept toevoegen',
  addNewRecipe: 'Nieuw recept',
  edit: 'Bewerken',
  editRecipe: 'Recept bewerken',
  admin: 'Beheer',
  recipeDetail: 'Receptdetails',
};

const t = (key: string) => translations[key as TranslatorKey] ?? key;

const createRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'recipe-123',
  title: 'Test Recipe Title',
  ingredients: [],
  servings: 4,
  description: 'Tasty test recipe',
  category: RecipeCategory.MAIN_COURSE,
  user_id: 'user-123',
  ...overrides,
});

describe('breadcrumb-utils', () => {
  describe('generateBreadcrumbs', () => {
    it('returns just the home breadcrumb for the root route', () => {
      const breadcrumbs = generateBreadcrumbs('/');

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({
        label: '',
        href: '/',
        icon: Home,
        isCurrentPage: true,
      });
    });

    it('drops locale prefix and marks recipes index as current', () => {
      const breadcrumbs = generateBreadcrumbs('/nl/recipes', { t });

      expect(breadcrumbs).toEqual([
        { label: '', href: '/', icon: Home },
        { label: 'Recepten', isCurrentPage: true },
      ]);
    });

    it('uses provided recipe title and truncates long labels for detail pages', () => {
      const longTitle = 'Super Mega Ultra Delicious Recipe Title That Keeps Going';
      const recipe = createRecipe({ id: 'long', title: longTitle });

      const breadcrumbs = generateBreadcrumbs('/recipes/long', { recipe, t });

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[1]).toEqual({ label: 'Recepten', href: '/recipes' });
      expect(breadcrumbs[2]).toEqual({
        label: `${longTitle.substring(0, 27)}...`,
        isCurrentPage: true,
      });
    });

    it('falls back to recipe lookup and adds edit state for edit routes', () => {
      const recipe = createRecipe({ id: 'edit-me', title: 'Weekend Waffles' });

      const breadcrumbs = generateBreadcrumbs('/en/recipes/edit-me/edit', {
        recipes: [recipe],
        t,
      });

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[2]).toEqual({ label: 'Weekend Waffles', href: '/recipes/edit-me' });
      expect(breadcrumbs[3]).toEqual({ label: 'Bewerken', isCurrentPage: true });
    });

    it('adds admin breadcrumb for admin routes', () => {
      const breadcrumbs = generateBreadcrumbs('/admin', { t });

      expect(breadcrumbs).toEqual([
        { label: '', href: '/', icon: Home },
        { label: 'Beheer', isCurrentPage: true },
      ]);
    });
  });

  describe('getPageTitle', () => {
    it('returns translated title for the home route', () => {
      expect(getPageTitle('/', { t })).toBe('Start');
    });

    it('returns recipe title when provided with matching recipe', () => {
      const recipe = createRecipe({ id: 'match', title: 'Spicy Ramen' });
      expect(getPageTitle('/recipes/match', { recipe })).toBe('Spicy Ramen');
    });

    it('prefers edit translation when editing without recipe context', () => {
      expect(getPageTitle('/recipes/unknown/edit', { t })).toBe('Recept bewerken');
    });

    it('falls back to formatted slug when no matching route handlers apply', () => {
      expect(getPageTitle('/user-preferences')).toBe('User Preferences');
    });
  });
});
