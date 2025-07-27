import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function setRedirectUrl(url: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('redirectAfterLogin', url)
  }
}

export function getRedirectUrl(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('redirectAfterLogin')
  }
  return null
}

export function clearRedirectUrl() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('redirectAfterLogin')
  }
}
