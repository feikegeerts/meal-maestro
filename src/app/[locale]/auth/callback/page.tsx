'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from '@/app/i18n/routing'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/ui/page-loading'
import { PageWrapper } from '@/components/ui/page-wrapper'

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
            router.push('/')
          } else if (event === 'SIGNED_OUT') {
            hasHandledAuth.current = true
            router.push('/?error=auth_cancelled')
          } else if (event === 'INITIAL_SESSION' && !session) {
            hasHandledAuth.current = true
            router.push('/?error=invalid_link')
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
            router.push('/')
          } else if (!hasHandledAuth.current) {
            hasHandledAuth.current = true
            router.push('/?error=timeout')
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
    <PageWrapper>
      <PageLoading text="Completing authentication..." />
    </PageWrapper>
  )
}