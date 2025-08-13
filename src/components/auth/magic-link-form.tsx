'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Loader2, Check } from 'lucide-react'

interface MagicLinkFormProps {
  className?: string
}

export function MagicLinkForm({ className }: MagicLinkFormProps) {
  const { signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (rateLimited) {
      setError('Please wait before requesting another magic link')
      return
    }

    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const { error } = await signInWithMagicLink(email.trim())
      
      if (error) {
        if (error.message?.includes('rate limit') || error.message?.includes('60 seconds')) {
          setError('Too many requests. Please wait 60 seconds before trying again.')
          setRateLimited(true)
          setTimeout(() => setRateLimited(false), 60000) // Reset after 60 seconds
        } else {
          setError(error.message || 'Failed to send magic link')
        }
        console.error('Magic link error:', error)
      } else {
        setIsSuccess(true)
        setEmail('') // Clear email on success
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Unexpected error during magic link request:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className={`flex flex-col items-center space-y-4 max-w-sm mx-auto ${className}`}>
        <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Email Sent!
          </h3>
          <p className="text-muted-foreground text-sm">
            Check your email and click the link to sign in or create your account. The link will expire in 1 hour.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsSuccess(false)
            setEmail('')
          }}
        >
          Send Another Email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 max-w-sm mx-auto ${className}`}>
      <div className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null) // Clear error when user types
            }}
            disabled={isLoading || rateLimited}
            className="pl-10"
            autoComplete="email"
          />
        </div>
        
        {error && (
          <div className="text-destructive text-sm px-1">
            {error}
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || rateLimited || !email.trim() || !isValidEmail(email)}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Magic Link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Magic Link
          </>
        )}
      </Button>

      <div className="text-xs text-muted-foreground text-center">
        <p>
          We&apos;ll send you a secure link to sign in or create an account without a password. 
          Links expire after 1 hour.
        </p>
        {rateLimited && (
          <p className="text-destructive mt-1">
            Rate limited. Please wait 60 seconds before trying again.
          </p>
        )}
      </div>
    </form>
  )
}