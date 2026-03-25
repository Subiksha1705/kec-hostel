'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { apiJson } from '@/lib/api/client'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user' as const, content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const { data } = await apiJson<{ ok: boolean; data: { reply: string } }>('/api/chatbot', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        history: messages,
      }),
    })

    const reply = data?.data?.reply ?? 'Sorry, something went wrong. Please try again.'
    setMessages([...newMessages, { role: 'assistant', content: reply }])
    setLoading(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'var(--sage)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '24px',
            width: '340px',
            height: '460px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            Hostel Assistant
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Hi! Ask me anything about your hostel — timings, rules, facilities, or procedures.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'var(--sage-light)' : 'var(--surface-2)',
                  color: msg.role === 'user' ? 'var(--sage-dark)' : 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  maxWidth: '80%',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Typing...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                fontSize: '14px',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: 'var(--sage)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
