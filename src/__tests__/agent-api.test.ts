// @vitest-environment node
import { createHash } from "node:crypto";
import { inArray } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { recipes } from "@/db/schema";
import { agentToday, authenticateAgent } from "@/lib/agent-api-auth";
import { GET as list } from "@/app/api/agent/v1/recipes/route";
import { GET as get } from "@/app/api/agent/v1/recipes/[id]/route";
import { PUT as eaten } from "@/app/api/agent/v1/recipes/[id]/eaten/route";
import { recipeAccessCondition } from "@/lib/partnership-service";

const mocks = vi.hoisted(() => {
  const chain = {
    from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    offset: vi.fn(), set: vi.fn().mockReturnThis(), returning: vi.fn(),
  };
  return { chain, select: vi.fn(() => chain), update: vi.fn(() => chain) };
});
vi.mock("@/db", () => ({ db: { select: mocks.select, update: mocks.update } }));
vi.mock("@/lib/partnership-service", () => ({ recipeAccessCondition: vi.fn() }));

const userId = "11111111-1111-4111-8111-111111111111";
const partnerId = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const token = "a".repeat(43);
const date = new Date("2026-01-01T00:00:00.000Z");
const row = {
  id, userId, title: "Spaghetti bolognese", ingredients: [], sections: [],
  description: "Simmer the sauce", servings: 4, category: "main-course",
  cuisine: "italian", season: null, lastEaten: date, totalTime: 30,
  createdAt: date, updatedAt: date,
};
const params = (recipeId = id) => ({ params: Promise.resolve({ id: recipeId }) });
const request = (suffix = "", init: RequestInit = {}) => new Request(
  `https://meal-maestro.example/api/agent/v1/recipes${suffix}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers },
  },
);
const put = (body: unknown = {}, recipeId = id) => eaten(
  request(`/${recipeId}/eaten`, { method: "PUT", body: JSON.stringify(body) }), params(recipeId),
);
const sqlCondition = () => new PgDialect().sqlToQuery(mocks.chain.where.mock.calls[0][0]);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MEAL_MAESTRO_AGENT_TOKEN_SHA256", createHash("sha256").update(token).digest("hex"));
  vi.stubEnv("MEAL_MAESTRO_AGENT_USER_ID", userId);
  vi.stubEnv("MEAL_MAESTRO_AGENT_TIMEZONE", "Europe/Amsterdam");
  vi.mocked(recipeAccessCondition).mockImplementation(async (account) => inArray(recipes.userId, [account, partnerId]));
  mocks.chain.limit.mockReturnValue(mocks.chain);
  mocks.chain.offset.mockResolvedValue([row]);
  mocks.chain.returning.mockResolvedValue([row]);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("personal agent authentication", () => {
  it("binds a valid token only to the configured account", () => {
    expect(authenticateAgent(request())).toEqual({ userId, timeZone: "Europe/Amsterdam" });
  });

  it.each([undefined, "", "Basic abc", `Bearer ${"b".repeat(43)}`, "Bearer short"])(
    "rejects invalid authorization %s without touching the database", async (authorization) => {
      const headers: Record<string, string> = authorization ? { Authorization: authorization } : {};
      const response = await list(new Request("https://example.com/api/agent/v1/recipes", {
        headers: { ...headers, Cookie: "session=browser-session" },
      }));
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain("Bearer");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(mocks.select).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["MEAL_MAESTRO_AGENT_TOKEN_SHA256", ""],
    ["MEAL_MAESTRO_AGENT_TOKEN_SHA256", "not-a-digest"],
    ["MEAL_MAESTRO_AGENT_USER_ID", "not-a-uuid"],
    ["MEAL_MAESTRO_AGENT_TIMEZONE", "Not/AZone"],
  ])("fails closed with invalid configuration %s", async (name, value) => {
    vi.stubEnv(name, value);
    expect((await list(request())).status).toBe(503);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("defaults to Amsterdam and honors timezone day boundaries and DST", () => {
    vi.stubEnv("MEAL_MAESTRO_AGENT_TIMEZONE", "");
    expect(authenticateAgent(request())).toEqual({ userId, timeZone: "Europe/Amsterdam" });
    expect(agentToday("Europe/Amsterdam", new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
    expect(agentToday("Europe/Amsterdam", new Date("2026-01-01T22:30:00Z"))).toBe("2026-01-01");
    expect(agentToday("America/Los_Angeles", new Date("2026-07-01T01:00:00Z"))).toBe("2026-06-30");
  });
});

describe("agent recipe queries", () => {
  it("returns compact snake_case summaries and scoped, stable oldest-first SQL", async () => {
    const response = await list(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("vary")).toBe("Authorization");
    expect(await response.json()).toMatchObject({
      recipes: [{ id, last_eaten: date.toISOString(), total_time: 30 }],
      has_more: false, next_offset: null, timezone: "Europe/Amsterdam",
    });
    expect(recipeAccessCondition).toHaveBeenCalledWith(userId);
    expect(sqlCondition().params).toEqual([userId, partnerId]);
    const sort = new PgDialect().sqlToQuery(mocks.chain.orderBy.mock.calls[0][0]);
    expect(sort.sql).toContain('"last_eaten" asc nulls last');
    expect(mocks.chain.limit).toHaveBeenCalledWith(21);
  });

  it("fetches an extra row to paginate without claiming a total", async () => {
    mocks.chain.offset.mockResolvedValue([row, row, row]);
    const result = await (await list(request("?limit=2&offset=4"))).json();
    expect(result.recipes).toHaveLength(2);
    expect(result).toMatchObject({ has_more: true, next_offset: 6 });
    expect(result.total).toBeUndefined();
    expect(mocks.chain.limit).toHaveBeenCalledWith(3);
    expect(mocks.chain.offset).toHaveBeenCalledWith(4);
  });

  it("handles empty lists and missing dates without inventing history", async () => {
    mocks.chain.offset.mockResolvedValue([]);
    expect(await (await list(request())).json()).toMatchObject({ recipes: [], has_more: false });
    mocks.chain.offset.mockResolvedValue([{ ...row, lastEaten: null }]);
    expect(await (await list(request())).json()).toMatchObject({ recipes: [{ last_eaten: null }] });
  });

  it("supports all-word search, category, dates and recorded filtering", async () => {
    await list(request("?query=bolognese%20spaghetti&category=main-course&eaten_status=recorded&last_eaten_before=2026-02-01"));
    const condition = sqlCondition();
    expect(condition.sql).toContain("is not null");
    expect(condition.params).toEqual(expect.arrayContaining([
      userId, partnerId, "main-course", "2026-02-01T00:00:00.000Z", "%bolognese%", "%spaghetti%",
    ]));
    expect(condition.sql).not.toContain("bolognese"); // parameterized, never interpolated
  });

  it("escapes wildcard search characters and supports unrecorded dates", async () => {
    await list(request("?query=100%25_&eaten_status=unrecorded"));
    expect(sqlCondition().sql).toContain("is null");
    expect(sqlCondition().params).toContain("%100\\%\\_%");
  });

  it.each([
    "limit=0", "limit=101", "limit=NaN", "limit=1.5", "offset=-1", "offset=100001",
    "sort=bad", "category=bad", "eaten_status=bad", "query=", "user_id=other",
    "last_eaten_before=2026-02-30", "eaten_status=unrecorded&last_eaten_before=2026-01-01",
  ])("rejects invalid or privilege-expanding query: %s", async (query) => {
    expect((await list(request(`?${query}`))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns full recipe details using ID AND account access", async () => {
    mocks.chain.limit.mockResolvedValue([row]);
    const response = await get(request(`/${id}`), params());
    expect(await response.json()).toMatchObject({ recipe: {
      id, description: row.description, ingredients: [], last_eaten: date.toISOString(),
    } });
    expect(sqlCondition().params).toEqual([id, userId, partnerId]);
    expect(sqlCondition().sql).toContain(" and ");
  });

  it("returns the same 404 for absent and inaccessible recipes", async () => {
    mocks.chain.limit.mockResolvedValue([]);
    expect((await get(request(`/${id}`), params())).status).toBe(404);
    mocks.chain.returning.mockResolvedValue([]);
    expect((await put()).status).toBe(404);
    expect(sqlCondition().params).toEqual([id, userId, partnerId]);
  });
});

describe("agent mark as eaten", () => {
  it("sets only lastEaten to server-local today, not UTC/terminal today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T22:30:00Z"));
    mocks.chain.returning.mockResolvedValue([{ ...row, lastEaten: new Date("2026-07-02T00:00:00Z") }]);
    const response = await put();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, date: "2026-07-02", recipe: { id } });
    expect(mocks.chain.set).toHaveBeenCalledWith({ lastEaten: new Date("2026-07-02T00:00:00Z") });
    expect(sqlCondition().params).toEqual([id, userId, partnerId]);
  });

  it("allows explicit past dates and repeated PUTs set the same value", async () => {
    await put({ date: "2024-02-29" });
    await put({ date: "2024-02-29" });
    expect(mocks.chain.set.mock.calls).toEqual([
      [{ lastEaten: new Date("2024-02-29T00:00:00Z") }],
      [{ lastEaten: new Date("2024-02-29T00:00:00Z") }],
    ]);
  });

  it.each([
    { date: "2026-02-30" }, { date: "2025-02-29" }, { date: "9999-01-01" },
    { date: "yesterday" }, { date: "2026-01-01T00:00:00Z" }, { date: null },
    { title: "Changed" }, { user_id: partnerId }, { last_eaten: "2026-01-01" }, null, [],
  ])("rejects invalid dates and all unrelated updates: %j", async (body) => {
    expect((await put(body)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON rather than returning 500", async () => {
    const response = await eaten(request(`/${id}/eaten`, { method: "PUT", body: "{" }), params());
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects invalid UUIDs on reads and writes before querying", async () => {
    expect((await get(request("/bad"), params("bad"))).status).toBe(400);
    expect((await put({}, "bad")).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not expose database errors or credentials", async () => {
    mocks.chain.returning.mockRejectedValue(new Error(`secret ${token}`));
    const response = await put();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });
    expect(console.error).toHaveBeenCalledWith("Agent API request failed");
  });
});
