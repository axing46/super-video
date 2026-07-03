/**
 * Rewrite image URLs to bypass CORS / anti-leech restrictions.
 * Mirrors the logic from TTTTV-Flutter's douban_repository.dart.
 */
export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return ''
  // Replace common blocked image domains with proxy alternatives
  // For now, pass through — user's browser handles most cases
  // In production, you'd route through a proxy like:
  // return url.replace(/https?:\/\/img\d+\.doubanio\.com\//, '/api/img-proxy/')
  return url
}
