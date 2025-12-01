import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RecipeShareService,
  type StoredShareLinkMetadata,
} from "@/lib/recipe-share-service";
import * as crypto from "crypto";
import { RecipeCategory } from "@/types/recipe";

type SelectBuilder = {
  select: (columns: string) => SelectBuilder;
  eq: (column: string, value: string) => SelectBuilder;
  maybeSingle: () => Promise<MaybeSingleResult>;
};

type UpdateBuilder = {
  update: (values: Record<string, unknown>) => UpdateBuilder;
  eq: (column: string, value: string) => Promise<{ data: null; error: null }>;
};

type MaybeSingleResult =
  | {
      data: { shared_recipe_links: StoredShareLinkMetadata[] | null };
      error: null;
    }
  | {
      data: null;
      error: { code: string };
    };

function createSupabaseMock(options: {
  initialLinks?: StoredShareLinkMetadata[] | null;
  selectErrorCode?: string | null;
}) {
  const state = {
    rawColumn:
      options.initialLinks === undefined
        ? ([] as StoredShareLinkMetadata[])
        : options.initialLinks === null
          ? null
          : [...options.initialLinks],
    selectCalls: 0,
    updateCalls: 0,
  };

  const selectBuilder: SelectBuilder = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    maybeSingle: async () => {
      state.selectCalls += 1;
      if (options.selectErrorCode) {
        return { data: null, error: { code: options.selectErrorCode } };
      }
      return { data: { shared_recipe_links: state.rawColumn }, error: null };
    },
  };

  const updateBuilder: UpdateBuilder = {
    update(values) {
      state.updateCalls += 1;
      state.rawColumn = (values.shared_recipe_links ?? []) as
        | StoredShareLinkMetadata[]
        | null;
      return this;
    },
    async eq() {
      return { data: null, error: null };
    },
  };

  const mockSupabase = {
    from(table: string) {
      if (table !== "user_profiles") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: selectBuilder.select.bind(selectBuilder),
        eq: selectBuilder.eq.bind(selectBuilder),
        maybeSingle: selectBuilder.maybeSingle,
        update: updateBuilder.update.bind(updateBuilder),
      };
    },
    state,
  } as unknown as SupabaseClient & { state: typeof state };

  return mockSupabase;
}

function createShareLinkSupabaseMock() {
  const state = {
    insertCalls: [] as unknown[],
  };

  const deleteChain = {
    eq: () => ({
      eq: async () => ({ data: null, error: null }),
    }),
  };

  const supabase = {
    from(table: string) {
      if (table !== "shared_recipe_links") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        delete: () => deleteChain,
        insert: (rows: unknown[]) => {
          const row = rows[0] as Record<string, unknown>;
          state.insertCalls.push(row);
          return {
            select: () => ({
              single: async () => {
                if (state.insertCalls.length === 1) {
                  return { data: null, error: { code: "23505" } };
                }
                return {
                  data: {
                    slug: row.slug,
                    expires_at: row.expires_at ?? null,
                    allow_save: row.allow_save,
                    created_at: "2025-01-01T00:00:00.000Z",
                  },
                  error: null,
                };
              },
            }),
          };
        },
      };
    },
    state,
  } as unknown as SupabaseClient & { state: typeof state };

  return supabase;
}

async function loadServiceWithAdminMock<T extends Record<string, unknown>>(
  adminMock: T
) {
  process.env.SUPABASE_URL = "https://admin.supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  jest.resetModules();
  jest.doMock("@supabase/supabase-js", () => ({
    createClient: jest.fn(() => adminMock),
  }));

  const shareModule = await import("@/lib/recipe-share-service");
  return shareModule.RecipeShareService;
}

const baseLink = (overrides: Partial<StoredShareLinkMetadata> = {}): StoredShareLinkMetadata => ({
  recipeId: "recipe-1",
  slug: "slug-1",
  token: "token-1",
  allowSave: true,
  expiresAt: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
  ...overrides,
});

