'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

const GoogleIcon = () => (
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
)

interface GoogleLoginButtonProps {
  className?: string
  size?: 'default' | 'sm' | 'lg'
}

export function GoogleLoginButton({ className }: GoogleLoginButtonProps) {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { error } = await signInWithGoogle()
      
      if (error) {
        setError(error.message || 'Failed to sign in with Google')
        console.error('Google sign-in error:', error)
      }
      // If successful, the auth state change will be handled by the context
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Unexpected error during Google sign-in:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className={`
          gsi-material-button
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
          WebkitAppearance: 'none',
          backgroundColor: 'white',
          backgroundImage: 'none',
          border: '1px solid #747775',
          WebkitBorderRadius: '20px',
          borderRadius: '20px',
          WebkitBoxSizing: 'border-box',
          boxSizing: 'border-box',
          color: '#1f1f1f',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontFamily: "'Roboto', arial, sans-serif",
          fontSize: '14px',
          height: '40px',
          letterSpacing: '0.25px',
          outline: 'none',
          overflow: 'hidden',
          padding: '0 12px',
          position: 'relative',
          textAlign: 'center' as const,
          WebkitTransition: 'background-color .218s, border-color .218s, box-shadow .218s',
          transition: 'background-color .218s, border-color .218s, box-shadow .218s',
          verticalAlign: 'middle',
          whiteSpace: 'nowrap' as const,
          width: 'auto',
          maxWidth: '400px',
          minWidth: 'min-content',
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.boxShadow = '';
          }
        }}
      >
        <div className="gsi-material-button-state" style={{
          WebkitTransition: 'opacity .218s',
          transition: 'opacity .218s',
          bottom: 0,
          left: 0,
          opacity: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}></div>
        <div className="gsi-material-button-content-wrapper" style={{
          WebkitAlignItems: 'center',
          alignItems: 'center',
          display: 'flex',
          WebkitFlexDirection: 'row',
          flexDirection: 'row',
          WebkitFlexWrap: 'nowrap',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'space-between',
          position: 'relative',
          width: '100%',
        }}>
          {isLoading ? (
            <>
              <div className="gsi-material-button-icon" style={{
                height: '20px',
                marginRight: '12px',
                minWidth: '20px',
                width: '20px',
              }}>
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
              <span className="gsi-material-button-contents" style={{
                WebkitFlexGrow: 1,
                flexGrow: 1,
                fontFamily: "'Roboto', arial, sans-serif",
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                verticalAlign: 'top',
              }}>Signing in...</span>
            </>
          ) : (
            <>
              <div className="gsi-material-button-icon" style={{
                height: '20px',
                marginRight: '12px',
                minWidth: '20px',
                width: '20px',
              }}>
                <GoogleIcon />
              </div>
              <span className="gsi-material-button-contents" style={{
                WebkitFlexGrow: 1,
                flexGrow: 1,
                fontFamily: "'Roboto', arial, sans-serif",
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                verticalAlign: 'top',
              }}>Sign in with Google</span>
            </>
          )}
        </div>
      </button>
      
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm text-center px-2">
          {error}
        </div>
      )}
    </div>
  )
}