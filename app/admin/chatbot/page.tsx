'use client'

import { useEffect, useRef, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import { cache, useCachedFetch } from '@/lib/cache'
import {
  Trash2,
  Plus,
  Link,
  FileText,
  Upload,
  RefreshCw,
  X,
  Pencil,
} from 'lucide-react'

type HostelInfo = {
  chatbotContext?: string | null
}

type KnowledgeSource = {
  id: string
  type: 'TEXT' | 'FILE' | 'URL'
  label: string
  fileName?: string | null
  sourceUrl?: string | null
  createdAt: string
  contentExcerpt?: string
}

type SourceDetail = {
  id: string
  type: 'TEXT' | 'FILE' | 'URL'
  label: string
  content: string
  sourceUrl?: string | null
  fileName?: string | null
}

export default function AdminChatbotContextPage() {
  const { data: hostelInfo, loading: loadingHostel } =
    useCachedFetch<HostelInfo>('/api/hostel-info')
  const [chatbotContext, setChatbotContext] = useState('')
  const [savingContext, setSavingContext] = useState(false)
  const [contextSaved, setContextSaved] = useState(false)

  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)

  const [textLabel, setTextLabel] = useState('')
  const [textContent, setTextContent] = useState('')
  const [addingText, setAddingText] = useState(false)

  const [urlValue, setUrlValue] = useState('')
  const [urlLabel, setUrlLabel] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)

  const [fileLabel, setFileLabel] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [editingSource, setEditingSource] = useState<SourceDetail | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [addTab, setAddTab] = useState<'text' | 'url' | 'file'>('text')

  const [editLabel, setEditLabel] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editUrl, setEditUrl] = useState('')

  useEffect(() => {
    if (!hostelInfo) return
    setChatbotContext(hostelInfo.chatbotContext ?? '')
  }, [hostelInfo])

  useEffect(() => {
    if (!editingSource) return
    setEditLabel(editingSource.label ?? '')
    setEditContent(editingSource.content ?? '')
    setEditUrl(editingSource.sourceUrl ?? '')
  }, [editingSource])

  const fetchSources = async () => {
    setLoadingSources(true)
    const { data } = await apiJson<{ ok: boolean; data: { sources: KnowledgeSource[] } }>(
      '/api/chatbot/knowledge'
    )
    setSources(data?.data?.sources ?? [])
    setLoadingSources(false)
  }

  useEffect(() => {
    fetchSources()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveContext = async () => {
    setSavingContext(true)
    setContextSaved(false)
    const { res } = await apiJson('/api/hostel-info', {
      method: 'PUT',
      body: JSON.stringify({ chatbotContext: chatbotContext.trim() }),
    })
    setSavingContext(false)
    if (res.ok) {
      setContextSaved(true)
      cache.invalidate('/api/hostel-info')
      setTimeout(() => setContextSaved(false), 1500)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  const openAddModal = () => {
    setModalMode('add')
    setEditingSource(null)
    setAddTab('text')
    setModalOpen(true)
  }

  const openEditModal = async (id: string) => {
    setModalMode('edit')
    setModalOpen(true)
    setLoadingEdit(true)
    const { data, res } = await apiJson<{ ok: boolean; data?: { source: SourceDetail } }>(
      `/api/chatbot/knowledge/${id}`
    )
    if (res.ok && data?.data?.source) {
      setEditingSource(data.data.source)
    } else {
      showError('Failed to load context for editing.')
      setModalOpen(false)
    }
    setLoadingEdit(false)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalMode(null)
    setEditingSource(null)
  }

  const addText = async () => {
    if (!textLabel.trim() || !textContent.trim()) return
    setAddingText(true)
    const { res } = await apiJson('/api/chatbot/knowledge/text', {
      method: 'POST',
      body: JSON.stringify({ label: textLabel.trim(), content: textContent.trim() }),
    })
    setAddingText(false)
    if (res.ok) {
      setTextLabel('')
      setTextContent('')
      showSuccess('Text snippet added.')
      fetchSources()
    } else {
      showError('Failed to add text snippet.')
    }
  }

  const addUrl = async () => {
    if (!urlValue.trim()) return
    setAddingUrl(true)
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
      '/api/chatbot/knowledge/url',
      {
        method: 'POST',
        body: JSON.stringify({
          url: urlValue.trim(),
          label: urlLabel.trim() || undefined,
        }),
      }
    )
    setAddingUrl(false)
    if (res.ok) {
      setUrlValue('')
      setUrlLabel('')
      showSuccess('URL scraped and added.')
      fetchSources()
    } else {
      showError((data as any)?.error ?? 'Failed to scrape URL.')
    }
  }

  const uploadFile = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)
    if (fileLabel.trim()) formData.append('label', fileLabel.trim())

    const res = await fetch('/api/chatbot/knowledge/file', {
      method: 'POST',
      body: formData,
    })
    setUploadingFile(false)

    if (res.ok) {
      setFileLabel('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      showSuccess('File uploaded and parsed.')
      fetchSources()
    } else {
      const data = await res.json().catch(() => ({}))
      showError(data?.error ?? 'Failed to upload file.')
    }
  }

  const updateSource = async () => {
    if (!editingSource) return

    const payload: Record<string, string> = {}
    if (editLabel.trim()) payload.label = editLabel.trim()

    if (editingSource.type === 'TEXT') {
      if (!editContent.trim()) {
        showError('Content cannot be empty.')
        return
      }
      payload.content = editContent.trim()
    }

    if (editingSource.type === 'URL') {
      if (editUrl.trim()) payload.sourceUrl = editUrl.trim()
      if (editContent.trim()) payload.content = editContent.trim()
    }

    if (editingSource.type === 'FILE' && !editLabel.trim()) {
      showError('Label is required for file updates.')
      return
    }

    const { res } = await apiJson(`/api/chatbot/knowledge/${editingSource.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      showSuccess('Context updated.')
      closeModal()
      fetchSources()
    } else {
      showError('Failed to update context.')
    }
  }

  const deleteSource = async (id: string) => {
    if (!confirm('Delete this knowledge source?')) return
    const { res } = await apiJson(`/api/chatbot/knowledge/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSources((s) => s.filter((x) => x.id !== id))
      showSuccess('Deleted.')
    } else {
      showError('Failed to delete.')
    }
  }

  const typeIcon = (type: string) => {
    if (type === 'URL') return <Link size={14} />
    if (type === 'FILE') return <FileText size={14} />
    return <Plus size={14} />
  }

  if (loadingHostel) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading chatbot context...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Chatbot Context
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchSources}
            disabled={loadingSources}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            style={{
              background: 'var(--sage)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: '8px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            Add Context
          </button>
        </div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Base Context (manual notes)
        </label>
        <textarea
          rows={8}
          value={chatbotContext}
          onChange={(event) => setChatbotContext(event.target.value)}
          placeholder="Write hostel rules, FAQs, timings, and other info."
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            resize: 'vertical',
          }}
        />
        {contextSaved ? (
          <div
            style={{
              background: 'var(--mint)',
              color: '#1a5c3a',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
            }}
          >
            Chatbot context updated.
          </div>
        ) : null}
        <button
          onClick={saveContext}
          disabled={savingContext}
          style={{
            alignSelf: 'flex-start',
            background: 'var(--sage)',
            color: 'white',
            border: 'none',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {savingContext ? 'Saving...' : 'Save Context'}
        </button>
      </section>

      {error && (
        <div
          style={{
            background: 'var(--rose)',
            color: '#7a2020',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: 'var(--mint)',
            color: '#1a5c3a',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            fontSize: '14px',
          }}
        >
          {success}
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
          Knowledge Sources ({sources.length})
        </h2>

        {loadingSources && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>
        )}

        {!loadingSources && sources.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No knowledge sources yet. Add text, URLs, or files above to get started.
          </p>
        )}

        {sources.map((source) => (
          <div
            key={source.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'var(--sage-light)',
                    color: 'var(--sage-dark)',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  {typeIcon(source.type)}
                  {source.type}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {source.label}
                  </div>
                  {source.sourceUrl && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {source.sourceUrl}
                    </div>
                  )}
                  {source.fileName && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {source.fileName}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => openEditModal(source.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => deleteSource(source.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#b91c1c',
                    padding: '6px',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {source.contentExcerpt && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {source.contentExcerpt}
              </div>
            )}
          </div>
        ))}
      </section>

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 'min(980px, 92vw)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: 'var(--surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>
                {modalMode === 'add' ? 'Add Context' : 'Edit Context'}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {modalMode === 'add' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)' }}>
                  {[
                    { key: 'text', label: 'Text' },
                    { key: 'url', label: 'Website URL' },
                    { key: 'file', label: 'File Upload' },
                  ].map((tab) => {
                    const active = addTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setAddTab(tab.key as 'text' | 'url' | 'file')}
                        style={{
                          padding: '10px 16px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontWeight: active ? 700 : 500,
                          color: active ? 'var(--sage-dark)' : 'var(--text-secondary)',
                          borderBottom: active ? '2px solid var(--sage)' : '2px solid transparent',
                          marginBottom: '-1px',
                          fontSize: '14px',
                        }}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {addTab === 'text' && (
                  <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                      Add Text Snippet
                    </h3>
                    <input
                      placeholder="Label (e.g. 'Hostel Rules')"
                      value={textLabel}
                      onChange={(e) => setTextLabel(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                      }}
                    />
                    <textarea
                      placeholder="Paste your text content here..."
                      rows={10}
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={addText}
                      disabled={addingText || !textLabel.trim() || !textContent.trim()}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'var(--sage)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={16} />
                      {addingText ? 'Adding...' : 'Add Snippet'}
                    </button>
                  </section>
                )}

                {addTab === 'url' && (
                  <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Add Website URL</h3>
                    <input
                      placeholder="https://example.com/hostel-info"
                      value={urlValue}
                      onChange={(e) => setUrlValue(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                      }}
                    />
                    <input
                      placeholder="Label (optional — defaults to URL)"
                      value={urlLabel}
                      onChange={(e) => setUrlLabel(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                      }}
                    />
                    <button
                      onClick={addUrl}
                      disabled={addingUrl || !urlValue.trim()}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'var(--sage)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Link size={16} />
                      {addingUrl ? 'Scraping...' : 'Scrape & Add'}
                    </button>
                  </section>
                )}

                {addTab === 'file' && (
                  <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Upload File</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Supported: PDF, DOCX, TXT, CSV, XLSX, JSON, MD. Max 10 MB.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.csv,.xlsx,.xls,.json,.md"
                      style={{ fontSize: '14px' }}
                    />
                    <input
                      placeholder="Label (optional — defaults to filename)"
                      value={fileLabel}
                      onChange={(e) => setFileLabel(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                      }}
                    />
                    <button
                      onClick={uploadFile}
                      disabled={uploadingFile}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'var(--sage)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Upload size={16} />
                      {uploadingFile ? 'Uploading...' : 'Upload & Parse'}
                    </button>
                  </section>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    paddingTop: '8px',
                  }}
                >
                  <button
                    onClick={closeModal}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={closeModal}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--sage-dark)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--sage)'
                    }}
                    style={{
                      background: 'var(--sage)',
                      border: '1px solid var(--sage)',
                      borderRadius: 'var(--radius)',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: 'white',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {modalMode === 'edit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loadingEdit && (
                  <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                )}
                {!loadingEdit && editingSource && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Label</label>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          background: 'var(--surface-2)',
                        }}
                      />
                    </div>

                    {editingSource.type === 'URL' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>URL</label>
                        <input
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface-2)',
                          }}
                        />
                      </div>
                    )}

                    {editingSource.type !== 'FILE' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Content</label>
                        <textarea
                          rows={10}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            background: 'var(--surface-2)',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                    )}

                    {editingSource.type === 'FILE' && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          background: 'var(--surface-2)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                        }}
                      >
                        File: {editingSource.fileName ?? 'Uploaded file'}
                      </div>
                    )}

                    <button
                      onClick={updateSource}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'var(--sage)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Pencil size={16} />
                      Update Context
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
