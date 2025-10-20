import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RecipeShareService,
  type StoredShareLinkMetadata,
} from "@/lib/recipe-share-service";

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
