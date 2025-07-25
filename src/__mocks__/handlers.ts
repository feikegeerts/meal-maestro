import { http, HttpResponse } from 'msw'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    avatar_url: 'https://example.com/avatar.jpg',
    full_name: 'Test User',
  },
  created_at: '2024-01-01T00:00:00.000Z',
}

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
}

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  display_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: mockSession.access_token,
      refresh_token: mockSession.refresh_token,
      expires_in: mockSession.expires_in,
      token_type: mockSession.token_type,
      user: mockUser,
    })
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUser)
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({})
  }),

  // OAuth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/authorize`, () => {
    return HttpResponse.json({
      url: 'https://accounts.google.com/oauth/authorize?mock=true',
    })
  }),

  // User profiles endpoints
  http.get(`${SUPABASE_URL}/rest/v1/user_profiles`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id === 'eq.test-user-id') {
      return HttpResponse.json([mockProfile])
    }

    return HttpResponse.json([])
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/user_profiles`, async ({ request }) => {
    const updates = await request.json() as Record<string, unknown>
    return HttpResponse.json([{ ...mockProfile, ...updates }])
  }),

  // Error handlers for testing failure scenarios
  http.get(`${SUPABASE_URL}/auth/v1/user`, ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('error') === 'unauthorized') {
      return new HttpResponse(null, { status: 401 })
    }
    return HttpResponse.json(mockUser)
  }),

  http.get(`${SUPABASE_URL}/rest/v1/user_profiles`, ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('error') === 'server_error') {
      return new HttpResponse(null, { status: 500 })
    }
    
    const id = url.searchParams.get('id')
    if (id === 'eq.test-user-id') {
      return HttpResponse.json([mockProfile])
    }

    return HttpResponse.json([])
  }),
]

export { handlers as default }