describe("RecipeShareService share metadata helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2025-02-01T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("saveShareLinkMetadata", () => {
    it("stores new share metadata and preserves existing entries", async () => {
      const existing = [baseLink({ recipeId: "recipe-existing", slug: "existing", token: "token-existing" })];
      const supabase = createSupabaseMock({ initialLinks: existing });

      await RecipeShareService.saveShareLinkMetadata(supabase, "user-1", "recipe-1", {
        slug: "new-slug",
        token: "new-token",
        allowSave: false,
        expiresAt: "2025-03-01T00:00:00.000Z",
        createdAt: "2025-02-01T11:00:00.000Z",
      });

      expect(supabase.state.selectCalls).toBe(1);
      expect(supabase.state.updateCalls).toBe(1);
      const stored = (supabase.state.rawColumn ?? []) as StoredShareLinkMetadata[];
      expect(stored).toHaveLength(2);
      const storedNew = stored.find((link) => link.recipeId === "recipe-1");
      expect(storedNew).toMatchObject({
        slug: "new-slug",
        token: "new-token",
        allowSave: false,
        expiresAt: "2025-03-01T00:00:00.000Z",
        createdAt: "2025-02-01T11:00:00.000Z",
      });
      expect(storedNew?.updatedAt).toBe("2025-02-01T12:00:00.000Z");
    });

    it("replaces metadata for the same recipe", async () => {
      const supabase = createSupabaseMock({
        initialLinks: [
          baseLink({ recipeId: "recipe-1", slug: "old", token: "old-token" }),
          baseLink({ recipeId: "recipe-2", slug: "another", token: "token-2" }),
        ],
      });

      await RecipeShareService.saveShareLinkMetadata(supabase, "user-1", "recipe-1", {
        slug: "updated",
        token: "new-token",
        allowSave: true,
        expiresAt: null,
        createdAt: "2025-02-01T10:00:00.000Z",
      });

      const stored = (supabase.state.rawColumn ?? []) as StoredShareLinkMetadata[];
      expect(stored).toHaveLength(2);
      const updated = stored.find((link) => link.recipeId === "recipe-1");
      expect(updated).toMatchObject({ slug: "updated", token: "new-token" });
    });
  });

  describe("getShareLinkMetadataForRecipe", () => {
    it("returns stored metadata when present", async () => {
      const supabase = createSupabaseMock({
        initialLinks: [
          baseLink({ recipeId: "recipe-1", slug: "match", token: "token-1" }),
          baseLink({ recipeId: "recipe-2", slug: "other", token: "token-2" }),
        ],
      });

      const result = await RecipeShareService.getShareLinkMetadataForRecipe(
        supabase,
        "user-1",
        "recipe-2"
      );

      expect(result).toEqual(
        expect.objectContaining({ recipeId: "recipe-2", slug: "other", token: "token-2" })
      );
    });

    it("returns null when no entries exist", async () => {
      const supabase = createSupabaseMock({ initialLinks: [] });

      const result = await RecipeShareService.getShareLinkMetadataForRecipe(
        supabase,
        "user-1",
        "recipe-unknown"
      );

      expect(result).toBeNull();
    });
  });

  describe("removeShareLinkMetadata", () => {
    it("removes only the matching recipe entry", async () => {
      const supabase = createSupabaseMock({
        initialLinks: [
          baseLink({ recipeId: "recipe-1" }),
          baseLink({ recipeId: "recipe-2" }),
        ],
      });

      await RecipeShareService.removeShareLinkMetadata(
        supabase,
        "user-1",
        "recipe-1"
      );

      const stored = (supabase.state.rawColumn ?? []) as StoredShareLinkMetadata[];
      expect(stored).toHaveLength(1);
      expect(stored[0].recipeId).toBe("recipe-2");
    });

    it("no-ops when nothing matches", async () => {
      const supabase = createSupabaseMock({ initialLinks: [baseLink({ recipeId: "recipe-1" })] });

      await RecipeShareService.removeShareLinkMetadata(
        supabase,
        "user-1",
        "recipe-not-found"
      );

      expect(supabase.state.updateCalls).toBe(0);
      const stored = (supabase.state.rawColumn ?? []) as StoredShareLinkMetadata[];
      expect(stored).toHaveLength(1);
    });
  });

  describe("listShareLinkMetadata", () => {
    it("returns normalized data and ignores malformed entries", async () => {
      const supabase = createSupabaseMock({
        initialLinks: [],
      });
      // Inject malformed raw array by mutating state before call
      supabase.state.rawColumn = [
        baseLink({ recipeId: "recipe-1" }),
        // @ts-expect-error - intentionally malformed entry
        { recipeId: 123, slug: null },
      ];

      const result = await RecipeShareService.listShareLinkMetadata(
        supabase,
        "user-1"
      );

      expect(result).toHaveLength(1);
      expect(result[0].recipeId).toBe("recipe-1");
    });

    it("treats missing column as empty array", async () => {
      const supabase = createSupabaseMock({ initialLinks: null });

      const result = await RecipeShareService.listShareLinkMetadata(
        supabase,
        "user-1"
      );

      expect(result).toEqual([]);
    });
  });

  describe("buildSharePath", () => {
    it("builds locale aware paths", () => {
      expect(RecipeShareService.buildSharePath("nl", "slug", "tok en")).toBe(
        "/nl/share/slug?token=tok%20en"
      );
      expect(RecipeShareService.buildSharePath("en", "slug", "token")).toBe(
        "/en/share/slug?token=token"
      );
      expect(RecipeShareService.buildSharePath("fr", "slug", "token")).toBe(
        "/nl/share/slug?token=token"
      );
    });
  });
});

