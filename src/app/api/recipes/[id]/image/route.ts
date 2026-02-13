import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { recipes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ImageService } from "@/lib/image-service";
import { IMAGE_COMPRESSION_CONFIG } from "@/lib/image-compression-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;
  // ImageService falls back to env vars when no client is provided
  const imageService = new ImageService();

  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 },
      );
    }

    // Verify recipe ownership
    const [recipe] = await db
      .select({ id: recipes.id, imageUrl: recipes.imageUrl })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .limit(1);

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    if (
      !IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS.includes(
        file.type as (typeof IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS)[number],
      )
    ) {
      return NextResponse.json(
        { error: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.UNSUPPORTED_FORMAT },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Upload/replace image using service
    const uploadResult = await imageService.replaceRecipeImage(
      recipeId,
      user.id,
      imageBuffer,
      recipe.imageUrl || undefined,
    );

    if (!uploadResult.success) {
      console.error("Image upload failed:", uploadResult.error);

      const statusCode =
        uploadResult.error?.code === "VALIDATION_ERROR" ? 400 : 500;

      return NextResponse.json(
        { error: uploadResult.error?.message || "Image upload failed" },
        { status: statusCode },
      );
    }

    // Update recipe with new image URL and metadata
    const updateResult = await db
      .update(recipes)
      .set({
        imageUrl: uploadResult.data!.url,
        imageMetadata: uploadResult.data!.metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .returning({ id: recipes.id });

    if (updateResult.length === 0) {
      // Best effort cleanup of uploaded image if database update fails
      await imageService.deleteRecipeImage(uploadResult.data!.url, user.id);

      return NextResponse.json(
        { error: "Failed to save image reference" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Image uploaded successfully",
      imageUrl: uploadResult.data!.url,
      metadata: uploadResult.data!.metadata,
    });
  } catch (error) {
    console.error("Unexpected error in image upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { user } = authResult;
  const imageService = new ImageService();

  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: "Recipe ID is required" },
        { status: 400 },
      );
    }

    // Get recipe with current image
    const [recipe] = await db
      .select({ id: recipes.id, imageUrl: recipes.imageUrl })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)))
      .limit(1);

    if (!recipe) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 },
      );
    }

    if (!recipe.imageUrl) {
      return NextResponse.json(
        { error: "Recipe has no image to delete" },
        { status: 404 },
      );
    }

    // Delete image from storage
    const deleteResult = await imageService.deleteRecipeImage(
      recipe.imageUrl,
      user.id,
    );

    if (!deleteResult.success) {
      console.error("Image deletion failed:", deleteResult.error);

      return NextResponse.json(
        { error: deleteResult.error?.message || "Image deletion failed" },
        { status: 500 },
      );
    }

    // Clear image reference from database
    await db
      .update(recipes)
      .set({
        imageUrl: null,
        imageMetadata: null,
        updatedAt: new Date(),
      })
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id)));

    return NextResponse.json({
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error in image deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
