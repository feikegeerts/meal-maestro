import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token, expires_in } = await request.json();

    if (!access_token) {
      console.debug('Token sync request missing access token');
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    console.debug('Syncing tokens with server cookies');
    
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    // Set access token cookie
    cookieStore.set('sb-access-token', access_token, {
      path: '/',
      maxAge: expires_in || 3600,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax'
    });

    // Set refresh token cookie if provided
    if (refresh_token) {
      cookieStore.set('sb-refresh-token', refresh_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax'
      });
    }

    console.debug('Token sync with server cookies completed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting session cookies:', error);
    return NextResponse.json(
      { error: 'Failed to set session cookies' },
      { status: 500 }
    );
  }
}