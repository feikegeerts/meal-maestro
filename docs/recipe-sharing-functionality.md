# Recipe Sharing - Functional Documentation

## Overview

The Recipe Sharing feature allows Meal Maestro users to share their recipes with others via secure, unique URLs. Recipients can view shared recipes without creating an account, and optionally save them to their own collection (if permitted by the sharer).

## Purpose

- **Easy Distribution**: Share recipes with friends and family via a simple link
- **Controlled Access**: Control whether recipients can import the recipe to their own account
- **Time-Limited Sharing**: Optionally set expiration dates for shared links
- **Privacy**: Revoke access at any time by deleting the share link
- **Tracking**: Monitor how many times your shared recipe has been viewed

## Key Features

### 1. Secure Share Links

Each shared recipe gets a unique, secure URL that looks like:
```
https://meal-maestro.com/en/share/abc123def?token=xYz...789
```

The URL consists of:
- **Slug** (`abc123def`): A human-readable identifier
- **Token** (`xYz...789`): A secret credential required to access the recipe

Both components are required to view the shared recipe, ensuring that only recipients with the complete URL can access it.

### 2. Permission Control

When sharing a recipe, you can choose:

- **Allow Save** (default): Recipients can view AND import the recipe to their own account
- **View Only**: Recipients can only read the recipe but cannot save it

This gives you control over whether shared recipes can be copied or just viewed.

### 3. Optional Expiration

Share links can optionally expire after a specific date/time. After expiration:
- The link stops working
- Recipients see an "expired" message
- You can create a new share link if needed

### 4. View Tracking

Each share link tracks:
- **Total views**: How many times the link has been accessed
- **Last viewed**: When someone last opened the shared recipe

This helps you understand if your shared recipe is being used.

### 5. One Active Share Per Recipe

Each recipe can only have one active share link at a time. This simplifies management:
- Creating a new share for a recipe automatically replaces the previous one
- You don't need to manage multiple links for the same recipe
- Regenerating a share revokes all previous URLs

## User Flows

### Creating a Share Link

1. **Navigate to your recipe** in Meal Maestro
2. **Click the Share button** (typically an icon in the recipe header)
3. **Configure share settings** (optional):
   - Set an expiration date/time
   - Toggle "Allow Save" permission
4. **Click "Generate"**
5. **Copy the share URL** using the copy button
6. **Send the URL** to recipients via email, messaging, etc.

The share link is now active and ready to use.

### Viewing a Shared Recipe (Recipient)

1. **Open the share URL** sent by the recipe owner
2. **View the recipe** - all details are displayed:
   - Recipe name and description
   - Ingredients and instructions
   - Photos (if included)
   - Cooking time, servings, etc.
3. **Print the recipe** (optional) - a print button is always available
4. **Save to your account** (if allowed and authenticated):
   - Click "Save to My Recipes"
   - The recipe is imported to your personal collection
   - You can now edit your copy independently

If you're not logged in and the recipe allows saving, you'll see a "Login to Save" button that redirects you to sign in first.

### Importing a Shared Recipe

When you save a shared recipe to your account:

**What Gets Copied**:
- Complete recipe data (name, description, ingredients, instructions)
- All metadata (servings, prep time, categories, tags, etc.)
- Recipe photo (if present) - a new copy is created in your storage
- Nutrition information (if available)
- Recipe sections and structure

