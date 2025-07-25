import { renderHook, waitFor, act, render } from '@testing-library/react'
import { AuthProvider, useAuth } from '../auth-context'
import { server } from '../../__mocks__/server'
import { http, HttpResponse } from 'msw'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear()
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')
    })

    it('should provide initial loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
      expect(result.current.profile).toBe(null)
    })

    it('should handle successful authentication', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Initially unauthenticated
      expect(result.current.user).toBe(null)
      expect(result.current.session).toBe(null)
      expect(result.current.profile).toBe(null)
    })

    it('should handle sign in with Google', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: { error: unknown; data: unknown } | undefined
      await act(async () => {
        signInResult = await result.current.signInWithGoogle()
      })
      
      expect(signInResult).toBeDefined()
      
      expect(signInResult!.error).toBe(null)
      expect(signInResult!.data).toBeDefined()
    })

    it('should handle sign out', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signOutResult: { error: unknown } | undefined
      await act(async () => {
        signOutResult = await result.current.signOut()
      })
      
      expect(signOutResult).toBeDefined()
      expect(signOutResult!.error).toBe(null)
    })

    it('should handle authentication errors', async () => {
      // Mock an error response
      server.use(
        http.get('*/auth/v1/user', () => {
          return new HttpResponse(null, { status: 401 })
        })
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBe(null)
    })

    it('should handle profile loading errors gracefully', async () => {
      // Mock user but profile error
      server.use(
        http.get('*/rest/v1/user_profiles*', () => {
          return new HttpResponse(null, { status: 500 })
        })
      )

      const { result } = renderHook(() => useAuth(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should handle profile loading error gracefully
      expect(result.current.profile).toBe(null)
    })
  })

  describe('AuthProvider', () => {
    it('should provide auth context to children', async () => {
      const TestComponent = () => {
        const auth = useAuth()
        return <div data-testid="auth-status">{auth.loading ? 'loading' : 'loaded'}</div>
      }

      let getByTestId: ((id: string) => HTMLElement) | undefined
      await act(async () => {
        const result = render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        )
        getByTestId = result.getByTestId
      })

      expect(getByTestId).toBeDefined()
      expect(getByTestId!('auth-status')).toBeInTheDocument()
    })
  })
})