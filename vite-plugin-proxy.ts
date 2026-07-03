/**
 * Vite Plugin — M3U8 Anti-leech Proxy
 *
 * Embeds proxy logic directly into Vite's dev server.
 * No separate process needed — just `npm run dev`.
 *
 * Flow:
 *   Browser → /api/proxy?url=<encoded> → plugin fetches with Referer/Origin
 *   If M3U8 → rewrites segment URLs to also go through /api/proxy
 *   If binary → streams transparently with CORS headers
 */

import type { Plugin, ViteDevServer } from 'vite'
import http from 'node:http'
import https from 'node:https'

const CACHE = new Map<string, { expires: number; body: Buffer; isM3u8: boolean }>()
const CACHE_TTL = 5 * 60 * 1000
const MAX_CACHE = 50

function cacheGet(key: string) {
  const entry = CACHE.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) { CACHE.delete(key); return null }
  return entry
}

function cacheSet(key: string, body: Buffer, isM3u8: boolean) {
  if (CACHE.size >= MAX_CACHE) {
    const first = CACHE.keys().next().value
    if (first) CACHE.delete(first)
  }
  CACHE.set(key, { expires: Date.now() + CACHE_TTL, body, isM3u8 })
}

/** Delay helper */
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Check if this is a TS/video segment (not M3U8 manifest) */
function isSegment(url: string): boolean {
  return /\.(ts|m4s|mp4|mkv|avi|flv|webm)(\?|$)/i.test(url)
}

/** Fetch with retry on TLS/network errors */
async function fetchWithRetry(targetUrl: string, maxRetries = 3): Promise<{ body: Buffer; contentType: string; statusCode: number }> {
  let lastErr: Error | null = null
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchOnce(targetUrl)
    } catch (err: any) {
      lastErr = err
      const msg = err.message?.toLowerCase() ?? ''
      if (i < maxRetries && (msg.includes('tls') || msg.includes('socket') || msg.includes('econnreset') || msg.includes('timeout') || msg.includes('econnrefused'))) {
        await delay(200 * (i + 1))
      } else {
        throw err
      }
    }
  }
  throw lastErr
}

function fetchOnce(targetUrl: string): Promise<{ body: Buffer; contentType: string; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl)
    const transport = parsed.protocol === 'https:' ? https : http

    // For video segments, don't send Referer/Origin — CDNs often check
    // Referer on TS files and reject requests with unexpected values
    const seg = isSegment(targetUrl)
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    }
    if (!seg) {
      // Anti-leech headers — only for M3U8 manifests, not segments
      headers['Referer'] = `${parsed.protocol}//${parsed.host}/`
      headers['Origin'] = `${parsed.protocol}//${parsed.host}`
    }

    const req = transport.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
      timeout: 15000,
      rejectUnauthorized: false,
    }, (res) => {
      // Follow redirects (max 3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode!) && res.headers.location) {
        const next = new URL(res.headers.location, targetUrl).toString()
        return fetchOnce(next).then(resolve).catch(reject)
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve({
        body: Buffer.concat(chunks),
        contentType: res.headers['content-type'] ?? '',
        statusCode: res.statusCode ?? 200,
      }))
      res.on('error', reject)
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    req.end()
  })
}

function isM3u8Content(url: string, contentType: string): boolean {
  // Content-type takes priority
  if (contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl')) return true
  // If content-type is binary/json/html, it's not M3U8 regardless of URL
  if (contentType.includes('json') || contentType.includes('html') || contentType.includes('image') || contentType.includes('video/')) return false
  // Fallback to URL check for text/plain or missing content-type
  if (url.toLowerCase().includes('.m3u8')) return true
  return false
}

function rewriteM3u8(body: Buffer, baseUrl: string): Buffer {
  const text = body.toString('utf-8')
  const lines = text.split('\n')
  const out: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      // Resolve relative URLs against the M3U8's base URL
      const absoluteUrl = new URL(trimmed, baseUrl).toString()
      out.push(`/api/proxy?url=${encodeURIComponent(absoluteUrl)}`)
    } else {
      out.push(line)
    }
  }
  return Buffer.from(out.join('\n'), 'utf-8')
}

export function videoProxyPlugin(): Plugin {
  return {
    name: 'video-proxy',
    configureServer(server: ViteDevServer) {

      // ─── /api/fetch — general-purpose proxy (search, detail, home) ──
      server.middlewares.use('/api/fetch', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

        const reqUrl = new URL(req.url!, `http://${req.headers.host}`)
        const targetUrl = reqUrl.searchParams.get('url')

        if (!targetUrl) { res.statusCode = 400; res.end('Missing ?url='); return }

        try {
          const fetched = await fetchWithRetry(targetUrl)
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', fetched.contentType || 'application/json')
          res.statusCode = fetched.statusCode
          res.end(fetched.body)
        } catch (err: any) {
          console.error(`[api-fetch] ERROR: ${err.message}`)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ code: -1, msg: `代理请求失败: ${err.message}` }))
        }
      })

      // ─── /api/proxy — M3U8/video proxy ──────────────────────
      server.middlewares.use('/api/proxy', async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', '*')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const reqUrl = new URL(req.url!, `http://${req.headers.host}`)
        const targetUrl = reqUrl.searchParams.get('url')

        if (!targetUrl) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'text/plain')
          res.end('Missing ?url=')
          return
        }

        try {
          // Check cache
          const cached = cacheGet(targetUrl)
          if (cached) {
            res.setHeader('Content-Type', cached.isM3u8 ? 'application/vnd.apple.mpegurl' : 'application/octet-stream')
            res.end(cached.body)
            return
          }

          // Fetch from source
          const fetched = await fetchWithRetry(targetUrl)

          if (fetched.statusCode >= 400) {
            // Return empty binary — let hls.js skip and continue
            res.statusCode = 404
            res.setHeader('Content-Type', 'video/mp2t')
            res.end()
            return
          }

          const isM3u8 = isM3u8Content(targetUrl, fetched.contentType)
          let body = fetched.body

          if (isM3u8) {
            body = rewriteM3u8(body, targetUrl)
            cacheSet(targetUrl, body, true)
            console.log(`[video-proxy] M3U8 ← ${targetUrl}`)
          } else {
            console.log(`[video-proxy] SEG  ← ${targetUrl.substring(0, 120)}`)
          }

          res.setHeader('Content-Type', isM3u8 ? 'application/vnd.apple.mpegurl' : fetched.contentType || 'application/octet-stream')
          res.end(body)
        } catch (err: any) {
          console.error(`[video-proxy] ERROR ${targetUrl.substring(0, 120)}: ${err.message}`)
          // Return empty binary response so hls.js can skip the segment gracefully
          // instead of getting an HTML error page that causes fragParsingError
          res.statusCode = 404
          res.setHeader('Content-Type', 'video/mp2t')
          res.end()
        }
      })
    },
  }
}
