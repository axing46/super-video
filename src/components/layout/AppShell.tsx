import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, History, Heart, Settings, Tv, Menu, X, Sun, Moon } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { useTheme } from '@/hooks/useTheme'

const NAV = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/search', icon: Search, label: '搜索' },
  { to: '/favorites', icon: Heart, label: '收藏' },
  { to: '/history', icon: History, label: '历史' },
  { to: '/sources', icon: Settings, label: '片源管理' },
]

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { toggleTheme, isDark } = useTheme()

  if (hideNav) {
    return <main className="min-h-screen bg-bg">{children}</main>
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* ─── Navbar — KVideo-style floating glass pill ─── */}
      <nav className="sticky top-0 z-[2000] pt-2 sm:pt-3 pb-1" style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="glass-card px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity flex-shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center">
                <Tv size={16} className="text-accent sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-bold text-ink leading-tight">TVCC</span>
                <span className="text-[10px] text-muted leading-tight">影视聚合搜索</span>
              </div>
            </NavLink>

            {/* Desktop nav links (md: tablet, lg: desktop) */}
            <div className="hidden md:flex items-center gap-1">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[12px] font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-accent/15 text-accent border border-accent/25'
                      : 'text-muted hover:text-ink border border-transparent hover:bg-white/[0.04]'
                    }`
                  }
                >
                  <Icon size={14} strokeWidth={1.5} />
                  <span className="hidden lg:inline">{label}</span>
                  <span className="lg:hidden">{label.slice(0, 2)}</span>
                </NavLink>
              ))}
            </div>

            {/* Tablet nav (show more items than phone) */}
            <div className="hidden sm:flex md:hidden items-center gap-0.5">
              {NAV.slice(0, 4).map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `icon-btn w-8 h-8 ${isActive ? '!text-accent !bg-accent/10 !border-accent/25' : ''}`
                  }
                  title={label}
                >
                  <Icon size={14} strokeWidth={1.5} />
                </NavLink>
              ))}
              <button
                onClick={() => setDrawerOpen(true)}
                className="icon-btn w-8 h-8"
                title="更多"
              >
                <Menu size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Search + mobile nav */}
            <div className="flex items-center gap-2">
              <div className="w-[180px] sm:w-[240px] lg:w-[280px] hidden sm:block">
                <SearchBar compact />
              </div>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="icon-btn w-8 h-8"
                title={isDark ? '切换到白天模式' : '切换到夜间模式'}
              >
                {isDark ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
              </button>
              {/* Mobile nav icons (phone only) */}
              <div className="flex sm:hidden items-center gap-0.5">
                {NAV.filter(n => n.to === '/' || n.to === '/search' || n.to === '/favorites').map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `icon-btn w-8 h-8 ${isActive ? '!text-accent !bg-accent/10 !border-accent/25' : ''}`
                    }
                    title={label}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                  </NavLink>
                ))}
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="icon-btn w-8 h-8"
                  title="更多"
                >
                  <Menu size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile search bar below navbar (phone only) */}
      <div className="sm:hidden px-3 pb-1 sticky top-[52px] z-[1999]">
        <SearchBar compact />
      </div>

      {/* ─── Page content ─── */}
      <main className="px-3 sm:px-6 py-3 sm:py-5">
        {children}
      </main>

      {/* Mobile drawer menu */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[3000] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-bg/95 backdrop-blur-md border-l border-white/10 animate-slide-in">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <span className="text-[14px] font-semibold text-ink">菜单</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-muted hover:text-ink transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted hover:text-ink hover:bg-white/[0.04]'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
