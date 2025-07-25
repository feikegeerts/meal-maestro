import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/lib/auth-context'
import { mockUser, mockSession, mockProfile } from '../__mocks__/handlers'

// Test wrapper with AuthProvider
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test data factories
export const createMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
})

export const createMockSession = (overrides = {}) => ({
  ...mockSession,
  ...overrides,
})

export const createMockProfile = (overrides = {}) => ({
  ...mockProfile,
  ...overrides,
})

// Auth testing utilities
export const mockAuthState = {
  authenticated: {
    user: mockUser,
    session: mockSession,
    profile: mockProfile,
    loading: false,
  },
  loading: {
    user: null,
    session: null,
    profile: null,
    loading: true,
  },
  unauthenticated: {
    user: null,
    session: null,
    profile: null,
    loading: false,
  },
}

// Helper to wait for async operations
export const waitForAuth = () => new Promise((resolve) => {
  setTimeout(resolve, 100)
})