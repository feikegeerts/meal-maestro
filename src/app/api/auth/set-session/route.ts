import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token, expires_in } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('sb-access-token', access_token, {
      path: '/',
      maxAge: expires_in || 3600,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax'
    });

    if (refresh_token) {
      cookieStore.set('sb-refresh-token', refresh_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax'
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting session cookies:', error);
    return NextResponse.json(
      { error: 'Failed to set session cookies' },
      { status: 500 }
    );
  }
}