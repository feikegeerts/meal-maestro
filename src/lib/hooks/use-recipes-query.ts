import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { recipeService } from "@/lib/recipe-service";
import type {
  Recipe,
  RecipeInput,
  RecipeSearchParams,
  RecipesResponse,
} from "@/types/recipe";

export const recipeKeys = {
  all: ["recipes"] as const,
  list: (params?: RecipeSearchParams) =>
    params ? ["recipes", params] : ["recipes"],
  detail: (id: string) => ["recipe", id] as const,
};

export function useRecipesQuery(
  params?: RecipeSearchParams,
): UseQueryResult<RecipesResponse> {
  const { user } = useAuth();
  return useQuery({
    queryKey: recipeKeys.list(params),
    queryFn: () => recipeService.getUserRecipes(params),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecipeQuery(id: string): UseQueryResult<Recipe> {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => recipeService.getRecipe(id),
    enabled: !!user && !!id,
    initialData: () => {
      const listData = queryClient.getQueryData<RecipesResponse>(
        recipeKeys.list(),
      );
      return listData?.recipes.find((r) => r.id === id);
    },
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(recipeKeys.list())?.dataUpdatedAt,
  });
}

export function useCreateRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<RecipeInput, "id">) =>
      recipeService.createRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useUpdateRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<RecipeInput>;
    }) => recipeService.updateRecipe(id, data),
    onSuccess: (result) => {
      queryClient.setQueryData(recipeKeys.detail(result.recipe.id), result.recipe);
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useDeleteRecipeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recipeService.deleteRecipe(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useDeleteRecipesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => recipeService.deleteRecipes(ids),
    onSuccess: (result) => {
      result.deletedIds.forEach((id) =>
        queryClient.removeQueries({ queryKey: recipeKeys.detail(id) }),
      );
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}

export function useMarkRecipesAsEatenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, date }: { ids: string[]; date?: Date }) =>
      recipeService.markRecipesAsEaten(ids, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all });
    },
  });
}
