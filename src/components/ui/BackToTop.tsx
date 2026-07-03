import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 500)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 icon-btn w-10 h-10 rounded-btn
        border-white/[0.10] hover:border-accent/30 animate-fade-up"
      title="回到顶部"
    >
      <ArrowUp size={16} strokeWidth={1.5} />
    </button>
  )
}
