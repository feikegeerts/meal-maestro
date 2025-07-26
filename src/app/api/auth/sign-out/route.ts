import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear authentication cookies
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing session cookies:', error);
    return NextResponse.json(
      { error: 'Failed to clear session cookies' },
      { status: 500 }
    );
  }
}