import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { customUnits } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export interface CustomUnitResponse {
  id: string;
  user_id: string;
  unit_name: string;
  created_at: string;
}

export interface CreateCustomUnitRequest {
  unit_name: string;
}

export interface CustomUnitsResponse {
  units: CustomUnitResponse[];
}

type DrizzleCustomUnit = typeof customUnits.$inferSelect;

function toSnakeCase(unit: DrizzleCustomUnit): CustomUnitResponse {
  return {
    id: unit.id,
    user_id: unit.userId,
    unit_name: unit.unitName,
    created_at: unit.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof Response) {
      return authResult;
    }

    const { user } = authResult;

    const units = await db
      .select()
      .from(customUnits)
      .where(eq(customUnits.userId, user.id))
      .orderBy(asc(customUnits.unitName));

    return NextResponse.json({ units: units.map(toSnakeCase) });
  } catch (error) {
    console.error("Unexpected error in GET /api/custom-units:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof Response) {
      return authResult;
    }

    const { user } = authResult;

    const body: CreateCustomUnitRequest = await request.json();

    if (!body.unit_name || typeof body.unit_name !== "string") {
      return NextResponse.json(
        { error: "Unit name is required and must be a string" },
        { status: 400 },
      );
    }

    const unitName = body.unit_name.trim();

    if (unitName.length === 0 || unitName.length > 50) {
      return NextResponse.json(
        { error: "Unit name must be between 1 and 50 characters" },
        { status: 400 },
      );
    }

    // Check if it conflicts with standard units
    const standardUnits = ["g", "kg", "ml", "l", "tbsp", "tsp", "clove"];
    if (standardUnits.includes(unitName.toLowerCase())) {
      return NextResponse.json(
        {
          error:
            "Cannot create custom unit with the same name as a standard unit",
        },
        { status: 400 },
      );
    }

    // Validate unit name format (alphanumeric, spaces, hyphens, dots)
    if (!/^[a-zA-Z0-9\s.-]+$/.test(unitName)) {
      return NextResponse.json(
        {
          error:
            "Unit name can only contain letters, numbers, spaces, hyphens, and dots",
        },
        { status: 400 },
      );
    }

    try {
      const [newUnit] = await db
        .insert(customUnits)
        .values({
          userId: user.id,
          unitName: unitName,
        })
        .returning();

      return NextResponse.json(toSnakeCase(newUnit), { status: 201 });
    } catch (insertError: unknown) {
      // Check for unique constraint violation
      if (
        insertError instanceof Error &&
        insertError.message.includes("unique")
      ) {
        return NextResponse.json(
          { error: "You already have a custom unit with this name" },
          { status: 409 },
        );
      }

      console.error("Error creating custom unit:", insertError);
      return NextResponse.json(
        { error: "Failed to create custom unit" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error in POST /api/custom-units:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
