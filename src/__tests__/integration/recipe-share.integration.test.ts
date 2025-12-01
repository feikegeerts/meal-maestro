import { NextRequest } from "next/server";
import { POST as sharePost, GET as shareGet, DELETE as shareDelete } from "@/app/api/recipes/[id]/share/route";
import { GET as sharedGet } from "@/app/api/shared-recipes/[slug]/route";
import { POST as importPost } from "@/app/api/shared-recipes/[slug]/import/route";
import { RecipeShareService, SharedRecipeError } from "@/lib/recipe-share-service";
import { RecipeCategory, type Recipe } from "@/types/recipe";
import { mockUser } from "@/__mocks__/handlers";

jest.mock("@/lib/auth-server", () => ({
  requireAuth: jest.fn(),
}));

const requireAuth = jest.requireMock("@/lib/auth-server").requireAuth as jest.Mock;

type OwnershipMaybeSingle = () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
type OwnershipEq = () => { eq: OwnershipEq; maybeSingle: OwnershipMaybeSingle };

const buildSupabaseOwnershipMock = () => {
  const maybeSingle: OwnershipMaybeSingle = jest.fn(async () => ({
    data: { id: "recipe-1" },
    error: null,
  }));
  const eq: OwnershipEq = jest.fn(() => ({ eq, maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn((table: string) => {
    if (table === "recipes") {
      return { select };
    }
    return {};
  });
  return { from, _select: select, _eq: eq, _maybeSingle: maybeSingle };
};

describe("Recipe share API routes (integration)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("POST /api/recipes/:id/share", () => {
    it("creates a share link and returns locale-aware path", async () => {
      const supabase = buildSupabaseOwnershipMock();
      requireAuth.mockResolvedValue({ user: mockUser, client: supabase });
      const createShareLink = jest
        .spyOn(RecipeShareService, "createShareLink")
        .mockResolvedValue({
          slug: "slug-123",
          token: "token-abc",
          allowSave: false,
          expiresAt: null,
          createdAt: "2025-01-01T00:00:00.000Z",
        });
      const saveMetadata = jest
        .spyOn(RecipeShareService, "saveShareLinkMetadata")
        .mockResolvedValue();

      const requestBody = JSON.stringify({ allowSave: false });
      const request = new NextRequest("http://localhost/api/recipes/recipe-1/share", {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json",
          "Content-Length": String(requestBody.length),
          Referer: "http://localhost/en/recipes/recipe-1",
        }),
        body: requestBody,
      });

      const response = await sharePost(request, { params: Promise.resolve({ id: "recipe-1" }) });
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.sharePath).toBe("/en/share/slug-123?token=token-abc");
      expect(createShareLink).toHaveBeenCalledWith(supabase, mockUser.id, "recipe-1", {
        expiresAt: null,
        allowSave: false,
      });
      expect(saveMetadata).toHaveBeenCalled();
    });

    it("returns 401 when authentication fails", async () => {
      requireAuth.mockResolvedValue(new Response("unauthorized", { status: 401 }));
      const request = new NextRequest("http://localhost/api/recipes/recipe-1/share", {
        method: "POST",
      });

      const response = await sharePost(request, { params: Promise.resolve({ id: "recipe-1" }) });
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/recipes/:id/share", () => {
    it("returns existing share data with share path", async () => {
      const supabase = buildSupabaseOwnershipMock();
      requireAuth.mockResolvedValue({ user: mockUser, client: supabase });

      jest.spyOn(RecipeShareService, "getShareLinkForRecipe").mockResolvedValue({
        slug: "slug-123",
        allowSave: true,
        expiresAt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
      });
      jest.spyOn(RecipeShareService, "getShareLinkMetadataForRecipe").mockResolvedValue({
        recipeId: "recipe-1",
        slug: "slug-123",
        token: "token-abc",
        allowSave: true,
        expiresAt: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      });

      const request = new NextRequest("http://localhost/api/recipes/recipe-1/share?locale=nl");
      const response = await shareGet(request, { params: Promise.resolve({ id: "recipe-1" }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.share.slug).toBe("slug-123");
      expect(body.share.sharePath).toBe("/nl/share/slug-123?token=token-abc");
    });
  });

  describe("DELETE /api/recipes/:id/share", () => {
    it("removes share link and metadata", async () => {
      const supabase = buildSupabaseOwnershipMock();
      requireAuth.mockResolvedValue({ user: mockUser, client: supabase });
      const deleteLink = jest.spyOn(RecipeShareService, "deleteShareLink").mockResolvedValue();
      const removeMetadata = jest
        .spyOn(RecipeShareService, "removeShareLinkMetadata")
        .mockResolvedValue();

      const request = new NextRequest("http://localhost/api/recipes/recipe-1/share", {
        method: "DELETE",
      });
      const response = await shareDelete(request, { params: Promise.resolve({ id: "recipe-1" }) });

      expect(response.status).toBe(200);
      expect(deleteLink).toHaveBeenCalledWith(expect.anything(), mockUser.id, "recipe-1");
      expect(removeMetadata).toHaveBeenCalledWith(expect.anything(), mockUser.id, "recipe-1");
    });
  });
});

describe("Shared recipe public and import routes (integration)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("returns shared recipe payload when token is valid", async () => {
    const recordView = jest.spyOn(RecipeShareService, "recordView").mockResolvedValue();
    jest.spyOn(RecipeShareService, "createSignedImageUrl").mockResolvedValue("https://signed.test/image.webp");
    jest.spyOn(RecipeShareService, "getSharedRecipe").mockResolvedValue({
      linkId: "link-1",
      allowSave: true,
      expiresAt: null,
      ownerId: mockUser.id,
      ownerDisplayName: "Owner",
      recipe: {
        id: "recipe-1",
        title: "Shared",
        ingredients: [],
        servings: 2,
        description: "desc",
        category: RecipeCategory.MAIN_COURSE,
        user_id: mockUser.id,
      } as Recipe,
    });

    const request = new NextRequest("http://localhost/api/shared-recipes/slug-1?token=token-abc");
    const response = await sharedGet(request, { params: Promise.resolve({ slug: "slug-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.originalRecipeId).toBe("recipe-1");
    expect(body.signedImageUrl).toBe("https://signed.test/image.webp");
    expect(recordView).toHaveBeenCalledWith("link-1");
  });

  it("returns 404 when token invalid", async () => {
    jest.spyOn(RecipeShareService, "getSharedRecipe").mockImplementation(() => {
      throw new SharedRecipeError("Invalid token", "TOKEN_INVALID");
    });

    const request = new NextRequest("http://localhost/api/shared-recipes/slug-1?token=bad");
    const response = await sharedGet(request, { params: Promise.resolve({ slug: "slug-1" }) });

    expect(response.status).toBe(404);
  });

  it("imports shared recipe and copies image metadata", async () => {
    const supabaseInsert = jest.fn(async () => ({
      data: { id: "new-recipe", title: "Imported", user_id: "user-2" },
      error: null,
    }));
    const supabaseUpdate = jest.fn(async () => ({
      data: { id: "new-recipe", title: "Imported", user_id: "user-2", image_url: "https://cdn.test/new.webp" },
      error: null,
    }));
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "recipes") {
          return {
            insert: () => ({ select: () => ({ single: supabaseInsert }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: supabaseUpdate }) }) }),
          };
        }
        return {};
      }),
    };
    requireAuth.mockResolvedValue({ user: { id: "user-2" }, client: supabase });

    jest.spyOn(RecipeShareService, "getSharedRecipe").mockResolvedValue({
      linkId: "link-1",
      allowSave: true,
      expiresAt: null,
      ownerId: "owner-1",
      ownerDisplayName: "Owner",
      recipe: {
        id: "recipe-1",
        title: "Shared",
        ingredients: [],
        servings: 2,
        description: "desc",
        category: RecipeCategory.MAIN_COURSE,
        user_id: "owner-1",
        image_url: "https://example.com/storage/v1/object/public/recipe-images/path.webp",
        image_metadata: {
          originalSize: 1000,
          compressedSize: 800,
          compressionRatio: 0.8,
          dimensions: { width: 100, height: 200 },
          format: "webp",
          uploadedAt: "2025-01-01T00:00:00.000Z",
        },
      } as Recipe,
    });
    jest.spyOn(RecipeShareService, "copyImageForUser").mockResolvedValue({
      imageUrl: "https://cdn.test/new.webp",
      imageMetadata: {
        originalSize: 1000,
        compressedSize: 800,
        compressionRatio: 0.8,
        dimensions: { width: 100, height: 200 },
        format: "webp",
        uploadedAt: "2025-02-01T00:00:00.000Z",
      },
    });

    const request = new NextRequest("http://localhost/api/shared-recipes/slug-1/import", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ token: "token-abc" }),
    });
    const response = await importPost(request, { params: Promise.resolve({ slug: "slug-1" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.recipe.id).toBe("new-recipe");
    expect(body.warnings).toEqual([]);
    expect(RecipeShareService.copyImageForUser).toHaveBeenCalled();
  });

  it("returns warning when image copy fails during import", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const supabaseInsert = jest.fn(async () => ({
      data: { id: "new-recipe", title: "Imported", user_id: "user-2" },
      error: null,
    }));
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === "recipes") {
          return {
            insert: () => ({ select: () => ({ single: supabaseInsert }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: jest.fn() }) }) }),
          };
        }
        return {};
      }),
    };
    requireAuth.mockResolvedValue({ user: { id: "user-2" }, client: supabase });

    jest.spyOn(RecipeShareService, "getSharedRecipe").mockResolvedValue({
      linkId: "link-1",
      allowSave: true,
      expiresAt: null,
      ownerId: "owner-1",
      ownerDisplayName: "Owner",
      recipe: {
        id: "recipe-1",
        title: "Shared",
        ingredients: [],
        servings: 2,
        description: "desc",
        category: RecipeCategory.MAIN_COURSE,
        user_id: "owner-1",
        image_url: "https://example.com/storage/v1/object/public/recipe-images/path.webp",
        image_metadata: null,
      } as Recipe,
    });
    jest
      .spyOn(RecipeShareService, "copyImageForUser")
      .mockRejectedValue(new SharedRecipeError("image copy failed", "IMAGE_COPY_FAILED"));

    const request = new NextRequest("http://localhost/api/shared-recipes/slug-1/import", {
      method: "POST",
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ token: "token-abc" }),
    });
    const response = await importPost(request, { params: Promise.resolve({ slug: "slug-1" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.warnings).toContain("IMAGE_COPY_FAILED");
    consoleSpy.mockRestore();
  });
});
