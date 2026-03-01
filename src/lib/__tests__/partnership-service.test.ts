import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mutable state for per-test DB responses
// ---------------------------------------------------------------------------

let partnershipRows: object[] = [];
let insertedPartnerships: object[] = [];
let deletedIds: string[] = [];

vi.mock("@/db", () => {
  const selectFn = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation(() => ({
        limit: vi.fn().mockImplementation(async () => {
          return partnershipRows;
        }),
      })),
    })),
  }));

  const insertFn = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockImplementation((vals: object) => ({
      returning: vi.fn().mockImplementation(async () => {
        insertedPartnerships.push(vals);
        return [{ id: "new-id", ...vals, createdAt: new Date(), updatedAt: new Date() }];
      }),
    })),
  }));

  const updateFn = vi.fn().mockImplementation(() => ({
    set: vi.fn().mockImplementation((data: { status?: string }) => ({
      where: vi.fn().mockImplementation(() => ({
        returning: vi.fn().mockImplementation(async () => {
          return [{ id: "p-1", ...data, createdAt: new Date(), updatedAt: new Date() }];
        }),
      })),
    })),
  }));

  const deleteFn = vi.fn().mockImplementation(() => ({
    where: vi.fn().mockImplementation(async () => {
      deletedIds.push("deleted");
      return [];
    }),
  }));

  const transactionFn = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
    await cb({
      insert: insertFn,
      delete: deleteFn,
    });
  });

  return {
    db: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
      delete: deleteFn,
      transaction: transactionFn,
      __selectFn: selectFn,
    },
  };
});

vi.mock("@/lib/email/email-service", () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendLocalizedEmail: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

// ---------------------------------------------------------------------------
// Now import the service under test (after mocks are set up)
// ---------------------------------------------------------------------------

import {
  getPartnerUserIds,
  sendInvitation,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  removePartnership,
  PartnershipError,
} from "@/lib/partnership-service";
import { db } from "@/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePartnership(overrides: Partial<{
  id: string;
  inviterId: string;
  inviteeId: string;
  inviteeEmail: string;
  status: string;
}> = {}) {
  return {
    id: "p-1",
    inviterId: "user-a",
    inviteeId: "user-b",
    inviteeEmail: "b@test.com",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProfile(overrides: Partial<{ id: string; email: string; displayName: string }> = {}) {
  return {
    id: "user-b",
    email: "b@test.com",
    displayName: "User B",
    avatarUrl: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getPartnerUserIds", () => {
  beforeEach(() => {
    partnershipRows = [];
    vi.clearAllMocks();
  });

  it("returns only the user's own id when they have no accepted partner", async () => {
    partnershipRows = [];
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await getPartnerUserIds("user-a");
    expect(result).toEqual(["user-a"]);
  });

  it("includes the partner id when an accepted partnership exists", async () => {
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([makePartnership({ status: "accepted" })]),
      }),
    });

    const result = await getPartnerUserIds("user-a");
    expect(result).toContain("user-a");
    expect(result).toContain("user-b");
    expect(result).toHaveLength(2);
  });

  it("does not include pending or declined partnerships", async () => {
    (db.select as Mock).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await getPartnerUserIds("user-a");
    expect(result).toEqual(["user-a"]);
  });
});

describe("sendInvitation", () => {
  beforeEach(() => {
    partnershipRows = [];
    insertedPartnerships = [];
    vi.clearAllMocks();
  });

  it("throws SELF_INVITE when inviter and invitee are the same user", async () => {
    (db.select as Mock)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([makeProfile({ id: "user-a" })]),
          }),
        }),
      });

    await expect(sendInvitation("user-a", "a@test.com")).rejects.toMatchObject({
      code: "SELF_INVITE",
    });
  });

  it("throws NO_USER_FOUND when invitee email doesn't exist", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(sendInvitation("user-a", "nobody@test.com")).rejects.toMatchObject({
      code: "NO_USER_FOUND",
    });
  });

  it("throws DUPLICATE_INVITE when a pending invitation already exists", async () => {
    let callCount = 0;
    (db.select as Mock).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return [makeProfile()]; // invitee lookup
            return [makePartnership({ status: "pending" })]; // existing check
          }),
        }),
      }),
    }));

    await expect(sendInvitation("user-a", "b@test.com")).rejects.toMatchObject({
      code: "DUPLICATE_INVITE",
    });
  });

  it("throws MAX_PARTNERSHIPS when user already has an accepted partnership", async () => {
    let callCount = 0;
    (db.select as Mock).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) return [makeProfile()];
            if (callCount === 2) return []; // no existing pair
            return [makePartnership({ status: "accepted" })]; // already partnered
          }),
        }),
      }),
    }));

    await expect(sendInvitation("user-a", "b@test.com")).rejects.toMatchObject({
      code: "MAX_PARTNERSHIPS",
    });
  });
});

describe("acceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when a non-invitee tries to accept", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ inviteeId: "user-b" })]),
        }),
      }),
    });

    await expect(acceptInvitation("user-c", "p-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws INVALID_STATUS when trying to accept a non-pending invitation", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ status: "accepted" })]),
        }),
      }),
    });

    await expect(acceptInvitation("user-b", "p-1")).rejects.toMatchObject({
      code: "INVALID_STATUS",
    });
  });

  it("throws NOT_FOUND when invitation doesn't exist", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(acceptInvitation("user-b", "p-nonexistent")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("declineInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when a non-invitee tries to decline", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ inviteeId: "user-b" })]),
        }),
      }),
    });

    await expect(declineInvitation("user-a", "p-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("cancelInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when the invitee tries to cancel (only inviter can cancel)", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ inviterId: "user-a" })]),
        }),
      }),
    });

    await expect(cancelInvitation("user-b", "p-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws INVALID_STATUS when trying to cancel a non-pending invitation", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ status: "accepted" })]),
        }),
      }),
    });

    await expect(cancelInvitation("user-a", "p-1")).rejects.toMatchObject({
      code: "INVALID_STATUS",
    });
  });
});

describe("removePartnership", () => {
  beforeEach(() => {
    deletedIds = [];
    vi.clearAllMocks();
  });

  it("cancels a pending invitation when caller is inviter", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ status: "pending", inviterId: "user-a" })]),
        }),
      }),
    });
    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    await expect(removePartnership("user-a", "p-1", false)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN when invitee tries to cancel a pending invitation", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ status: "pending", inviterId: "user-a" })]),
        }),
      }),
    });

    await expect(removePartnership("user-b", "p-1", false)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws INVALID_STATUS for declined/cancelled partnerships", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makePartnership({ status: "declined" })]),
        }),
      }),
    });

    await expect(removePartnership("user-a", "p-1", false)).rejects.toMatchObject({
      code: "INVALID_STATUS",
    });
  });

  it("throws NOT_FOUND when partnership doesn't exist", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(removePartnership("user-a", "p-nonexistent", false)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("PartnershipError", () => {
  it("has the correct name and code properties", () => {
    const err = new PartnershipError("NOT_FOUND", "test message");
    expect(err.name).toBe("PartnershipError");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("test message");
    expect(err instanceof Error).toBe(true);
  });
});
