import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Maximize, Minimize, SkipBack, SkipForward, Volume2, VolumeX, AlertTriangle, ExternalLink, Gauge, ChevronLeft, ChevronRight, List, X } from 'lucide-react'
import Hls from 'hls.js'
import { useDetail } from '@/features/detail/hooks'
import { parsePlayUrl } from '@/features/detail/api'
import { addHistory } from '@/features/history/storage'
import { Loading, ErrorState } from '@/components/ui/Status'
import type { VodItem } from '@/core/models/vod'

/** Route video requests through Vite's embedded proxy for anti-leech headers */
function proxy(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`
}

export function PlayerPage() {
  const { sourceKey, vodId } = useParams<{ sourceKey: string; vodId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const srcIdx = parseInt(searchParams.get('src') ?? '0', 10)
  const epIdx = parseInt(searchParams.get('ep') ?? '0', 10)

  // Get allItems from location state for multi-source support
  const allItems = (location.state as { allItems?: VodItem[] } | null)?.allItems ?? []

  const { data: detail, isLoading, isError, error } = useDetail(
    decodeURIComponent(sourceKey ?? ''),
    decodeURIComponent(vodId ?? ''),
  )

  const sources = detail ? parsePlayUrl(detail.vodPlayUrl) : []
  const currentSource = sources[srcIdx]
  const currentEpisode = currentSource?.episodes?.[epIdx]
  const episodeUrl = currentEpisode?.url ?? ''

  // Current source index in allItems for auto-switch
  const [currentSourceIndex, setCurrentSourceIndex] = useState(() => {
    if (allItems.length === 0) return -1
    return allItems.findIndex(item => item.sourceKey === decodeURIComponent(sourceKey ?? ''))
  })

  // Find prev/next episode
  let globalIndex = 0
  for (let si = 0; si < srcIdx; si++) {
    globalIndex += sources[si]?.episodes.length ?? 0
  }
  globalIndex += epIdx
  const totalEpisodes = sources.reduce((sum, s) => sum + s.episodes.length, 0)

  const goToEpisode = useCallback((delta: number) => {
    let idx = globalIndex + delta
    if (idx < 0 || idx >= totalEpisodes) return
    let remaining = idx
    for (let si = 0; si < sources.length; si++) {
      const count = sources[si].episodes.length
      if (remaining < count) {
        const key = decodeURIComponent(sourceKey ?? '')
        const vid = decodeURIComponent(vodId ?? '')
        navigate(`/play/${encodeURIComponent(key)}/${encodeURIComponent(vid)}?src=${si}&ep=${remaining}`, { replace: true })
        return
      }
      remaining -= count
    }
  }, [globalIndex, totalEpisodes, sources, sourceKey, vodId, navigate])

  const decodedVodId = decodeURIComponent(vodId ?? '')
  const decodedSourceKey = decodeURIComponent(sourceKey ?? '')

  // Save to watch history when episode loads (must be before early returns)
  useEffect(() => {
    if (detail?.vodName && episodeUrl) {
      addHistory({
        vodId: decodedVodId,
        sourceKey: decodedSourceKey,
        vodName: detail.vodName,
        vodPic: detail.vodPic,
        lastPlayTime: Date.now(),
        progress: 0,
        episode: currentEpisode?.name,
      })
    }
  }, [decodedVodId, decodedSourceKey, episodeUrl])

  if (isLoading) return <Loading message="加载视频信息..." />
  if (isError) return <ErrorState message={(error as Error)?.message ?? '加载失败'} />
  if (!episodeUrl) return <ErrorState message="未找到播放地址 — 该片源可能未返回剧集数据" />

  const playerKey = `${srcIdx}-${epIdx}`

  return (
    <div className="max-w-[1000px] mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => {
          const savedQuery = sessionStorage.getItem('sv_search_query')
          navigate(savedQuery ? `/search?q=${encodeURIComponent(savedQuery)}` : '/search', { replace: true })
        }} className="icon-btn w-10 h-10">
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold text-ink truncate">{detail?.vodName}</h1>
          {currentEpisode && (
            <p className="text-[12px] text-muted truncate">
              {currentSource?.name} · {currentEpisode.name}
            </p>
          )}
        </div>
      </div>

      {/* Video */}
      <VideoPlayer
        key={playerKey}
        url={episodeUrl}
        title={currentEpisode?.name ?? ''}
        onPrev={() => goToEpisode(-1)}
        onNext={() => goToEpisode(1)}
        hasPrev={globalIndex > 0}
        hasNext={globalIndex < totalEpisodes - 1}
        sources={sources}
        srcIdx={srcIdx}
        epIdx={epIdx}
        sourceKey={decodedSourceKey}
        vodId={decodedVodId}
        allItems={allItems}
        currentSourceIndex={currentSourceIndex}
        onSwitchSource={(newIndex: number) => setCurrentSourceIndex(newIndex)}
        onProgress={(progress) => {
          if (detail?.vodName) {
            addHistory({
              vodId: decodedVodId,
              sourceKey: decodedSourceKey,
              vodName: detail.vodName,
              vodPic: detail.vodPic,
              lastPlayTime: Date.now(),
              progress,
              episode: currentEpisode?.name,
            })
          }
        }}
      />

      {/* Episode selector */}
      {sources.length > 0 && (
        <div className="mt-6">
          {sources.map((source, si) => (
            <div key={si} className="mb-4">
              {sources.length > 1 && (
                <h3 className="text-[13px] text-muted font-medium mb-2">{source.name}</h3>
              )}
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                {source.episodes.map((ep, ei) => {
                  const isActive = si === srcIdx && ei === epIdx
                  return (
                    <button
                      key={ei}
                      onClick={() => {
                        const key = decodeURIComponent(sourceKey ?? '')
                        const vid = decodeURIComponent(vodId ?? '')
                        navigate(`/play/${encodeURIComponent(key)}/${encodeURIComponent(vid)}?src=${si}&ep=${ei}`)
                      }}
                      className={`px-2 py-1.5 rounded-btn text-[11px] font-medium truncate transition-all duration-180
                        ${isActive
                          ? 'bg-accent/15 border border-accent/40 text-accent'
                          : 'bg-white/[0.04] border border-white/[0.06] text-ink-2 hover:border-accent/20 hover:text-ink'
                        }`}
                    >
                      {ep.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Video Player Component ──────────────────────────────────

interface PlaySource {
  name: string
  episodes: { name: string; url: string }[]
}

function VideoPlayer({
  url,
  title,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  sources,
  srcIdx,
  epIdx,
  sourceKey,
  vodId,
  allItems,
  currentSourceIndex,
  onSwitchSource,
  onProgress,
}: {
  url: string
  title: string
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  sources: PlaySource[]
  srcIdx: number
  epIdx: number
  sourceKey: string
  vodId: string
  allItems: VodItem[]
  currentSourceIndex: number
  onSwitchSource: (index: number) => void
  onProgress?: (progress: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 3
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [volume, setVolume] = useState(100)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [playerStatus, setPlayerStatus] = useState('正在连接...')
  const [showLoadingTip, setShowLoadingTip] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [levels, setLevels] = useState<{ index: number; height: number; bitrate: number; label: string }[]>([])
  const [currentLevel, setCurrentLevel] = useState(-1) // -1 = auto ABR
  const [showQualities, setShowQualities] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const navigate = useNavigate()

  const isM3u8 = url.toLowerCase().includes('.m3u8')

  // Show loading tip after 5 seconds
  useEffect(() => {
    if (!playerStatus || playerError) {
      setShowLoadingTip(false)
      return
    }

    const timer = setTimeout(() => {
      setShowLoadingTip(true)
    }, 5000)

    return () => clearTimeout(timer)
  }, [playerStatus, playerError])

  // Init player
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setPlayerError(null)
    setPlayerStatus('正在连接...')
    setShowLoadingTip(false)
    retryCountRef.current = 0

    // Set default volume — start muted for autoplay policy
    video.volume = 1
    setVolume(100)
    setMuted(true)

    let destroyed = false
    let hls: Hls | null = null

    const proxyUrl = proxy(url)
    console.log('[player] Loading:', proxyUrl)

    const tryPlay = () => {
      if (destroyed) return
      const playPromise = video.play()
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay blocked — show click-to-play
          if (!destroyed) setPlayerStatus('点击播放')
        })
      }
    }

    const retryLoad = () => {
      if (destroyed) return
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        console.log(`[player] Retry ${retryCountRef.current}/${MAX_RETRIES}`)
        setPlayerStatus(`重试中 (${retryCountRef.current}/${MAX_RETRIES})...`)
        setTimeout(() => {
          if (destroyed) return
          if (hls) {
            hls.startLoad()
          } else {
            video.src = proxyUrl
            video.load()
            tryPlay()
          }
        }, 1000 * retryCountRef.current)
      }
    }

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        debug: false,
        // ABR: prefer higher quality
        abrEwmaDefaultEstimate: 8_000_000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1,
      })
      hlsRef.current = hls

      hls.loadSource(proxyUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyed) return
        retryCountRef.current = 0
        setPlayerError(null)
        setPlayerStatus('')

        // Extract quality levels
        const hlsLevels = hls!.levels
        if (hlsLevels.length > 1) {
          const qualityLevels = hlsLevels.map((l, i) => ({
            index: i,
            height: l.height,
            bitrate: l.bitrate,
            label: l.height ? `${l.height}P` : `${Math.round(l.bitrate / 1000)}kbps`,
          })).sort((a, b) => b.height - a.height)
          setLevels(qualityLevels)

          // Prefer H.264, fallback to highest quality
          const h264Indices: number[] = []
          hlsLevels.forEach((level, i) => {
            const codec = level.videoCodec?.toLowerCase() || ''
            if (!codec.includes('hev') && !codec.includes('h265') && !codec.includes('hvc')) {
              h264Indices.push(i)
            }
          })

          if (h264Indices.length > 0 && h264Indices.length < hlsLevels.length) {
            const sorted = [...h264Indices].sort((a, b) => hlsLevels[b].height - hlsLevels[a].height)
            hls!.currentLevel = sorted[0]
          } else if (hlsLevels.length > 0) {
            const sorted = [...qualityLevels].sort((a, b) => b.height - a.height)
            hls!.currentLevel = sorted[0].index
          }

          setCurrentLevel(hls!.currentLevel)
        }

        tryPlay()
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (destroyed) return
        if (data.fatal) {
          // Try recovery for media errors first
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++
            console.log(`[player] Media error, recovering (${retryCountRef.current}/${MAX_RETRIES})`)
            setPlayerStatus(`媒体错误，恢复中 (${retryCountRef.current}/${MAX_RETRIES})...`)
            try {
              hls!.recoverMediaError()
              return
            } catch {
              // Recovery failed, fall through to auto-switch
            }
          }

          // Auto-switch to next source if available
          if (allItems.length > 1 && currentSourceIndex >= 0 && currentSourceIndex < allItems.length - 1) {
            const nextItem = allItems[currentSourceIndex + 1]
            if (nextItem) {
              console.log('[player] Auto-switching to source:', nextItem.sourceKey)
              const nextSources = parsePlayUrl(nextItem.vodPlayUrl)
              if (nextSources.length > 0 && nextSources[0].episodes.length > epIdx) {
                onSwitchSource(currentSourceIndex + 1)
                const sk = encodeURIComponent(nextItem.sourceKey)
                const vid = encodeURIComponent(nextItem.vodId)
                navigate(`/play/${sk}/${vid}?src=0&ep=${epIdx}`, {
                  replace: true,
                  state: { allItems }
                })
                return
              }
            }
          }

          // No more sources — show error
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try network retry before giving up
              if (retryCountRef.current < MAX_RETRIES) {
                retryLoad()
                return
              }
              setPlayerError(`网络错误：${data.details || '无法加载视频流'}`)
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setPlayerError(`媒体错误：${data.details || '解码失败'}`)
              break
            default:
              setPlayerError(`播放器错误：${data.details || '未知错误'}`)
              break
          }
          hls?.stopLoad()
        }
      })

      // Recover from buffer stall
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (destroyed) return
        retryCountRef.current = 0
      })
    } else if (isM3u8) {
      // Native HLS (iOS Safari) — set src and try to play
      video.src = proxyUrl
      video.addEventListener('loadedmetadata', () => tryPlay(), { once: true })
      video.addEventListener('canplay', () => {
        if (!destroyed) {
          setPlayerStatus('')
          retryCountRef.current = 0
        }
      }, { once: true })
      video.addEventListener('error', () => {
        if (destroyed) return
        if (retryCountRef.current < MAX_RETRIES) {
          retryLoad()
        } else {
          setPlayerError('视频加载失败，请尝试切换其他片源')
        }
      })
      tryPlay()
    } else {
      // Direct video URL
      video.src = proxyUrl
      video.addEventListener('canplay', () => {
        if (!destroyed) setPlayerStatus('')
      }, { once: true })
      video.addEventListener('error', () => {
        if (destroyed) return
        if (retryCountRef.current < MAX_RETRIES) {
          retryLoad()
        } else {
          setPlayerError('视频加载失败，请尝试切换其他片源')
        }
      })
      tryPlay()
    }

    const onTime = () => setCurrentTime(video.currentTime)
    const onDuration = () => setDuration(video.duration || 0)
    const onPlay = () => { setPlaying(true); setPlayerStatus('') }
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)
    const onWaiting = () => {
      if (!destroyed && playing) setPlayerStatus('缓冲中...')
    }
    const onPlaying = () => {
      if (!destroyed) setPlayerStatus('')
    }

    video.addEventListener('timeupdate', onTime)
    video.addEventListener('loadedmetadata', onDuration)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)

    return () => {
      destroyed = true
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('loadedmetadata', onDuration)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      // Proper HLS teardown
      if (hls) {
        hls.stopLoad()
        hls.destroy()
        hls = null
      }
      hlsRef.current = null
      // Don't call video.load() — it causes black screen flash on mobile.
      // Just detach src so the element can be GC'd naturally.
      video.removeAttribute('src')
    }
  }, [url])

  // Resume playback when app comes back to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const video = videoRef.current
        if (video && !video.paused && video.readyState < 3) {
          // Video buffer ran out while in background — nudge it
          video.play().catch(() => {})
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Fullscreen listener — handle webkit prefix for iOS
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
      )
    }
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler)
    }
  }, [])

  // Long press & double tap detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>()
  const lastTapTime = useRef(0)
  const [isLongPress, setIsLongPress] = useState(false)
  const [showSpeedHint, setShowSpeedHint] = useState(false)
  const [tapSide, setTapSide] = useState<'left' | 'right' | null>(null)
  const [showTapHint, setShowTapHint] = useState(false)

  const handleVideoInteractionStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true)
      setShowSpeedHint(true)
      const video = videoRef.current
      if (video) video.playbackRate = 2
      setTimeout(() => setShowSpeedHint(false), 1000)
    }, 500)
  }

  const handleVideoInteractionEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const video = videoRef.current
    if (!video) return

    clearTimeout(longPressTimer.current)

    if (isLongPress) {
      video.playbackRate = 1
      setIsLongPress(false)
      return
    }

    // Double tap detection
    const now = Date.now()
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
    const screenWidth = window.innerWidth
    const isLeftSide = clientX < screenWidth / 3
    const isRightSide = clientX > (screenWidth * 2) / 3

    if (now - lastTapTime.current < 300) {
      // Double tap — pause/play
      togglePlay()
      setShowTapHint(true)
      setTimeout(() => setShowTapHint(false), 800)
    } else {
      // Single tap — show/hide controls
      setShowControls(true)
      clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => {
        if (playing) setShowControls(false)
      }, 3000)

      // Show tap side hint
      if (isLeftSide) {
        setTapSide('left')
        setShowTapHint(true)
        setTimeout(() => { setTapSide(null); setShowTapHint(false) }, 800)
      } else if (isRightSide) {
        setTapSide('right')
        setShowTapHint(true)
        setTimeout(() => { setTapSide(null); setShowTapHint(false) }, 800)
      }
    }
    lastTapTime.current = now
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
    if (!video.muted && video.volume === 0) {
      video.volume = 1
      setVolume(100)
    }
  }

  const changeVolume = (newVol: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = newVol / 100
    setVolume(newVol)
    if (newVol === 0) {
      video.muted = true
      setMuted(true)
    } else if (video.muted) {
      video.muted = false
      setMuted(false)
    }
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    const doc = document as any
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
    } else {
      if (el.requestFullscreen) el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    }
  }

  const [isDragging, setIsDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)
  const dragProgressRef = useRef(0)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const lastClientXRef = useRef(0)

  const seekToPosition = (clientX: number) => {
    const video = videoRef.current
    const bar = progressBarRef.current
    if (!video || !duration || !bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    video.currentTime = pct * duration
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    lastClientXRef.current = e.clientX
    const video = videoRef.current
    const bar = progressBarRef.current
    if (!video || !duration || !bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setDragProgress(pct)
    dragProgressRef.current = pct
    video.currentTime = pct * duration
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    const touch = e.touches[0]
    lastClientXRef.current = touch.clientX
    const video = videoRef.current
    const bar = progressBarRef.current
    if (!video || !duration || !bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    setDragProgress(pct)
    dragProgressRef.current = pct
    video.currentTime = pct * duration
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const bar = progressBarRef.current
      if (!bar || !duration) return
      const rect = bar.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setDragProgress(pct)
      dragProgressRef.current = pct
      lastClientXRef.current = e.clientX
      const video = videoRef.current
      if (video) video.currentTime = pct * duration
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const bar = progressBarRef.current
      if (!bar || !duration) return
      const rect = bar.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
      setDragProgress(pct)
      dragProgressRef.current = pct
      lastClientXRef.current = touch.clientX
      const video = videoRef.current
      if (video) video.currentTime = pct * duration
    }

    const handleEnd = () => {
      setIsDragging(false)
      const video = videoRef.current
      if (video && duration) {
        video.currentTime = dragProgressRef.current * duration
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, duration])

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const showControlsTemp = () => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const v = videoRef.current
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k': e.preventDefault(); togglePlay(); break
        case 'f': e.preventDefault(); toggleFullscreen(); break
        case 'm': e.preventDefault(); toggleMute(); break
        case 'arrowleft':
        case 'j': e.preventDefault(); if (v) v.currentTime -= 10; break
        case 'arrowright':
        case 'l': e.preventDefault(); if (v) v.currentTime += 10; break
        case 'arrowup': e.preventDefault(); changeVolume(Math.min(100, volume + 10)); break
        case 'arrowdown': e.preventDefault(); changeVolume(Math.max(0, volume - 10)); break
        case 'n': e.preventDefault(); if (hasNext) onNext(); break
        case 'p': e.preventDefault(); if (hasPrev) onPrev(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasNext, hasPrev, volume])

  // Progress save — every 5 seconds + on close
  useEffect(() => {
    const video = videoRef.current
    if (!video || !onProgress) return

    const interval = setInterval(() => {
      if (video.duration > 0) {
        onProgress(video.currentTime / video.duration)
      }
    }, 5000)

    const handleBeforeUnload = () => {
      if (video.duration > 0) {
        onProgress(video.currentTime / video.duration)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (video.duration > 0) {
        onProgress(video.currentTime / video.duration)
      }
    }
  }, [onProgress])

  const changeSpeed = (s: number) => {
    const v = videoRef.current
    if (v) v.playbackRate = s
    setSpeed(s)
    setShowSpeedMenu(false)
  }

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-tile overflow-hidden group"
      onMouseMove={showControlsTemp}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Error overlay */}
      {playerError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 gap-3 p-8">
          <AlertTriangle size={32} strokeWidth={1.5} className="text-amber-400" />
          <p className="text-[13px] text-white/80 text-center max-w-[400px]">{playerError}</p>
          <p className="text-[11px] text-muted text-center max-w-[400px]">
            该视频源播放失败，可能是跨域或防盗链限制。请尝试切换其他片源播放。
          </p>
          <div className="flex gap-3 mt-2">
            <a
              href={proxy(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-btn bg-accent/10 border border-accent/30
                text-[13px] text-accent hover:bg-accent/20 transition-all duration-180"
            >
              <ExternalLink size={14} />
              在新标签页打开
            </a>
            <button
              onClick={() => {
                setPlayerError(null)
                retryCountRef.current = 0
                if (videoRef.current) {
                  videoRef.current.src = proxy(url)
                  videoRef.current.load()
                  videoRef.current.play().catch(() => {})
                }
              }}
              className="px-4 py-2 rounded-btn border border-white/10 text-[13px] text-ink-2
                hover:border-white/20 transition-all duration-180"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black cursor-pointer"
        onMouseDown={handleVideoInteractionStart}
        onMouseUp={handleVideoInteractionEnd}
        onTouchStart={handleVideoInteractionStart}
        onTouchEnd={handleVideoInteractionEnd}
        playsInline
        webkit-playsinline=""
        x5-playsinline=""
        x5-video-player-type="h5"
        x5-video-player-fullscreen="true"
        muted
        preload="auto"
      />

      {/* Status overlay */}
      {playerStatus && !playerError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
            <span className="text-[13px] text-white/70">{playerStatus}</span>
          </div>
          {/* Loading tip after 5 seconds */}
          {showLoadingTip && (
            <button
              onClick={() => {
                const savedQuery = sessionStorage.getItem('sv_search_query')
                navigate(savedQuery ? `/search?q=${encodeURIComponent(savedQuery)}` : '/search', { replace: true })
              }}
              className="mt-4 px-4 py-2 rounded-btn bg-white/10 border border-white/20 text-[12px] text-white/80
                hover:bg-white/20 transition-all duration-200 animate-fade-up"
            >
              请耐心等待哦，若长时间无法加载，请点击返回更换片源
            </button>
          )}
        </div>
      )}

      {/* Mobile/tablet fullscreen back button — returns to detail page */}
      {isFullscreen && (
        <button
          onClick={() => {
            const doc = document as any
            if (document.fullscreenElement || doc.webkitFullscreenElement) {
              if (doc.exitFullscreen) doc.exitFullscreen()
              else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
            }
            navigate(`/detail/${encodeURIComponent(sourceKey)}/${encodeURIComponent(vodId)}`, { replace: true })
          }}
          className="absolute top-3 left-3 z-20 p-2 rounded-full bg-black/50 backdrop-blur-sm
            text-white/80 hover:text-white hover:bg-black/70 transition-all duration-200 md:hidden"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      )}

      {/* 2x speed hint */}
      {showSpeedHint && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-xl bg-black/80 backdrop-blur-sm animate-fade-up">
            <span className="text-[18px] font-bold text-accent">2x</span>
            <span className="text-[12px] text-white/80 ml-2">倍速播放中</span>
          </div>
        </div>
      )}

      {/* Tap hint */}
      {showTapHint && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-lg bg-black/70 backdrop-blur-sm animate-fade-up">
            {tapSide === 'left' ? (
              <ChevronLeft size={24} className="text-white/80" />
            ) : tapSide === 'right' ? (
              <ChevronRight size={24} className="text-white/80" />
            ) : playing ? (
              <Pause size={24} className="text-white/80" />
            ) : (
              <Play size={24} className="text-white/80" />
            )}
          </div>
        </div>
      )}

      {/* Center play button */}
      {!playing && !playerError && !playerStatus && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40
            transition-opacity duration-220"
        >
          <div className="w-16 h-16 rounded-full bg-accent/20 backdrop-blur-md border border-accent/30
            flex items-center justify-center hover:bg-accent/30 transition-all duration-180 hover:scale-105">
            <Play size={28} fill="#00F5D4" strokeWidth={0} className="ml-1" />
          </div>
        </button>
      )}

      {/* Muted hint — shown briefly when autoplaying muted */}
      {playing && muted && !playerError && (
        <button
          onClick={toggleMute}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2
            px-4 py-2 rounded-pill bg-black/70 backdrop-blur-md border border-white/15
            text-[12px] text-white/90 hover:bg-black/85 hover:border-white/25
            transition-all duration-300 animate-fade-up cursor-pointer"
        >
          <VolumeX size={14} strokeWidth={1.5} className="text-accent" />
          点击取消静音
        </button>
      )}

      {/* Title overlay */}
      {title && showControls && !playerError && (
        <div className="absolute top-0 left-0 right-0 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <span className="text-[13px] font-semibold text-white">{title}</span>
        </div>
      )}

      {/* Controls bar */}
      {!playerError && (
        <div
          className={`absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent
            transition-opacity duration-220 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/* Progress bar */}
          <div className="relative mb-2">
            {/* Time tooltip when dragging */}
            {isDragging && (
              <div
                className="absolute -top-8 transform -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-[11px] text-white tabular-nums pointer-events-none z-10"
                style={{ left: `${dragProgress * 100}%` }}
              >
                {formatTime(dragProgress * duration)}
              </div>
            )}
            <div
              ref={progressBarRef}
              className={`h-1.5 bg-white/20 rounded-full cursor-pointer group/progress ${isDragging ? 'h-2' : ''}`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div
                className="h-full bg-accent rounded-full relative transition-none"
                style={{ width: isDragging ? `${dragProgress * 100}%` : duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              >
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full
                  shadow-md transition-opacity ${isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover/progress:opacity-100'}`} />
              </div>
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button onClick={onPrev} disabled={!hasPrev}
                className="p-1.5 sm:p-1 text-white/80 hover:text-white disabled:opacity-30 transition-all duration-180">
                <SkipBack size={18} strokeWidth={1.5} />
              </button>
              <button onClick={togglePlay}
                className="p-1.5 sm:p-1 text-white/90 hover:text-white transition-all duration-180">
                {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
              </button>
              <button onClick={onNext} disabled={!hasNext}
                className="p-1.5 sm:p-1 text-white/80 hover:text-white disabled:opacity-30 transition-all duration-180">
                <SkipForward size={18} strokeWidth={1.5} />
              </button>
            </div>

            <span className="text-[10px] sm:text-[11px] text-white/60 tabular-nums min-w-[60px] sm:min-w-[72px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1 hidden sm:block" />

            {/* Quality selector */}
            {levels.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualities(!showQualities)}
                  className={`p-1 sm:p-1.5 transition-all duration-180 text-[10px] sm:text-[11px] font-bold min-w-[30px] sm:min-w-[36px] text-center rounded
                    ${currentLevel === -1 ? 'text-accent' : 'text-white/80 hover:text-white'}`}
                  title="清晰度"
                >
                  {currentLevel === -1 ? '自动' : levels.find(l => l.index === currentLevel)?.label || '自动'}
                </button>
                {showQualities && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md border border-white/10
                    rounded-btn p-1 shadow-xl z-30 min-w-[80px]">
                    <button
                      onClick={() => {
                        const h = hlsRef.current
                        if (h) h.currentLevel = -1
                        setCurrentLevel(-1)
                        setShowQualities(false)
                      }}
                      className={`block w-full text-left px-3 py-1.5 rounded-btn text-[12px] font-medium
                        transition-all duration-120 whitespace-nowrap
                        ${currentLevel === -1 ? 'text-accent bg-accent/10' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'}`}
                    >
                      自动
                    </button>
                    {levels.map((l) => (
                      <button
                        key={l.index}
                        onClick={() => {
                          const h = hlsRef.current
                          if (h) h.currentLevel = l.index
                          setCurrentLevel(l.index)
                          setShowQualities(false)
                        }}
                        className={`block w-full text-left px-3 py-1.5 rounded-btn text-[12px] font-medium
                          transition-all duration-120 whitespace-nowrap
                          ${currentLevel === l.index ? 'text-accent bg-accent/10' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Speed button + menu */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`p-1.5 transition-all duration-180 ${speed !== 1 ? 'text-accent' : 'text-white/80 hover:text-white'}`}
              >
                <Gauge size={15} strokeWidth={1.5} />
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md border border-white/10
                  rounded-btn p-1 shadow-xl z-30">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`block w-full text-left px-3 py-1.5 rounded-btn text-[12px] font-medium
                        transition-all duration-120 whitespace-nowrap
                        ${s === speed ? 'text-accent bg-accent/10' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'}`}
                    >
                      {s === 1 ? '正常' : `${s}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume control - horizontal slider like Bilibili/YouTube */}
            <div
              className="relative flex items-center gap-1 hidden sm:flex group/vol"
              onMouseEnter={() => {
                clearTimeout(hideTimer.current)
                setShowVolumeSlider(true)
              }}
              onMouseLeave={() => {
                hideTimer.current = setTimeout(() => setShowVolumeSlider(false), 300)
              }}
            >
              <button onClick={toggleMute}
                className="p-1.5 text-white/80 hover:text-white transition-all duration-180">
                {muted || volume === 0 ? <VolumeX size={16} strokeWidth={1.5} /> : <Volume2 size={16} strokeWidth={1.5} />}
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}
              >
                <div className="relative h-4 flex items-center px-0.5">
                  <div className="absolute left-0.5 right-0.5 h-1 bg-white/20 rounded-full" />
                  <div
                    className="absolute left-0.5 h-1 bg-accent rounded-full"
                    style={{ width: `${muted ? 0 : volume}%`, maxWidth: 'calc(100% - 4px)' }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer
                      [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>
              </div>
              <span className={`text-[10px] text-white/60 tabular-nums transition-all duration-200 ${showVolumeSlider ? 'w-8 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                {muted ? 0 : volume}
              </span>
            </div>

            {/* Episodes button */}
            {sources.length > 0 && (
              <button onClick={() => setShowEpisodes(!showEpisodes)}
                className={`p-1.5 transition-all duration-180 ${showEpisodes ? 'text-accent' : 'text-white/80 hover:text-white'}`}>
                <List size={16} strokeWidth={1.5} />
              </button>
            )}

            <button onClick={toggleFullscreen}
              className="p-1.5 text-white/80 hover:text-white transition-all duration-180">
              {isFullscreen ? <Minimize size={16} strokeWidth={1.5} /> : <Maximize size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      )}

      {/* Episodes panel - slides in from right */}
      {showEpisodes && (
        <div className="absolute top-0 right-0 bottom-0 w-72 sm:w-80 z-30 bg-black/95 backdrop-blur-md
          border-l border-white/10 flex flex-col animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-[14px] font-semibold text-white">选集</h3>
            <button onClick={() => setShowEpisodes(false)}
              className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>

          {/* Episode list */}
          <div className="flex-1 overflow-y-auto p-3">
            {sources.map((source, si) => (
              <div key={si} className="mb-4">
                {sources.length > 1 && (
                  <h4 className="text-[12px] text-white/50 font-medium mb-2">{source.name}</h4>
                )}
                <div className="grid grid-cols-4 gap-1.5">
                  {source.episodes.map((ep, ei) => {
                    const isActive = si === srcIdx && ei === epIdx
                    return (
                      <button
                        key={ei}
                        onClick={() => {
                          navigate(`/play/${encodeURIComponent(sourceKey)}/${encodeURIComponent(vodId)}?src=${si}&ep=${ei}`, { replace: true })
                          setShowEpisodes(false)
                        }}
                        className={`px-2 py-2 rounded-btn text-[11px] font-medium truncate transition-all duration-150
                          ${isActive
                            ? 'bg-accent/20 text-accent border border-accent/40'
                            : 'bg-white/[0.06] text-white/70 border border-white/[0.08] hover:bg-white/[0.12] hover:text-white'
                          }`}
                        title={ep.name}
                      >
                        {ep.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
