'use client'

import '@/app/[locale]/globals.css'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/ui/page-loading'
import { routing } from '@/app/i18n/routing'
import {
  clearPendingAuthRedirect,
  getPendingAuthRedirect,
  resolveLocaleAwarePath,
  sanitizeRedirectPath,
} from '@/lib/auth-redirect'

export default function AuthCallback() {
  const router = useRouter()
  const hasHandledAuth = useRef(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tokenHash = urlParams.get('token_hash')
      const type = urlParams.get('type')
      const redirectFromQuery = sanitizeRedirectPath(urlParams.get('redirectTo'))
      const localeFromQuery = urlParams.get('locale')
      const resolvedLocaleFromQuery = routing.locales.find((loc) => loc === localeFromQuery) ?? null

      const defaultRedirectPath = '/recipes'
      let pendingRedirect = getPendingAuthRedirect()

      const resolveRedirectInfo = (
        pathOverride?: string | null,
        localeOverride?: string | null
      ) =>
        resolveLocaleAwarePath({
          path: pathOverride ?? redirectFromQuery ?? pendingRedirect?.path ?? defaultRedirectPath,
          locale:
            localeOverride ?? resolvedLocaleFromQuery ?? pendingRedirect?.locale ?? routing.defaultLocale,
          availableLocales: routing.locales,
          defaultLocale: routing.defaultLocale,
        })

      const redirectToTarget = (
        pathOverride?: string | null,
        localeOverride?: string | null
      ) => {
        if (hasHandledAuth.current) {
          return
        }

        const { path: finalPath } = resolveRedirectInfo(
          pathOverride,
          localeOverride
        )

        hasHandledAuth.current = true
        pendingRedirect = null
        clearPendingAuthRedirect()
        router.replace(finalPath)
      }

      if (tokenHash && type) {
        try {
          // Verify OTP for PKCE flow
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'magiclink' | 'recovery' | 'email'
          })
          
          
          if (error) {
            console.error('❌ OTP verification failed:', error)
            const { locale: targetLocale } = resolveRedirectInfo()
            router.push(`/${targetLocale}?error=invalid_link`)
            return
          }

          if (data.session) {
            redirectToTarget(redirectFromQuery, resolvedLocaleFromQuery)
            return
          }
        } catch (error) {
          console.error('Auth callback error:', error)
          const { locale: targetLocale } = resolveRedirectInfo()
          router.push(`/${targetLocale}?error=auth_error`)
          return
        }
      }

      // Set up auth state change listener for implicit flow
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (hasHandledAuth.current) {
            return
          }
          
          if (event === 'SIGNED_IN' && session) {
            redirectToTarget(redirectFromQuery, resolvedLocaleFromQuery)
          } else if (event === 'SIGNED_OUT') {
            hasHandledAuth.current = true
            const { locale: targetLocale } = resolveRedirectInfo()
            router.push(`/${targetLocale}?error=auth_cancelled`)
          } else if (event === 'INITIAL_SESSION' && !session) {
            hasHandledAuth.current = true
            const { locale: targetLocale } = resolveRedirectInfo()
            router.push(`/${targetLocale}?error=invalid_link`)
          }
        }
      )

      // Fallback timeout in case auth state change doesn't fire
      timeoutId = setTimeout(() => {
        if (!hasHandledAuth.current) {
          const urlParams = new URLSearchParams(window.location.search)
          const localeFromParams = urlParams.get('locale')
          const fallbackLocale =
            routing.locales.find((loc) => loc === localeFromParams) ?? routing.defaultLocale

          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && !hasHandledAuth.current) {
              redirectToTarget(redirectFromQuery, fallbackLocale)
            } else if (!hasHandledAuth.current) {
              hasHandledAuth.current = true
              const { locale: targetLocale } = resolveRedirectInfo(
                undefined,
                fallbackLocale
              )
              router.push(`/${targetLocale}?error=timeout`)
            }
          })
        }
      }, 10000) // 10 second timeout

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

    return () => {
      cleanup?.()
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [router])

  return (
    <div className="font-sans">
      <PageLoading text="Completing authentication..." />
    </div>
  )
}
