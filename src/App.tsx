import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './features/home/HomePage'
import { SearchPage } from './features/search/SearchPage'
import { DetailPage } from './features/detail/DetailPage'
import { HistoryPage } from './features/history/HistoryPage'
import { FavoritesPage } from './features/favorites/FavoritesPage'
import { SourcesPage } from './features/sources/SourcesPage'
import { Loading } from './components/ui/Status'
import { BackToTop } from './components/ui/BackToTop'

const PlayerPage = lazy(() => import('./features/player/PlayerPage').then(m => ({ default: m.PlayerPage })))

function AppRoutes() {
  const location = useLocation()
  const isPlayer = location.pathname.startsWith('/play/')

  return (
    <AppShell hideNav={isPlayer}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/detail/:sourceKey/:vodId" element={<DetailPage />} />
        <Route path="/play/:sourceKey/:vodId" element={
          <Suspense fallback={<Loading message="加载播放器..." />}>
            <PlayerPage />
          </Suspense>
        } />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/sources" element={<SourcesPage />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <>
      <AppRoutes />
      <BackToTop />
    </>
  )
}
