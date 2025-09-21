import { MetadataRoute } from 'next'
import { routing } from './i18n/routing'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://meal-maestro.com'

  // Generate localized URLs for each page
  const generateLocalizedUrls = (path: string) => {
    return routing.locales.map(locale => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date('2024-12-01'), // Use static date for better consistency
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1.0 : 0.8,
    }))
  }

  return [
    // Homepage - highest priority
    ...generateLocalizedUrls('').map(url => ({ ...url, priority: 1.0 })),

    // About page - high priority for SEO
    ...generateLocalizedUrls('/about').map(url => ({ ...url, priority: 0.9 })),

    // Terms and Privacy - lower priority
    ...generateLocalizedUrls('/terms').map(url => ({ ...url, priority: 0.3 })),
    ...generateLocalizedUrls('/privacy').map(url => ({ ...url, priority: 0.3 })),

    // Note: Login page excluded from sitemap as it provides no SEO value
  ]
}