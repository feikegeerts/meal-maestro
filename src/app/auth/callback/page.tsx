'use client'

import '@/app/[locale]/globals.css'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/ui/page-loading'
import { routing } from '@/app/i18n/routing'

export default function AuthCallback() {
  const router = useRouter()
  const hasHandledAuth = useRef(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for token_hash and type parameters (PKCE flow)
      const urlParams = new URLSearchParams(window.location.search)
      const tokenHash = urlParams.get('token_hash')
      const type = urlParams.get('type')
      const locale = urlParams.get('locale') || routing.defaultLocale
      
      if (tokenHash && type) {
        console.log('🔍 [AUTH CALLBACK] Processing PKCE flow with:', { 
          tokenHash: tokenHash.substring(0, 15) + '...', 
          type,
          locale,
          url: window.location.href
        })
        try {
          // Verify OTP for PKCE flow
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'magiclink' | 'recovery' | 'email'
          })
          
          console.log('🔍 [AUTH CALLBACK] VerifyOTP result:', { 
            hasSession: !!data?.session, 
            hasUser: !!data?.user,
            error: error?.message,
            errorDetails: error
          })
          
          if (error) {
            console.error('❌ OTP verification failed:', error)
            router.push(`/${locale}?error=invalid_link`)
            return
          }
          
          if (data.session) {
            hasHandledAuth.current = true
            
            // Redirect to recipes page with correct locale after successful authentication
            const defaultRedirect = `/${locale}/recipes`
            console.log('🔍 [REDIRECT DEBUG] Redirecting to:', defaultRedirect)
            router.push(defaultRedirect)
            return
          }
        } catch (error) {
          console.error('Auth callback error:', error)
          router.push(`/${locale}?error=auth_error`)
          return
        }
      }
      
      // Set up auth state change listener for implicit flow
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔍 [AUTH STATE DEBUG] Auth state changed:', {
            event,
            hasSession: !!session,
            hasHandledAuth: hasHandledAuth.current
          })
          
          if (hasHandledAuth.current) {
            console.log('🔍 [AUTH STATE DEBUG] Already handled auth, ignoring event')
            return
          }
          
          if (event === 'SIGNED_IN' && session) {
            console.log('🔍 [AUTH STATE DEBUG] SIGNED_IN event, redirecting to recipes')
            hasHandledAuth.current = true
            router.push(`/${locale}/recipes`)
          } else if (event === 'SIGNED_OUT') {
            console.log('🔍 [AUTH STATE DEBUG] SIGNED_OUT event')
            hasHandledAuth.current = true
            router.push(`/${locale}?error=auth_cancelled`)
          } else if (event === 'INITIAL_SESSION' && !session) {
            console.log('🔍 [AUTH STATE DEBUG] INITIAL_SESSION with no session')
            hasHandledAuth.current = true
            router.push(`/${locale}?error=invalid_link`)
          }
        }
      )

      // Return cleanup function
      return () => {
        subscription.unsubscribe()
      }
    }

    // Handle auth callback and store cleanup function
    let cleanup: (() => void) | undefined
    handleAuthCallback().then((cleanupFn) => {
      cleanup = cleanupFn
    })
    
    // Fallback timeout in case auth state change doesn't fire
    const timeoutId = setTimeout(() => {
      if (!hasHandledAuth.current) {
        const urlParams = new URLSearchParams(window.location.search)
        const locale = urlParams.get('locale') || routing.defaultLocale
        
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && !hasHandledAuth.current) {
            hasHandledAuth.current = true
            
            // Redirect to recipes page with correct locale on successful login
            router.push(`/${locale}/recipes`)
          } else if (!hasHandledAuth.current) {
            hasHandledAuth.current = true
            router.push(`/${locale}?error=timeout`)
          }
        })
      }
    }, 10000) // 10 second timeout

    return () => {
      cleanup?.()
      clearTimeout(timeoutId)
    }
  }, [router])

  return (
    <div className="font-sans">
      <PageLoading text="Completing authentication..." />
    </div>
  )
}