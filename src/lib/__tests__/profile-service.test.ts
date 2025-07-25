import { profileService } from "../profile-service";
import { server } from "../../__mocks__/server";
import { http, HttpResponse } from "msw";
import { mockProfile } from "../../__mocks__/handlers";

describe("Profile Service", () => {
  afterAll(async () => {
    jest.clearAllTimers();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  describe("getUserProfile", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    beforeAll(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
    it("should fetch user profile successfully", async () => {
      const result = await profileService.getUserProfile("test-user-id");
      // The handler returns [mockProfile], but service expects object or null
      // So the service should return mockProfile
      expect(result).toEqual(mockProfile);
    });

    it("should return null when profile not found", async () => {
      const result = await profileService.getUserProfile("non-existent-user");
      // The handler returns [], so service should return null
      expect(result).toBe(null);
    });

    it("should handle server errors gracefully", async () => {
      // Mock server error
      server.use(
        http.get("*/rest/v1/user_profiles*", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const result = await profileService.getUserProfile("test-user-id");

      expect(result).toBe(null);
    });

    it("should handle network errors gracefully", async () => {
      // Mock network error
      server.use(
        http.get("*/rest/v1/user_profiles*", () => {
          throw new Error("Network error");
        })
      );

      const result = await profileService.getUserProfile("test-user-id");

      expect(result).toBe(null);
    });

    it("should handle Supabase errors gracefully", async () => {
      // Mock Supabase error response
      server.use(
        http.get("*/rest/v1/user_profiles*", () => {
          return HttpResponse.json(
            {
              error: {
                code: "PGRST116",
                details: "Row not found",
                hint: null,
                message:
                  "JSON object requested, multiple (or no) rows returned",
              },
            },
            { status: 406 }
          );
        })
      );

      const result = await profileService.getUserProfile("test-user-id");

      expect(result).toBe(null);
    });
  });

  describe("updateUserProfile", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    beforeAll(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
    it("should update user profile successfully", async () => {
      const updates = {
        display_name: "Updated Name",
        avatar_url: "https://example.com/new-avatar.jpg",
      };
      const result = await profileService.updateUserProfile(
        "test-user-id",
        updates
      );
      // The handler returns [{...}], so service should return the first object
      expect(result).toEqual({
        ...mockProfile,
        ...updates,
      });
    });

    it("should handle partial updates", async () => {
      const updates = {
        display_name: "New Name Only",
      };
      const result = await profileService.updateUserProfile(
        "test-user-id",
        updates
      );
      expect(result).toEqual({
        ...mockProfile,
        display_name: "New Name Only",
      });
    });

    it("should handle server errors gracefully", async () => {
      // Mock server error
      server.use(
        http.patch("*/rest/v1/user_profiles*", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const updates = { display_name: "Test" };
      const result = await profileService.updateUserProfile(
        "test-user-id",
        updates
      );

      expect(result).toBe(null);
    });

    it("should handle network errors gracefully", async () => {
      // Mock network error
      server.use(
        http.patch("*/rest/v1/user_profiles*", () => {
          throw new Error("Network error");
        })
      );

      const updates = { display_name: "Test" };
      const result = await profileService.updateUserProfile(
        "test-user-id",
        updates
      );

      expect(result).toBe(null);
    });

    it("should handle permission errors", async () => {
      // Mock permission error
      server.use(
        http.patch("*/rest/v1/user_profiles*", () => {
          return new HttpResponse(null, { status: 403 });
        })
      );

      const updates = { display_name: "Test" };
      const result = await profileService.updateUserProfile(
        "test-user-id",
        updates
      );

      expect(result).toBe(null);
    });

    it("should handle empty updates", async () => {
      const updates = {};
      const result = await profileService.updateUserProfile(
        "test-user-id",
        updates
      );
      expect(result).toEqual(mockProfile);
    });
  });
});
