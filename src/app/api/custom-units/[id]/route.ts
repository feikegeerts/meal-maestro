import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();

    if (authResult instanceof Response) {
      return authResult;
    }

    const { client: supabase, user } = authResult;

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Custom unit ID is required' },
        { status: 400 }
      )
    }

    // First check if the unit exists and belongs to the user
    const { data: existingUnit, error: fetchError } = await supabase
      .from('custom_units')
      .select('id, user_id, unit_name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingUnit) {
      return NextResponse.json(
        { error: 'Custom unit not found' },
        { status: 404 }
      )
    }


    // Delete the custom unit
    const { error: deleteError } = await supabase
      .from('custom_units')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting custom unit:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete custom unit' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/custom-units/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}