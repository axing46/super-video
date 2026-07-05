/**
 * Vercel Serverless Function — M3U8 Anti-leech Proxy
 *
 * Uses native fetch() (Node 18+ on Vercel) for reliable HTTP requests.
 * No raw http/https modules needed.
 */

function isM3u8Content(url, contentType) {
  if (contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl')) return true
  if (contentType.includes('json') || contentType.includes('html') || contentType.includes('image') || contentType.includes('video/')) return false
  if (url.toLowerCase().includes('.m3u8')) return true
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
        signal: AbortSignal.timeout(20000),
      })
      return res
    } catch (err) {
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 500 * (i + 1)))
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
    const isM3u8 = isM3u8Content(targetUrl, contentType)

    if (isM3u8) {
      let text = await upstream.text()
      text = rewriteM3u8(text, targetUrl)
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
      res.setHeader('Cache-Control', 'public, max-age=30')
      return res.send(text)
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', contentType || 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.send(buffer)
  } catch (err) {
    console.error(`[proxy] ${err.name}: ${err.message} ← ${targetUrl}`)
    return res.status(502).send(`Proxy error: ${err.message}`)
  }
}
