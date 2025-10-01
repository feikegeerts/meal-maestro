import {
  RecipeShareService,
  SharedRecipeError,
} from "@/lib/recipe-share-service";
import { SharedRecipeClient } from "./shared-recipe-client";

interface SharedRecipePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SharedRecipePage({
  params,
  searchParams,
}: SharedRecipePageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const tokenParam = resolvedSearchParams.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token) {
    return <SharedRecipeClient status="missing-token" />;
  }

  try {
    const sharedData = await RecipeShareService.getSharedRecipe(
      slug,
      token
    );
    const signedImageUrl = await RecipeShareService.createSignedImageUrl(
      sharedData.recipe.image_url || null
    );
    const payload = RecipeShareService.buildPublicPayload(
      sharedData,
      signedImageUrl
    );

    return (
      <SharedRecipeClient
        status="success"
        data={{
          ...payload,
          slug,
          token,
        }}
      />
    );
  } catch (error) {
    if (error instanceof SharedRecipeError) {
      if (error.code === "EXPIRED") {
        return <SharedRecipeClient status="expired" />;
      }
      if (error.code === "NOT_FOUND" || error.code === "TOKEN_INVALID") {
        return <SharedRecipeClient status="not-found" />;
      }
    }

    console.error("Failed to render shared recipe page", error);
    return <SharedRecipeClient status="error" />;
  }
}
