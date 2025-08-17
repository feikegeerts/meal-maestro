'use client'

import '@/app/[locale]/globals.css'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/ui/page-loading'
import { routing } from '@/app/i18n/routing'
import { getRedirectUrl, clearRedirectUrl } from '@/lib/utils'

export default function AuthCallback() {
  const router = useRouter()
  const hasHandledAuth = useRef(false)

  useEffect(() => {
    const handleAuthCallback = () => {
      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (hasHandledAuth.current) return
          
          if (event === 'SIGNED_IN' && session) {
            hasHandledAuth.current = true
            
            // Check for stored redirect URL first
            const redirectUrl = getRedirectUrl()
            if (redirectUrl) {
              clearRedirectUrl()
              router.push(redirectUrl)
            } else {
              // Default redirect to recipes page on successful login
              router.push(`/${routing.defaultLocale}/recipes`)
            }
          } else if (event === 'SIGNED_OUT') {
            hasHandledAuth.current = true
            router.push(`/${routing.defaultLocale}?error=auth_cancelled`)
          } else if (event === 'INITIAL_SESSION' && !session) {
            hasHandledAuth.current = true
            router.push(`/${routing.defaultLocale}?error=invalid_link`)
          }
        }
      )

      // Cleanup subscription
      return () => {
        subscription.unsubscribe()
      }
    }

    const cleanup = handleAuthCallback()
    
    // Fallback timeout in case auth state change doesn't fire
    const timeoutId = setTimeout(() => {
      if (!hasHandledAuth.current) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && !hasHandledAuth.current) {
            hasHandledAuth.current = true
            
            // Check for stored redirect URL first
            const redirectUrl = getRedirectUrl()
            if (redirectUrl) {
              clearRedirectUrl()
              router.push(redirectUrl)
            } else {
              // Default redirect to recipes page on successful login
              router.push(`/${routing.defaultLocale}/recipes`)
            }
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