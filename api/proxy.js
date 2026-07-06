/**
 * Vercel Serverless Function — M3U8 Anti-leech Proxy
 *
 * Uses native fetch() (Node 18+ on Vercel) for reliable HTTP requests.
 * No raw http/https modules needed.
 */

function isM3u8Content(url, contentType, body) {
  // Definitive content-type matches
  if (contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl')) return true
  // Definitive non-M3U8
  if (contentType.includes('json') || contentType.includes('html') || contentType.includes('image') || contentType.includes('video/mp4') || contentType.includes('video/webm')) return false
  // URL extension check
  if (url.toLowerCase().includes('.m3u8')) return true
  // Body content check — M3U8 always starts with #EXTM3U
  if (body && body.trimStart().startsWith('#EXTM3U')) return true
  return false
}

function rewriteM3u8(text, baseUrl) {
  const lines = text.split('\n')
  const out = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      try {
        const absoluteUrl = new URL(trimmed, baseUrl).toString()
        out.push(`/api/proxy?url=${encodeURIComponent(absoluteUrl)}`)
      } catch {
        out.push(line)
      }
    } else {
      out.push(line)
    }
  }
  return out.join('\n')
}

function getHeaders(targetUrl) {
  let referer, origin
  try {
    const parsed = new URL(targetUrl)
    referer = `${parsed.protocol}//${parsed.host}/`
    origin = `${parsed.protocol}//${parsed.host}`
  } catch {
    referer = 'https://www.google.com/'
    origin = 'https://www.google.com'
  }
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': referer,
    'Origin': origin,
  }
}

async function fetchWithRetry(targetUrl, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(targetUrl, {
        headers: getHeaders(targetUrl),
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      })
      return res
    } catch (err) {
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 800 * (i + 1)))
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const reqUrl = new URL(req.url, `https://${req.headers.host}`)
  const targetUrl = reqUrl.searchParams.get('url')

  if (!targetUrl) {
    return res.status(400).send('Missing ?url=')
  }

  try {
    const upstream = await fetchWithRetry(targetUrl)

    if (!upstream.ok) {
      return res.status(502).send(`Upstream ${upstream.status} ${upstream.statusText}`)
    }

    const contentType = upstream.headers.get('content-type') ?? ''

    // Read body as text first to check for M3U8 content
    const text = await upstream.text()
    const isM3u8 = isM3u8Content(targetUrl, contentType, text)

    if (isM3u8) {
      const rewritten = rewriteM3u8(text, targetUrl)
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=10')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.send(rewritten)
    }

    // Non-M3U8 — send as binary (TS segments, MP4, etc.)
    const buffer = Buffer.from(text, 'binary')

    res.setHeader('Content-Type', contentType || 'application/octet-stream')
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Access-Control-Allow-Origin', '*')

    return res.status(200).end(buffer)
  } catch (err) {
    console.error(`[proxy] ${err.name}: ${err.message} ← ${targetUrl}`)
    return res.status(502).send(`Proxy error: ${err.message}`)
  }
}
