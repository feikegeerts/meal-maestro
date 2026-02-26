import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/db";
import { customUnits } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { parseBody, CustomUnitBodySchema } from "@/lib/request-schemas";

export interface CustomUnitResponse {
  id: string;
  user_id: string;
  unit_name: string;
  created_at: string;
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

    const parsed = parseBody(CustomUnitBodySchema, await request.json());
    if (!parsed.success) return parsed.error;

    const unitName = parsed.data.unit_name.trim();

    // Check if it conflicts with standard units (business logic, not schema concern)
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
