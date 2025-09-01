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
      
      if (tokenHash && type) {
        console.log('🔍 [AUTH CALLBACK] Processing PKCE flow with:', { tokenHash: tokenHash.substring(0, 10) + '...', type })
        try {
          // Verify OTP for PKCE flow
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'magiclink' | 'recovery' | 'email'
          })
          
          console.log('🔍 [AUTH CALLBACK] VerifyOTP result:', { 
            hasSession: !!data?.session, 
            hasUser: !!data?.user,
            error: error?.message 
          })
          
          if (error) {
            console.error('❌ OTP verification failed:', error)
            router.push(`/${routing.defaultLocale}?error=invalid_link`)
            return
          }
          
          if (data.session) {
            console.log('✅ [AUTH CALLBACK] Session created, redirecting...')
            hasHandledAuth.current = true
            
            // Check for redirect_to parameter
            const redirectTo = urlParams.get('redirect_to')
            if (redirectTo) {
              router.push(redirectTo)
            } else {
              router.push(`/${routing.defaultLocale}/recipes`)
            }
            return
          } else {
            console.warn('⚠️ [AUTH CALLBACK] No session returned from verifyOtp')
          }
        } catch (error) {
          console.error('❌ Auth callback error:', error)
          router.push(`/${routing.defaultLocale}?error=auth_error`)
          return
        }
      } else {
        console.log('🔍 [AUTH CALLBACK] No token_hash/type found, using implicit flow')
      }
      
      // Set up auth state change listener for implicit flow
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (hasHandledAuth.current) return
          
          if (event === 'SIGNED_IN' && session) {
            hasHandledAuth.current = true
            
            // Always redirect to recipes page on successful login
            router.push(`/${routing.defaultLocale}/recipes`)
          } else if (event === 'SIGNED_OUT') {
            hasHandledAuth.current = true
            router.push(`/${routing.defaultLocale}?error=auth_cancelled`)
          } else if (event === 'INITIAL_SESSION' && !session) {
            hasHandledAuth.current = true
            router.push(`/${routing.defaultLocale}?error=invalid_link`)
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
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && !hasHandledAuth.current) {
            hasHandledAuth.current = true
            
            // Always redirect to recipes page on successful login
            router.push(`/${routing.defaultLocale}/recipes`)
          } else if (!hasHandledAuth.current) {
            hasHandledAuth.current = true
            router.push(`/${routing.defaultLocale}?error=timeout`)
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