describe("RecipeShareService core operations", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe("createShareLink", () => {
    it("retries on slug collision before succeeding", async () => {
      const supabase = createShareLinkSupabaseMock();
      const randomValues = [
        Buffer.from([1, 2, 3, 4, 5, 6]), // slug attempt 1
        Buffer.alloc(32, 1), // token attempt 1
        Buffer.from([6, 5, 4, 3, 2, 1]), // slug attempt 2
        Buffer.alloc(32, 2), // token attempt 2
      ];
      const randomSpy = jest
        .spyOn(crypto, "randomBytes")
        .mockImplementation((size) => {
          const next = randomValues.shift();
          return next && next.length === size ? next : Buffer.alloc(size, 0);
        });

      const result = await RecipeShareService.createShareLink(
        supabase,
        "user-1",
        "recipe-abc",
        { allowSave: false, expiresAt: "2025-02-02T00:00:00.000Z" }
      );

      expect(supabase.state.insertCalls).toHaveLength(2);
      const [firstInsert, secondInsert] = supabase.state
        .insertCalls as Record<string, unknown>[];
      expect(firstInsert.slug).not.toBe(secondInsert.slug);
      expect(result.slug).toBe(secondInsert.slug);
      expect(result.allowSave).toBe(false);
      expect(result.expiresAt).toBe("2025-02-02T00:00:00.000Z");
      expect(result.token).toHaveLength(43); // 32-byte base64url

      randomSpy.mockRestore();
    });
  });

  describe("getShareLinkForRecipe", () => {
    it("returns null on PGRST116 (no rows)", async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await RecipeShareService.getShareLinkForRecipe(
        supabase,
        "user-1",
        "recipe-missing"
      );

      expect(result).toBeNull();
    });

    it("maps stored record fields", async () => {
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    slug: "slug-123",
                    allow_save: false,
                    expires_at: "2025-03-01T00:00:00.000Z",
                    created_at: "2025-02-01T00:00:00.000Z",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await RecipeShareService.getShareLinkForRecipe(
        supabase,
        "user-1",
        "recipe-123"
      );

      expect(result).toEqual({
        slug: "slug-123",
        allowSave: false,
        expiresAt: "2025-03-01T00:00:00.000Z",
        createdAt: "2025-02-01T00:00:00.000Z",
      });
    });
  });

  describe("admin-backed operations", () => {
    it("throws TOKEN_INVALID when token hash does not match", async () => {
      const correctHash = crypto
        .createHash("sha256")
        .update("correct-token")
        .digest("hex");
      const admin = {
        from: jest.fn((table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === "shared_recipe_links") {
                  return {
                    data: {
                      id: "link-1",
                      recipe_id: "recipe-1",
                      owner_id: "owner-1",
                      token_hash: correctHash,
                      allow_save: true,
                      expires_at: null,
                    },
                    error: null,
                  };
                }
                return { data: null, error: null };
              },
            }),
          }),
        })),
        storage: { from: jest.fn() },
      };

      const Service = await loadServiceWithAdminMock(admin);

      await expect(
        Service.getSharedRecipe("slug-1", "wrong-token")
      ).rejects.toMatchObject({ code: "TOKEN_INVALID" });

      expect((admin.from as jest.Mock)).toHaveBeenCalledTimes(1);
    });

    it("returns signed url for valid storage path and null otherwise", async () => {
      const createSignedUrl = jest.fn(async () => ({
        data: { signedUrl: "https://signed.test/image.webp" },
        error: null,
      }));
      const admin = {
        from: jest.fn(),
        storage: {
          from: jest.fn(() => ({
            createSignedUrl,
          })),
        },
      };

      const Service = await loadServiceWithAdminMock(admin);

      const result = await Service.createSignedImageUrl(
        "https://example.com/storage/v1/object/public/recipe-images/user/recipe/image.webp"
      );
      expect(result).toBe("https://signed.test/image.webp");
      expect(createSignedUrl).toHaveBeenCalledWith(
        "user/recipe/image.webp",
        60 * 60
      );

      const nullResult = await Service.createSignedImageUrl(null);
      expect(nullResult).toBeNull();
    });

    it("copies images and returns updated metadata", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2025-02-01T12:00:00.000Z"));
      const copy = jest.fn(async () => ({ data: null, error: null }));
      const getPublicUrl = jest.fn(() => ({
        data: { publicUrl: "https://cdn.test/new-path.webp" },
      }));
      const admin = {
        from: jest.fn(),
        storage: {
          from: jest.fn(() => ({
            copy,
            getPublicUrl,
          })),
        },
      };
      const Service = await loadServiceWithAdminMock(admin);

      const result = await Service.copyImageForUser(
        "https://example.com/storage/v1/object/public/recipe-images/source/path.webp",
        "new-user",
        "new-recipe",
        {
          originalSize: 2000,
          compressedSize: 1500,
          compressionRatio: 0.75,
          dimensions: { width: 100, height: 200 },
          format: "webp",
          uploadedAt: "2024-01-01T00:00:00.000Z",
        }
      );

      expect(copy).toHaveBeenCalledWith(
        "source/path.webp",
        expect.stringMatching(/^new-user\/new-recipe\//)
      );
      const destinationPath = (copy.mock.calls[0] as string[])[1];
      expect(getPublicUrl).toHaveBeenCalledWith(destinationPath);
      expect(result).toEqual({
        imageUrl: "https://cdn.test/new-path.webp",
        imageMetadata: expect.objectContaining({
          dimensions: { width: 100, height: 200 },
          format: "webp",
          uploadedAt: "2025-02-01T12:00:00.000Z",
        }),
      });
      jest.useRealTimers();
    });

    it("throws IMAGE_COPY_FAILED when storage copy fails", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const copy = jest.fn(async () => ({
        data: null,
        error: new Error("copy failed"),
      }));
      const admin = {
        from: jest.fn(),
        storage: {
          from: jest.fn(() => ({
            copy,
            getPublicUrl: jest.fn(),
          })),
        },
      };
      const Service = await loadServiceWithAdminMock(admin);

      await expect(
        Service.copyImageForUser(
          "https://example.com/storage/v1/object/public/recipe-images/source/path.webp",
        "user",
        "recipe",
        null
      )
      ).rejects.toMatchObject({ code: "IMAGE_COPY_FAILED" });

      consoleSpy.mockRestore();
    });

    it("increments view count and logs on failure", async () => {
      const update = jest.fn(async (_args?: unknown) => {
        void _args;
        return { data: null, error: null };
      });
      const selectMaybeSingle = jest.fn(async () => ({
        data: { view_count: 2 },
        error: null,
      }));
      const admin = {
        from: jest.fn((table: string) => {
          void table;
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: selectMaybeSingle,
              }),
            }),
            update: (values: unknown) => ({
              eq: (column: string, value: string) => {
                return update({ values, column, value });
              },
            }),
          };
        }),
        storage: { from: jest.fn() },
      };
      const Service = await loadServiceWithAdminMock(admin);

      await Service.recordView("link-1");

      expect(selectMaybeSingle).toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith({
        values: expect.objectContaining({ view_count: 3 }),
        column: "id",
        value: "link-1",
      });

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const failingAdmin = {
        from: jest.fn(() => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: null,
                error: new Error("db down"),
              }),
            }),
          }),
          update: jest.fn(),
        })),
        storage: { from: jest.fn() },
      };
      const ServiceWithError = await loadServiceWithAdminMock(failingAdmin);

      await ServiceWithError.recordView("link-err");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to record share view",
        expect.any(Error)
      );
    });
  });

  describe("buildPublicPayload", () => {
    it("removes user_id and image_url from public recipe", () => {
      const data = {
        linkId: "link-1",
        allowSave: true,
        expiresAt: null,
        ownerId: "owner-1",
        ownerDisplayName: "Owner",
        recipe: {
          id: "recipe-1",
          title: "Title",
          ingredients: [
            { id: "ing-1", name: "Water", amount: null, unit: null },
          ],
          servings: 2,
          description: "desc",
          category: RecipeCategory.MAIN_COURSE,
          diet_types: [],
          cooking_methods: [],
          dish_types: [],
          proteins: [],
          occasions: [],
          characteristics: [],
          last_eaten: undefined,
          image_url: "https://example.com/image.webp",
          image_metadata: null,
          created_at: "2025-01-01T00:00:00.000Z",
          updated_at: "2025-01-02T00:00:00.000Z",
          user_id: "owner-1",
        },
      };

      const payload = RecipeShareService.buildPublicPayload(data, "signed-url");

      expect(payload.recipe.user_id).toBeUndefined();
      expect(payload.recipe.image_url).toBeNull();
      expect(payload.signedImageUrl).toBe("signed-url");
      expect(payload.originalRecipeId).toBe("recipe-1");
    });
  });
});
