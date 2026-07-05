/**
 * Rewrite image URLs to bypass CORS / anti-leech restrictions.
 * On HTTPS deployments (Vercel), HTTP images are blocked as Mixed Content,
 * so we route them through /api/proxy.
 */

const IS_HTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:'

export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return ''

  // On HTTPS: route HTTP images through proxy to avoid Mixed Content
  if (IS_HTTPS && url.startsWith('http://')) {
    return `/api/proxy?url=${encodeURIComponent(url)}`
  }

  // Douban images often block cross-origin requests — proxy them
  if (url.includes('doubanio.com') || url.includes('douban.com')) {
    return `/api/proxy?url=${encodeURIComponent(url)}`
  }

  return url
}
