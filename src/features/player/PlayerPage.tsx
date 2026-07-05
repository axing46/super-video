import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Maximize, Minimize, SkipBack, SkipForward, Volume2, VolumeX, AlertTriangle, ExternalLink, Gauge } from 'lucide-react'
import Hls from 'hls.js'
import { useDetail } from '@/features/detail/hooks'
import { parsePlayUrl } from '@/features/detail/api'
import { addHistory } from '@/features/history/storage'
import { Loading, ErrorState } from '@/components/ui/Status'

/** Route video requests through Vite's embedded proxy for anti-leech headers */
function proxy(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`
}

export function PlayerPage() {
  const { sourceKey, vodId } = useParams<{ sourceKey: string; vodId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const srcIdx = parseInt(searchParams.get('src') ?? '0', 10)
  const epIdx = parseInt(searchParams.get('ep') ?? '0', 10)

  const { data: detail, isLoading, isError, error } = useDetail(
    decodeURIComponent(sourceKey ?? ''),
    decodeURIComponent(vodId ?? ''),
  )

  const sources = detail ? parsePlayUrl(detail.vodPlayUrl) : []
  const currentSource = sources[srcIdx]
  const currentEpisode = currentSource?.episodes?.[epIdx]
  const episodeUrl = currentEpisode?.url ?? ''

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
        <button onClick={() => navigate('/search', { replace: true })} className="icon-btn w-10 h-10">
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

function VideoPlayer({
  url,
  title,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onProgress,
}: {
  url: string
  title: string
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  onProgress?: (progress: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [playerStatus, setPlayerStatus] = useState('正在连接...')
  const [speed, setSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [levels, setLevels] = useState<{ index: number; height: number; bitrate: number; label: string }[]>([])
  const [currentLevel, setCurrentLevel] = useState(-1) // -1 = auto ABR
  const [showQualities, setShowQualities] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()

  const isM3u8 = url.toLowerCase().includes('.m3u8')

  // Init player
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setPlayerError(null)
    setPlayerStatus('正在连接...')

    let destroyed = false
    let hls: Hls | null = null

    const proxyUrl = proxy(url)
    console.log('[player] Loading:', proxyUrl)

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        debug: false,
        // ABR: prefer higher quality
        abrEwmaDefaultEstimate: 5_000_000, // Assume 5Mbps initially (not 500kbps)
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })
      hlsRef.current = hls

      hls.loadSource(proxyUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyed) return
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
            // Has both H.264 and HEVC — pick highest H.264
            const sorted = [...h264Indices].sort((a, b) => hlsLevels[b].height - hlsLevels[a].height)
            hls!.currentLevel = sorted[0]
          } else if (hlsLevels.length > 0) {
            // All same codec — force highest quality
            const sorted = [...qualityLevels].sort((a, b) => b.height - a.height)
            hls!.currentLevel = sorted[0].index
          }

          setCurrentLevel(hls!.currentLevel)
        }

        video.play().catch(() => setPlayerStatus('点击播放'))
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (destroyed) return
        if (data.fatal) {
          // Don't try recoverMediaError() — it creates recovery loops.
          // Just show the error and let the user retry manually.
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setPlayerError(`网络错误：${data.details || '无法加载视频流'}`)
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setPlayerError(`媒体错误：${data.details || '解码失败'}`)
              break
            default:
              setPlayerError(`播放器错误：${data.details || '未知错误'}`)
              break
          }
          // Stop trying to load — avoid infinite error loop
          hls?.stopLoad()
        }
        // Non-fatal: hls.js handles internally, don't show anything
      })
    } else if (isM3u8) {
      video.src = proxyUrl
      video.play().catch(() => setPlayerStatus('点击播放'))
    } else {
      video.src = proxyUrl
    }

    const onTime = () => setCurrentTime(video.currentTime)
    const onDuration = () => setDuration(video.duration || 0)
    const onPlay = () => { setPlaying(true); setPlayerStatus('') }
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)
    // Removed auto-switch onEnded — was causing confusion with error recovery

    video.addEventListener('timeupdate', onTime)
    video.addEventListener('loadedmetadata', onDuration)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)

    return () => {
      destroyed = true
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('loadedmetadata', onDuration)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      // Proper HLS teardown: stopLoad first, then destroy
      if (hls) {
        hls.stopLoad()
        hls.destroy()
        hls = null
      }
      hlsRef.current = null
      // Reset video element state
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [url])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

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
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen()
    }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    video.currentTime = pct * duration
  }

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
        case 'arrowup': e.preventDefault(); if (v) v.volume = Math.min(1, v.volume + 0.1); break
        case 'arrowdown': e.preventDefault(); if (v) v.volume = Math.max(0, v.volume - 0.1); break
        case 'n': e.preventDefault(); if (hasNext) onNext(); break
        case 'p': e.preventDefault(); if (hasPrev) onPrev(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasNext, hasPrev])

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
      // Save final progress on cleanup
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
                if (videoRef.current) {
                  videoRef.current.src = proxy(url)
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
        onClick={togglePlay}
        playsInline
        muted
      />

      {/* Status overlay */}
      {playerStatus && !playerError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent/40 border-t-accent rounded-full animate-spin" />
            <span className="text-[13px] text-white/70">{playerStatus}</span>
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
          <div
            className="h-1 bg-white/20 rounded-full mb-2 cursor-pointer group/progress"
            onClick={seek}
          >
            <div
              className="h-full bg-accent rounded-full relative"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full
                opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md" />
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={onPrev} disabled={!hasPrev}
                className="p-1 text-white/80 hover:text-white disabled:opacity-30 transition-all duration-180">
                <SkipBack size={16} strokeWidth={1.5} />
              </button>
              <button onClick={togglePlay}
                className="p-1 text-white/90 hover:text-white transition-all duration-180">
                {playing ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
              </button>
              <button onClick={onNext} disabled={!hasNext}
                className="p-1 text-white/80 hover:text-white disabled:opacity-30 transition-all duration-180">
                <SkipForward size={16} strokeWidth={1.5} />
              </button>
            </div>

            <span className="text-[11px] text-white/60 tabular-nums min-w-[72px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Quality selector */}
            {levels.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualities(!showQualities)}
                  className={`p-1 transition-all duration-180 text-[11px] font-bold min-w-[36px] text-center rounded
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
                        const v = videoRef.current
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
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`p-1 transition-all duration-180 ${speed !== 1 ? 'text-accent' : 'text-white/80 hover:text-white'}`}
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

            <button onClick={toggleMute}
              className="p-1 text-white/80 hover:text-white transition-all duration-180">
              {muted ? <VolumeX size={16} strokeWidth={1.5} /> : <Volume2 size={16} strokeWidth={1.5} />}
            </button>

            <button onClick={toggleFullscreen}
              className="p-1 text-white/80 hover:text-white transition-all duration-180">
              {isFullscreen ? <Minimize size={16} strokeWidth={1.5} /> : <Maximize size={16} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
