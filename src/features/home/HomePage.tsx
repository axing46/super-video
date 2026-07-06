import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, ChevronDown, ChevronUp, X, Copy, Check, ExternalLink } from 'lucide-react'
import { fetchDoubanSections, type DoubanMovie, type DoubanSection } from './douban'
import { Loading, ErrorState } from '@/components/ui/Status'
import { proxyImageUrl } from '@/utils/proxy'

const POPUP_SHOWN_KEY = 'tvcc_popup_shown_session'

function WelcomePopup() {
  const [show, setShow] = useState(false)
  const [copiedWechat, setCopiedWechat] = useState(false)
  const [copiedQQ, setCopiedQQ] = useState(false)

  useEffect(() => {
    const shown = sessionStorage.getItem(POPUP_SHOWN_KEY)
    if (!shown) {
      setShow(true)
    }
  }, [])

  const handleDismiss = () => {
    setShow(false)
    sessionStorage.setItem(POPUP_SHOWN_KEY, '1')
  }

  const copyToClipboard = useCallback(async (text: string, type: 'wechat' | 'qq') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'wechat') {
        setCopiedWechat(true)
        setTimeout(() => setCopiedWechat(false), 1500)
      } else {
        setCopiedQQ(true)
        setTimeout(() => setCopiedQQ(false), 1500)
      }
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      if (type === 'wechat') {
        setCopiedWechat(true)
        setTimeout(() => setCopiedWechat(false), 1500)
      } else {
        setCopiedQQ(true)
        setTimeout(() => setCopiedQQ(false), 1500)
      }
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card max-w-[380px] w-full p-6 relative animate-fade-up">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 text-muted hover:text-ink transition-all"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-5">
          <h3 className="text-[18px] font-bold text-ink mb-2">感谢使用 TVCC</h3>
          <p className="text-[13px] text-muted leading-relaxed">
            使用中有任何问题或优化意见均可联系
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-btn bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[12px] text-muted w-8">微信</span>
            <span className="text-[13px] text-ink font-medium flex-1">18726591481</span>
            <button
              onClick={() => copyToClipboard('18726591481', 'wechat')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-accent transition-all"
              title="复制"
            >
              {copiedWechat ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-btn bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[12px] text-muted w-8">QQ</span>
            <span className="text-[13px] text-ink font-medium flex-1">1480545128</span>
            <button
              onClick={() => copyToClipboard('1480545128', 'qq')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-accent transition-all"
              title="复制"
            >
              {copiedQQ ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full mt-5 py-2.5 rounded-btn bg-accent/15 border border-accent/30 text-accent text-[13px] font-medium
            hover:bg-accent/25 transition-all duration-200"
        >
          我知道了
        </button>
      </div>
    </div>
  )
}

const INITIAL_SHOW = 12

function DoubanMovieCard({ movie }: { movie: DoubanMovie }) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)

  const handleClick = () => {
    navigate(`/search?q=${encodeURIComponent(movie.title)}`)
  }

  return (
    <button
      onClick={handleClick}
      className="glass-card overflow-hidden text-left w-full cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 group"
    >
      <div className="flex gap-3 p-3">
        {/* Cover image */}
        <div className="w-[80px] h-[110px] flex-shrink-0 rounded-lg overflow-hidden bg-hair">
          {movie.cover && !imgError ? (
            <img
              src={proxyImageUrl(movie.cover)}
              alt={movie.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted/40 text-[10px]">
              {movie.title}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h4 className="text-[13px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
            {movie.title}
          </h4>
          {movie.year && (
            <span className="text-[11px] text-muted mt-1">{movie.year}</span>
          )}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {movie.genres.slice(0, 3).map((g) => (
                <span key={g} className="pill text-[9px]">{g}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-0.5 text-champagne mt-auto pt-1">
            <Star size={12} fill="#f4d28a" strokeWidth={0} />
            <span className="text-[12px] font-bold">{movie.rate}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function SectionRow({ section }: { section: DoubanSection }) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = section.movies.length > INITIAL_SHOW
  const visible = expanded ? section.movies : section.movies.slice(0, INITIAL_SHOW)

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-ink">{section.label}</h2>
        <span className="text-[11px] text-muted">{section.movies.length} 部</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {visible.map((movie) => (
          <DoubanMovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mx-auto mt-4 px-5 py-2 rounded-btn border border-white/10
            text-[12px] text-muted hover:text-ink hover:border-white/20 transition-all duration-200"
        >
          {expanded ? (
            <><ChevronUp size={14} /> 收起</>
          ) : (
            <><ChevronDown size={14} /> 展开更多 ({section.movies.length - INITIAL_SHOW} 部)</>
          )}
        </button>
      )}
    </section>
  )
}

export function HomePage() {
  const [sections, setSections] = useState<DoubanSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDoubanSections()
      .then((data) => {
        setSections(data)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (loading) return <Loading message="加载豆瓣电影数据..." />

  return (
    <div className="max-w-7xl mx-auto">
      <WelcomePopup />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-ink">豆瓣热门推荐</h2>
          <p className="text-[12px] text-muted mt-1">数据来源：豆瓣电影</p>
        </div>
        <a
          href="https://movie.douban.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[12px] text-muted hover:text-accent transition-colors"
        >
          <ExternalLink size={12} />
          豆瓣
        </a>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <SectionRow key={section.label} section={section} />
      ))}
    </div>
  )
}
