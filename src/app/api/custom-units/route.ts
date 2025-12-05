import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

export interface CustomUnit {
  id: string
  user_id: string
  unit_name: string
  created_at: string
}

export interface CreateCustomUnitRequest {
  unit_name: string
}

export interface CustomUnitsResponse {
  units: CustomUnit[]
}

export async function GET() {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof Response) {
      return authResult;
    }

    const { client: supabase, user } = authResult;

    const { data: customUnits, error } = await supabase
      .from('custom_units')
      .select('*')
      .eq('user_id', user.id)
      .order('unit_name', { ascending: true })

    if (error) {
      console.error('Error fetching custom units:', error)
      return NextResponse.json(
        { error: 'Failed to fetch custom units' },
        { status: 500 }
      )
    }

    return NextResponse.json({ units: customUnits || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/custom-units:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof Response) {
      return authResult;
    }

    const { client: supabase, user } = authResult;

    const body: CreateCustomUnitRequest = await request.json()

    if (!body.unit_name || typeof body.unit_name !== 'string') {
      return NextResponse.json(
        { error: 'Unit name is required and must be a string' },
        { status: 400 }
      )
    }

    const unitName = body.unit_name.trim()

    if (unitName.length === 0 || unitName.length > 50) {
      return NextResponse.json(
        { error: 'Unit name must be between 1 and 50 characters' },
        { status: 400 }
      )
    }

    // Check if it conflicts with standard units
    const standardUnits = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'clove']
    if (standardUnits.includes(unitName.toLowerCase())) {
      return NextResponse.json(
        { error: 'Cannot create custom unit with the same name as a standard unit' },
        { status: 400 }
      )
    }

    // Validate unit name format (alphanumeric, spaces, hyphens, dots)
    if (!/^[a-zA-Z0-9\s.-]+$/.test(unitName)) {
      return NextResponse.json(
        { error: 'Unit name can only contain letters, numbers, spaces, hyphens, and dots' },
        { status: 400 }
      )
    }

    const { data: newUnit, error } = await supabase
      .from('custom_units')
      .insert({
        user_id: user.id,
        unit_name: unitName,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'You already have a custom unit with this name' },
          { status: 409 }
        )
      }

      console.error('Error creating custom unit:', error)
      return NextResponse.json(
        { error: 'Failed to create custom unit' },
        { status: 500 }
      )
    }

    return NextResponse.json(newUnit, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/custom-units:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
