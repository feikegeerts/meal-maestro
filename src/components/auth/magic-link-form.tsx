'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Loader2, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

interface MagicLinkFormProps {
  className?: string
}

export function MagicLinkForm({ className }: MagicLinkFormProps) {
  const { signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const t = useTranslations('auth')

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error(t('emailRequired'))
      return
    }

    if (!isValidEmail(email)) {
      toast.error(t('invalidEmail'))
      return
    }

    if (rateLimited) {
      toast.error(t('pleaseWaitBeforeRetrying'))
      return
    }

    setIsLoading(true)
    setIsSuccess(false)

    try {
      const { error } = await signInWithMagicLink(email.trim())
      
      if (error) {
        const errorMessage = error.message || ''
        
        if (errorMessage.includes('rate limit') || 
            errorMessage.includes('60 seconds') || 
            errorMessage.includes('security purposes') ||
            errorMessage.includes('after') && errorMessage.includes('seconds')) {
          toast.error(t('tooManyRequests'))
          setRateLimited(true)
          setTimeout(() => setRateLimited(false), 60000)
        } else {
          toast.error(error.message || t('failedToSendMagicLink'))
        }
      } else {
        setIsSuccess(true)
        setEmail('')
        toast.success(t('emailSent'))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('unexpectedError')
      
      if (errorMessage.includes('rate limit') || 
          errorMessage.includes('60 seconds') || 
          errorMessage.includes('security purposes') ||
          errorMessage.includes('after') && errorMessage.includes('seconds')) {
        toast.error(t('tooManyRequests'))
        setRateLimited(true)
        setTimeout(() => setRateLimited(false), 60000)
      } else {
        toast.error(errorMessage)
      }
      
      console.error('Magic link request error:', err)
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
            {t('emailSent')}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t('emailSentDescription')}
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
          {t('sendAnotherEmail')}
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
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            disabled={isLoading || rateLimited}
            className="pl-10"
            autoComplete="email"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || rateLimited || !email.trim() || !isValidEmail(email)}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('sendingMagicLink')}
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            {t('sendMagicLink')}
          </>
        )}
      </Button>

      <div className="text-xs text-muted-foreground text-center">
        <p>
          {t('magicLinkInfo')}
        </p>
        {rateLimited && (
          <p className="text-destructive mt-1">
            {t('rateLimitMessage')}
          </p>
        )}
      </div>
    </form>
  )
}