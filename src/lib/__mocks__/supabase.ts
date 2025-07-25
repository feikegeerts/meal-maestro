// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// Generic chainable, thenable query builder mock
function createQueryBuilderMock({
  data = null,
  error = null,
  status = 200,
} = {}) {
  const mock = {};
  // Chainable methods
  const chainMethods = [
    "select",
    "order",
    "eq",
    "overlaps",
    "or",
    "limit",
    "range",
    "match",
    "neq",
    "gt",
    "lt",
    "gte",
    "lte",
    "like",
    "ilike",
    "is",
    "in",
    "contains",
    "containedBy",
    "not",
    "returns",
    "abortSignal",
    "csv",
    "explain",
    "explainAnalyze",
    "explainVerbose",
    "explainSettings",
    "explainBuffers",
    "explainTiming",
    "explainSummary",
    "explainFormat",
    "explainCosts",
    "explainPlan",
    "explainTriggers",
    "explainConstraints",
    "explainIndexes",
    "explainSeqScan",
    "explainBitmapScan",
    "explainSort",
    "explainHash",
    "explainCTE",
    "explainSubplan",
    "explainParallel",
    "explainJIT",
  ];
  chainMethods.forEach((method) => {
    mock[method] = () => mock;
  });
  // .single() and .maybeSingle() should return the first object or null
  mock.single = async () => {
    if (Array.isArray(data)) {
      if (data.length === 0) return { data: null, error, status };
      return { data: data[0], error, status };
    }
    if (data === null || data === undefined)
      return { data: null, error, status };
    return { data, error, status };
  };
  mock.maybeSingle = mock.single;
  // Insert/update/delete return a new mock with the provided data
  mock.insert = (values) =>
    createQueryBuilderMock({ data: values, error: null, status: 201 });
  mock.update = (values) =>
    createQueryBuilderMock({ data: values, error: null, status: 200 });
  mock.delete = () =>
    createQueryBuilderMock({ data: null, error: null, status: 204 });
  // .then for await compatibility
  mock.then = (resolve, reject) => {
    // For .then, mimic .single() behavior if present
    if (Array.isArray(data)) {
      if (data.length === 0)
        return Promise.resolve({ data: null, error, status }).then(
          resolve,
          reject
        );
      return Promise.resolve({ data: data[0], error, status }).then(
        resolve,
        reject
      );
    }
    if (data === null || data === undefined)
      return Promise.resolve({ data: null, error, status }).then(
        resolve,
        reject
      );
    return Promise.resolve({ data, error, status }).then(resolve, reject);
  };
  return mock;
}

const from = jest.fn((table) => {
  // Special case for user_profiles: use MSW-backed fetch to get real test data
  if (table === "user_profiles") {
    return {
      select: function () {
        return this;
      },
      eq: function (col, val) {
        this._eq = { col, val };
        return this;
      },
      single: async function () {
        const id = this._eq?.val || "test-user-id";
        try {
          const response = await globalThis.fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${id}`
          );
          if (!response.ok) {
            return {
              data: null,
              error: {
                message: "Profile fetch failed",
                status: response.status,
              },
              status: response.status,
            };
          }
          const arr = await response.json();
          if (!arr || !Array.isArray(arr) || arr.length === 0) {
            return { data: null, error: null, status: 200 };
          }
          return { data: arr[0], error: null, status: 200 };
        } catch {
          return {
            data: null,
            error: { message: "Network error", status: 500 },
            status: 500,
          };
        }
      },
      update: function (updates) {
        this._updates = updates;
        // Return a chainable object with eq() and single(), using the eq filter in PATCH
        const chain = {
          _eq: null,
          eq: function (col, val) {
            this._eq = { col, val };
            return this;
          },
          select: function () {
            return this;
          },
          single: async function () {
            try {
              // Use the eq filter (id) if present
              let url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles`;
              if (this._eq && this._eq.col === "id") {
                url += `?id=eq.${this._eq.val}`;
              }
              const response = await globalThis.fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates || {}),
              });
              if (!response.ok) {
                return {
                  data: null,
                  error: {
                    message: "Profile update failed",
                    status: response.status,
                  },
                  status: response.status,
                };
              }
              const arr = await response.json();
              if (!arr || !Array.isArray(arr) || arr.length === 0) {
                return { data: null, error: null, status: 200 };
              }
              return { data: arr[0], error: null, status: 200 };
            } catch {
              return {
                data: null,
                error: { message: "Network error", status: 500 },
                status: 500,
              };
            }
          },
        };
        return chain;
      },
      insert: function (values) {
        return {
          single: async () => ({ data: values, error: null, status: 201 }),
        };
      },
      delete: function () {
        return {
          single: async () => ({ data: null, error: null, status: 204 }),
        };
      },
      _eq: null,
      _updates: null,
    };
  }
  // Default: generic chainable mock
  return createQueryBuilderMock({ data: {}, error: null, status: 200 });
});

const mockSupabaseClient = {
  auth: {
    signInWithOAuth: jest.fn().mockResolvedValue({
      data: { url: "https://mock-oauth-url.com" },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),
    getUser: jest.fn().mockImplementation(async () => {
      return {
        data: { user: { id: "test-user", email: "test@example.com" } },
        error: null,
      };
    }),
    getSession: jest.fn().mockImplementation(async () => {
      return {
        data: { session: { access_token: "mock-token" } },
        error: null,
      };
    }),
    onAuthStateChange: jest.fn().mockImplementation((cb) => {
      if (cb)
        cb({ event: "SIGNED_IN", session: { access_token: "mock-token" } });
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    }),
  },
  from,
  rpc: jest.fn(),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      download: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  },
};

const auth = {
  signInWithGoogle: jest.fn().mockImplementation(async () => {
    const isLocalhost =
      global.window?.location?.hostname === "localhost" ||
      global.window?.location?.hostname === "127.0.0.1";
    const redirectTo = isLocalhost
      ? "http://localhost:3000/auth/callback"
      : `${global.window?.location?.origin}/auth/callback`;
    return mockSupabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }),
  signOut: jest
    .fn()
    .mockImplementation(() => mockSupabaseClient.auth.signOut()),
  getCurrentUser: jest.fn().mockImplementation(async () => {
    try {
      const response = await globalThis.fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
        {
          headers: {
            Authorization: "Bearer mock-token",
          },
        }
      );
      if (!response.ok) {
        return {
          user: null,
          error: { message: "User fetch failed", status: response.status },
        };
      }
      const user = await response.json();
      return { user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }),
  getCurrentSession: jest.fn().mockResolvedValue({
    session: { access_token: "mock-token" },
    error: null,
  }),
  onAuthStateChange: jest
    .fn()
    .mockImplementation((callback) =>
      mockSupabaseClient.auth.onAuthStateChange(callback)
    ),
};

module.exports = {
  supabase: mockSupabaseClient,
  auth,
  __esModule: true,
  default: { supabase: mockSupabaseClient, auth },
};
