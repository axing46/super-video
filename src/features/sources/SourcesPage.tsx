import { useState } from 'react'
import { Plus, Download, ClipboardPaste, Trash2, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { useSources } from './hooks'
import type { LocalVodSource } from '@/core/models'
import { getSourceDisplayName } from '@/utils/source-names'
import { Loading, EmptyState } from '@/components/ui/Status'

const DEFAULT_REMOTE_URL = 'https://raw.githubusercontent.com/WEP-56/TTTTV-config/main/sources.json'

export function SourcesPage() {
  const { sources, isLoading, toggle, remove, importSources, importSourcesFromJson, addSource } = useSources()
  const [importMode, setImportMode] = useState<'url' | 'paste' | 'add'>('url')
  const [importUrl, setImportUrl] = useState(DEFAULT_REMOTE_URL)
  const [pasteText, setPasteText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  // Add form state
  const [addKey, setAddKey] = useState('')
  const [addName, setAddName] = useState('')
  const [addApi, setAddApi] = useState('')

  const filteredSources = sources.filter((s) =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase()) || s.key.toLowerCase().includes(filter.toLowerCase())
  )

  const enabledCount = sources.filter((s) => s.enabled).length

  const handleUrlImport = async () => {
    setImporting(true); setImportResult(null)
    try {
      const result = await importSources(importUrl.trim())
      const parts: string[] = []
      if (result.added.length) parts.push(`已添加 ${result.added.length} 个`)
      if (result.skipped.length) parts.push(`跳过 ${result.skipped.length} 个`)
      setImportResult(parts.join(' · ') || '无有效片源')
    } catch (e) {
      setImportResult(`导入失败: ${(e as Error).message}`)
    } finally { setImporting(false) }
  }

  const handlePasteImport = async () => {
    setImporting(true); setImportResult(null)
    try {
      const result = await importSourcesFromJson(pasteText)
      const parts: string[] = []
      if (result.added.length) parts.push(`已添加 ${result.added.length} 个`)
      if (result.skipped.length) parts.push(`跳过 ${result.skipped.length} 个`)
      setImportResult(parts.join(' · ') || '无有效片源')
    } catch (e) {
      setImportResult(`导入失败: ${(e as Error).message}`)
    } finally { setImporting(false) }
  }

  const handleAdd = async () => {
    setImporting(true); setImportResult(null)
    try {
      await addSource({
        key: addKey.trim(),
        name: addName.trim() || addKey.trim(),
        apiUrl: addApi.trim(),
        detailUrl: addApi.trim(),
        enabled: true,
      })
      setAddKey(''); setAddName(''); setAddApi('')
      setImportMode('url')
      setImportResult('已添加')
    } catch (e) {
      setImportResult(`添加失败: ${(e as Error).message}`)
    } finally { setImporting(false) }
  }

  if (isLoading) return <Loading />

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-ink">片源管理</h2>
        <p className="text-[12px] text-muted mt-1">
          {sources.length} 个片源 · {enabledCount} 个已启用
        </p>
      </div>

      {/* ─── Import section ─── */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          {(['url', 'paste', 'add'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setImportMode(mode); setImportResult(null) }}
              className={`text-[12px] font-semibold pb-1.5 border-b-2 transition-all duration-200
                ${importMode === mode ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink-2'}`}
            >
              {{ url: 'URL 导入', paste: '粘贴 JSON', add: '手动添加' }[mode]}
            </button>
          ))}
        </div>

        {importMode === 'url' ? (
          <div className="flex gap-2">
            <input type="text" value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
              className="flex-1 glass-input h-10 px-4 text-[13px] placeholder:text-muted/60" placeholder="片源 JSON URL..." />
            <button onClick={handleUrlImport} disabled={importing}
              className="flex items-center gap-1.5 px-4 h-10 rounded-btn bg-accent text-white text-[13px] font-semibold
              hover:bg-accent-hover transition-all duration-200 disabled:opacity-50">
              <Download size={14} /> {importing ? '导入中' : '导入'}
            </button>
          </div>
        ) : importMode === 'paste' ? (
          <div>
            <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
              rows={6} placeholder='[{"key":"xxx","name":"示例","api":"https://..."}]'
              className="w-full glass-input p-3 text-[13px] placeholder:text-muted/60 resize-y font-mono" />
            <button onClick={handlePasteImport} disabled={importing || !pasteText.trim()}
              className="flex items-center gap-1.5 mt-2 px-4 h-10 rounded-btn bg-accent text-white text-[13px] font-semibold
              hover:bg-accent-hover transition-all duration-200 disabled:opacity-50">
              <ClipboardPaste size={14} /> {importing ? '导入中' : '导入 JSON'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={addKey} onChange={(e) => setAddKey(e.target.value)}
                className="glass-input h-10 px-4 text-[13px] placeholder:text-muted/60" placeholder="标识 (key)" />
              <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)}
                className="glass-input h-10 px-4 text-[13px] placeholder:text-muted/60" placeholder="名称 (可选)" />
            </div>
            <input type="text" value={addApi} onChange={(e) => setAddApi(e.target.value)}
              className="w-full glass-input h-10 px-4 text-[13px] placeholder:text-muted/60" placeholder="API 地址 (https://...)" />
            <button onClick={handleAdd} disabled={importing || !addKey.trim() || !addApi.trim()}
              className="flex items-center gap-1.5 px-4 h-10 rounded-btn bg-accent text-white text-[13px] font-semibold
              hover:bg-accent-hover transition-all duration-200 disabled:opacity-50">
              <Plus size={14} /> 添加
            </button>
          </div>
        )}

        {importResult && (
          <p className="mt-3 text-[12px] text-muted">{importResult}</p>
        )}
      </div>

      {/* ─── Filter ─── */}
      {sources.length > 6 && (
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
            className="w-full glass-input h-9 pl-9 pr-3 text-[12px] placeholder:text-muted/60" placeholder="筛选片源..." />
        </div>
      )}

      {/* ─── Source list ─── */}
      {sources.length === 0 ? (
        <EmptyState message="暂无片源，请导入或手动添加" />
      ) : (
        <div className="space-y-2">
          {filteredSources.map((source, idx) => (
            <SourceItem
              key={source.key}
              source={source}
              index={idx}
              total={filteredSources.length}
              onToggle={() => toggle(source.key, !source.enabled)}
              onRemove={() => remove(source.key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Single source item ─────────────────────────────────────

function SourceItem({
  source, index, total,
  onToggle, onRemove,
}: {
  source: LocalVodSource
  index: number
  total: number
  onToggle: () => void
  onRemove: () => void
}) {
  const displayName = getSourceDisplayName(source.key)

  return (
    <div className={`glass-card p-3 transition-all duration-300 ${!source.enabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Toggle switch — KVideo style */}
          <button onClick={onToggle}
            className="relative w-11 h-6.5 flex-shrink-0 cursor-pointer"
            aria-label={`${source.enabled ? '禁用' : '启用'} ${displayName}`}
          >
            <span className={`absolute inset-0 rounded-full transition-all duration-400 ${source.enabled ? 'bg-accent' : 'bg-white/15'}`} />
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-400 ${source.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] text-ink truncate flex items-center gap-2">
              {displayName}
              {source.key !== displayName && (
                <span className="text-[10px] text-muted font-normal">{source.key}</span>
              )}
              {source.r18 && (
                <span className="text-[9px] text-red-400/80 border border-red-400/20 rounded px-1">R18</span>
              )}
            </div>
            <div className="text-[11px] text-muted truncate">{source.apiUrl}</div>
          </div>
        </div>

        {/* Delete */}
        <button onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.04] border border-hair
          text-muted hover:text-red-400 hover:border-red-400/20 transition-all duration-200"
          aria-label="删除">
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