**What Doesn't Get Copied**:
- The original owner's information
- View counts or sharing statistics
- The share link itself (you'll need to create your own to share your copy)

Your imported copy is completely independent - you can edit, modify, or delete it without affecting the original.

### Managing Your Shared Recipes

**Viewing Active Shares**:
- Access your profile or recipes list
- See all recipes you're currently sharing
- View share URLs, creation dates, and settings

**Regenerating a Share Link**:
1. Open the share dialog for your recipe
2. Click "Regenerate"
3. A new URL is created (the old one stops working)
4. Copy and distribute the new URL

Use this when:
- You want to revoke access to the previous URL
- You suspect the link has been shared beyond intended recipients
- You need to change share settings

**Revoking Share Access**:
1. Open the share dialog for your recipe
2. Click "Stop Sharing"
3. The share link is deleted and stops working immediately

After revoking:
- All existing share URLs for that recipe become invalid
- Recipients see a "not found" error
- You can create a new share later if needed

## Limitations

### One Share Per Recipe

You can only have one active share link per recipe at a time. If you need to share with multiple groups with different permissions:
- Consider duplicating the recipe and sharing each copy differently
- Or use the same link for all recipients (they'll have the same permissions)

### Token Security

The share URL contains a secret token that grants access. Anyone with the complete URL can view the recipe (until it expires or is revoked). Treat share URLs like passwords:
- Only send them to intended recipients
- Use secure channels (avoid posting publicly)
- Regenerate if you suspect unauthorized access

### Image Access Window

Shared recipe images use signed URLs that expire after 1 hour. If a recipient keeps a shared recipe page open for longer than an hour, the image may stop loading. They can refresh the page to get a new signed URL.

### No Collaborative Editing

Sharing is read-only for recipients. If you want to collaborate on recipe development:
- Share the recipe so the collaborator can import it
- They make changes to their copy
- They share their modified version back to you (manual sync)

## Common Use Cases

### Family Recipe Sharing

Share family recipes with relatives who don't use Meal Maestro:
- Create share link with "View Only" (prevents them from needing an account)
- No expiration (family recipes are permanent)
- They can print or reference the recipe anytime

### Recipe Exchange with Friends

Share recipes with friends who are Meal Maestro users:
- Create share link with "Allow Save" enabled
- They import to their account and can customize
- Set expiration if it's a temporary share (e.g., for a dinner party)

### Social Media Recipe Posting

Share a recipe publicly on social media:
- Create share link with appropriate permissions
- Consider "View Only" if you don't want it widely copied
- Set expiration if it's a time-limited offer
- Monitor view count to see engagement

⚠️ **Note**: Once shared publicly, the URL may be cached or re-shared beyond your control. Use expiration dates and regenerate links as needed.

### Cookbook or Meal Plan Distribution

Share a collection of recipes for an event or program:
- Share each recipe individually (one link per recipe)
- Use expiration dates for time-limited access (e.g., during a cooking class)
- Allow save so participants can keep the recipes

## Security Features

### For Recipe Owners

- **Revocable Access**: Delete share links instantly to revoke access
- **Time-Limited Sharing**: Set expiration dates for automatic access removal
- **View Tracking**: Monitor who's accessing your shared recipes (via view counts)
- **Permission Control**: Choose whether recipes can be imported or just viewed

### For Recipients

- **Secure URLs**: Share tokens are cryptographically secure (43 characters)
- **No Account Required**: View recipes without creating an account (unless you want to save them)
- **Privacy**: Your access to shared recipes isn't tracked beyond view counts

## Troubleshooting

### "Recipe not found" Error

Possible causes:
- The share link was deleted by the owner
- The URL was copied incorrectly (missing the token parameter)
- The slug or token is invalid

**Solution**: Ask the recipe owner to verify the share is still active and resend the correct URL.

### "This share link has expired" Error

The recipe owner set an expiration date that has passed.

**Solution**: Ask the recipe owner to create a new share link without expiration or with a later date.

### "You don't have permission to save this recipe" Error

The recipe owner disabled the "Allow Save" permission.

**Solution**: If you need to save the recipe, ask the owner to regenerate the share with "Allow Save" enabled.

### Share Button Not Visible

You can only share recipes you own.

**Solution**: If you want to share a recipe you imported from someone else, you need to create your own share link (each user shares their own copy).

### Image Not Loading After 1 Hour

Shared recipe images use temporary signed URLs that expire.

**Solution**: Refresh the page to get a new signed URL.

## Frequently Asked Questions

**Q: Can I share a recipe I imported from someone else?**
A: Yes, but you're sharing your copy, not the original. Your share link is independent of the original share.

**Q: If I edit a recipe after sharing it, do recipients see the changes?**
A: Yes, share links always show the current version of your recipe. Edits are immediately visible to anyone with the share URL.

**Q: Can I see who viewed my shared recipe?**
A: You can see the total number of views and when it was last viewed, but not the identity of individual viewers.

**Q: What happens if I delete a recipe that's being shared?**
A: The share link is automatically deleted when you delete the recipe. Recipients will see a "not found" error.

**Q: Can recipients modify the recipe I shared?**
A: No. If "Allow Save" is enabled, they can import a copy to their account and modify their copy. Your original remains unchanged.

**Q: Is there a limit to how many recipes I can share?**
A: No, you can share as many recipes as you want (one active share per recipe).

**Q: Can I track who saved my recipe to their account?**
A: No, imports are not tracked. You only see view counts for the shared link.

**Q: What happens if I regenerate a share link?**
A: The old URL immediately stops working. Anyone who previously had the link will need the new URL to access the recipe.
