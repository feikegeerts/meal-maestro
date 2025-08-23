"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Recipe, RecipeCategory, RecipeSeason, CuisineType, DietType, CookingMethodType, DishType, ProteinType, OccasionType, CharacteristicType } from "@/types/recipe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Utensils,
  Trash2,
} from "lucide-react";
import { Link } from "@/app/i18n/routing";
import { useTranslations } from 'next-intl';
import { useRecipeTranslations } from '@/messages';
import { useLocalizedDateFormatter } from '@/lib/date-utils';
import { useRecipes } from '@/contexts/recipe-context';
import { recipeService } from '@/lib/recipe-service';
import { toast } from 'sonner';

export function useRecipeColumns(): ColumnDef<Recipe>[] {
  const t = useTranslations('recipeTable');
  const tA11y = useTranslations('accessibility');
  const tToast = useTranslations('toast');
  const { translateCategory, translateSeason, translateTag } = useRecipeTranslations();
  const { formatDateWithFallback } = useLocalizedDateFormatter();
  const { removeRecipe, updateRecipe } = useRecipes();


  const handleMarkAsEaten = async (recipe: Recipe) => {
    try {
      const now = new Date().toISOString();
      const updatedRecipe = await recipeService.updateRecipe(recipe.id, { last_eaten: now });
      updateRecipe(recipe.id, updatedRecipe.recipe);
      toast.success(tToast('recipeMarkedEaten', { count: 1 }));
    } catch (error) {
      console.error('Error marking recipe as eaten:', error);
      toast.error(tToast('markEatenError'));
    }
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!window.confirm(t('confirmDelete', { count: 1, plural: '' }))) {
      return;
    }

    try {
      await recipeService.deleteRecipe(recipe.id);
      removeRecipe(recipe.id);
      toast.success(tToast('recipeDeleted', { count: 1 }));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast.error(tToast('deleteRecipeError'));
    }
  };

  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={tA11y('selectAll')}
      />
    ),
    cell: ({ row }) => (
      <div className="flex items-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={tA11y('selectRow')}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          {t('title')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      
      return (
        <div className="font-medium max-w-[200px] truncate" title={title}>
          {title}
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          {t('category')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      return (
        <Badge variant="secondary" className="capitalize">
          {translateCategory(category as RecipeCategory)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "season",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          {t('season')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const season = row.getValue("season") as string | undefined;
      if (!season) return <span className="text-muted-foreground">-</span>;
      return (
        <Badge variant="outline" className="capitalize">
          {translateSeason(season as RecipeSeason)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "tags",
    header: t('tags'),
    cell: ({ row }) => {
      const recipe = row.original as Recipe;
      const allTags: string[] = [
        ...(recipe.cuisine ? [recipe.cuisine] : []),
        ...(recipe.diet_types || []),
        ...(recipe.cooking_methods || []),
        ...(recipe.dish_types || []),
        ...(recipe.proteins || []),
        ...(recipe.occasions || []),
        ...(recipe.characteristics || [])
      ];

      if (allTags.length === 0) {
        return <span className="text-muted-foreground">-</span>;
      }

      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {allTags.slice(0, 2).map((tag) => {
            // Determine tag category and translate accordingly
            let translatedTag = tag;
            
            if (recipe.cuisine === tag) {
              translatedTag = translateTag('cuisine', tag as CuisineType);
            } else if (recipe.diet_types?.includes(tag as DietType)) {
              translatedTag = translateTag('dietType', tag as DietType);
            } else if (recipe.cooking_methods?.includes(tag as CookingMethodType)) {
              translatedTag = translateTag('cookingMethod', tag as CookingMethodType);
            } else if (recipe.dish_types?.includes(tag as DishType)) {
              translatedTag = translateTag('dishType', tag as DishType);
            } else if (recipe.proteins?.includes(tag as ProteinType)) {
              translatedTag = translateTag('protein', tag as ProteinType);
            } else if (recipe.occasions?.includes(tag as OccasionType)) {
              translatedTag = translateTag('occasion', tag as OccasionType);
            } else if (recipe.characteristics?.includes(tag as CharacteristicType)) {
              translatedTag = translateTag('characteristic', tag as CharacteristicType);
            }
            
            return (
              <Badge key={tag} variant="outline" className="text-xs">
                {translatedTag}
              </Badge>
            );
          })}
          {allTags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{allTags.length - 2}
            </Badge>
          )}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const recipe = row.original as Recipe;
      const allTags: string[] = [
        ...(recipe.cuisine ? [recipe.cuisine] : []),
        ...(recipe.diet_types || []),
        ...(recipe.cooking_methods || []),
        ...(recipe.dish_types || []),
        ...(recipe.proteins || []),
        ...(recipe.occasions || []),
        ...(recipe.characteristics || [])
      ];
      return value.some((filterTag: string) => allTags.includes(filterTag));
    },
  },
  {
    accessorKey: "last_eaten",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          {t('lastEaten')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const lastEaten = row.getValue("last_eaten") as string | undefined;
      if (!lastEaten) {
        return <span className="text-muted-foreground">{t('never')}</span>;
      }
      return (
        <div className="text-sm">
          {formatDateWithFallback(lastEaten)}
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const dateA = rowA.getValue(columnId) as string | undefined;
      const dateB = rowB.getValue(columnId) as string | undefined;

      if (!dateA && !dateB) return 0;
      if (!dateA) return -1;
      if (!dateB) return 1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          {t('created')}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string;
      return (
        <div className="text-sm text-muted-foreground">
          {formatDateWithFallback(createdAt)}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: t('actions'),
    cell: ({ row }) => {
      const recipe = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              data-dropdown-trigger
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(recipe.id)}
            >
              {t('copyId')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/recipes/${recipe.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                {t('viewDetails')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/recipes/${recipe.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                {t('editRecipe')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMarkAsEaten(recipe)}>
              <Utensils className="mr-2 h-4 w-4" />
              {t('markAsEaten')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive" 
              onClick={() => handleDeleteRecipe(recipe)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('deleteRecipe')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  ];
}
