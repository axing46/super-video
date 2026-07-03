import { Loader2, AlertTriangle, Inbox } from 'lucide-react'

interface StatusProps {
  message?: string
  className?: string
}

export function Loading({ message = '加载中...', className = '' }: StatusProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 gap-4 ${className}`}>
      <Loader2 size={28} strokeWidth={1.5} className="text-accent animate-spin" />
      <p className="text-[13px] text-muted">{message}</p>
    </div>
  )
}

export function ErrorState({
  message = '加载失败',
  onRetry,
  className = '',
}: StatusProps & { onRetry?: () => void }) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 gap-4 ${className}`}>
      <AlertTriangle size={28} strokeWidth={1.5} className="text-champagne" />
      <p className="text-[13px] text-muted">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-btn border border-white/10 bg-white/[0.04] text-[13px] text-ink-2
            hover:border-accent/30 hover:text-accent transition-all duration-180"
        >
          重试
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  message = '暂无内容',
  className = '',
}: StatusProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 gap-4 ${className}`}>
      <Inbox size={28} strokeWidth={1.5} className="text-muted/50" />
      <p className="text-[13px] text-muted">{message}</p>
    </div>
  )
}
