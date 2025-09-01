# Supabase Storage Configuration for Recipe Images

This document outlines the required Supabase Storage configuration for the recipe image management feature.

## Quick Setup (For Development/Testing)

### Option A: Disable RLS (Quick Start)
For immediate testing, you can temporarily disable RLS:

1. Go to Storage in your Supabase dashboard
2. Create new bucket: `recipe-images`
3. Set as **Public bucket**
4. **Disable RLS** (for testing only)

⚠️ **Important**: This approach is only for development testing. Re-enable RLS with proper policies before production.

## Production Setup

### 1. Create Storage Bucket
In your Supabase dashboard:
1. Go to Storage
2. Create new bucket: `recipe-images`
3. Set as **Public bucket** (for Next.js Image optimization)
4. Enable RLS (Row Level Security)

### 2. Storage Policies
Create these RLS policies for the `recipe-images` bucket:

**Upload Policy (INSERT)**:
```sql
CREATE POLICY "Authenticated users can upload recipe images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Read Policy (SELECT)**:
```sql
CREATE POLICY "Anyone can view recipe images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'recipe-images');
```

**Update Policy (UPDATE)**:
```sql
CREATE POLICY "Users can update their own recipe images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Delete Policy (DELETE)**:
```sql
CREATE POLICY "Users can delete their own recipe images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. File Structure
Images will be stored with this structure:
```
recipe-images/
├── {user_id}/
│   └── {recipe_id}/
│       └── {timestamp}.webp
```

### 4. CORS Configuration
Ensure CORS is configured for your domain in Supabase Storage settings to allow Next.js Image component access.

## Troubleshooting

### Error: "new row violates row-level security policy"

This error means the RLS policies are rejecting the upload. Here are the steps to fix:

1. **Check if bucket exists**: Ensure the `recipe-images` bucket is created in Supabase Storage
2. **Verify bucket is public**: The bucket must be marked as "Public" in Supabase
3. **Check RLS policies**: Either disable RLS temporarily for testing, or ensure the policies above are applied correctly
4. **Verify user authentication**: Check that the user is properly authenticated in the API request

### Quick Debug Steps:

1. **Disable RLS temporarily**:
   - Go to Supabase Storage → Settings → Policies
   - Find your `recipe-images` bucket policies 
   - Disable RLS to test upload functionality
   - Re-enable with proper policies once working

2. **Check authentication**:
   - Verify the user is logged in
   - Check that the API route receives the authenticated Supabase client
   - Confirm the user ID is correctly passed to the ImageService

3. **Test bucket permissions**:
   ```sql
   -- Run this in Supabase SQL editor to test basic access
   SELECT * FROM storage.buckets WHERE name = 'recipe-images';
   ```

### Common Solutions:

- **For development**: Temporarily disable RLS on the storage bucket
- **For production**: Apply the exact policies listed above
- **Path issues**: Ensure file paths follow the `{user_id}/{recipe_id}/{timestamp}.webp` structure

## Security Notes
- RLS ensures users can only access their own recipe folders
- Public read access allows optimized image delivery via Next.js
- File paths include user ID to prevent unauthorized access
- Timestamp-based filenames ensure cache invalidation