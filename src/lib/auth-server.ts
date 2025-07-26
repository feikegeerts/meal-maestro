import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export interface AuthUser {
  id: string;
  email?: string;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      if (refreshToken) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          });

          if (refreshError || !refreshData.session) {
            console.error('Token refresh failed:', refreshError);
            return null;
          }

          return {
            id: refreshData.session.user.id,
            email: refreshData.session.user.email
          };
        } catch (refreshError) {
          console.error('Token refresh exception:', refreshError);
          return null;
        }
      }
      return null;
    }

    return {
      id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

export async function createAuthenticatedClient() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;

  if (!accessToken) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || ''
  });

  return {
    client: supabase,
    user
  };
}

export async function requireAuth() {
  const authResult = await createAuthenticatedClient();
  
  if (!authResult) {
    return new Response(
      JSON.stringify({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return authResult;
}