import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { ImageService } from "@/lib/image-service";
import { IMAGE_COMPRESSION_CONFIG } from "@/lib/image-compression-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const imageService = new ImageService({ supabaseClient: supabase });
  
  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    // Verify recipe ownership
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, image_url')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (recipeError) {
      if (recipeError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching recipe:', recipeError);
      return NextResponse.json(
        { error: 'Failed to verify recipe ownership' },
        { status: 500 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS.includes(file.type as typeof IMAGE_COMPRESSION_CONFIG.SUPPORTED_FORMATS[number])) {
      return NextResponse.json(
        { error: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.UNSUPPORTED_FORMAT },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > IMAGE_COMPRESSION_CONFIG.MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: IMAGE_COMPRESSION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE },
        { status: 400 }
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
      recipe.image_url || undefined
    );

    if (!uploadResult.success) {
      console.error('Image upload failed:', uploadResult.error);
      
      // Map service errors to appropriate HTTP status codes
      const statusCode = uploadResult.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      
      return NextResponse.json(
        { error: uploadResult.error?.message || 'Image upload failed' },
        { status: statusCode }
      );
    }

    // Update recipe with new image URL and metadata
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        image_url: uploadResult.data!.url,
        image_metadata: uploadResult.data!.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating recipe with image data:', updateError);
      
      // Best effort cleanup of uploaded image if database update fails
      await imageService.deleteRecipeImage(uploadResult.data!.url, user.id);
      
      return NextResponse.json(
        { error: 'Failed to save image reference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Image uploaded successfully',
      imageUrl: uploadResult.data!.url,
      metadata: uploadResult.data!.metadata
    });

  } catch (error) {
    console.error('Unexpected error in image upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }

  const { user, client: supabase } = authResult;
  const imageService = new ImageService({ supabaseClient: supabase });
  
  try {
    const { id: recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    // Get recipe with current image
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, image_url')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (recipeError) {
      if (recipeError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Recipe not found' },
          { status: 404 }
        );
      }
      
      console.error('Error fetching recipe:', recipeError);
      return NextResponse.json(
        { error: 'Failed to verify recipe ownership' },
        { status: 500 }
      );
    }

    if (!recipe.image_url) {
      return NextResponse.json(
        { error: 'Recipe has no image to delete' },
        { status: 404 }
      );
    }

    // Delete image from storage
    const deleteResult = await imageService.deleteRecipeImage(recipe.image_url, user.id);
    
    if (!deleteResult.success) {
      console.error('Image deletion failed:', deleteResult.error);
      
      return NextResponse.json(
        { error: deleteResult.error?.message || 'Image deletion failed' },
        { status: 500 }
      );
    }

    // Clear image reference from database
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        image_url: null,
        image_metadata: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error clearing recipe image reference:', updateError);
      return NextResponse.json(
        { error: 'Failed to clear image reference' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in image deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}