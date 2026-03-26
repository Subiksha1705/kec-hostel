'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { apiJson } from '@/lib/api/client'

type ChatMessage = { role: 'user' | 'model'; parts: { text: string }[] }

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const greetedRef = useRef(false)

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user' as const, parts: [{ text }] }]
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
    setMessages([...newMessages, { role: 'model', parts: [{ text: reply }] }])
    setLoading(false)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (greetedRef.current) return
    const storedName =
      typeof window !== 'undefined' ? window.localStorage.getItem('userName') : null
    const name = storedName && storedName.trim() ? storedName.trim() : 'there'
    const greeting = `Hello ${name}! How can I help you with hostel info today?`
    setMessages([{ role: 'model', parts: [{ text: greeting }] }])
    greetedRef.current = true
  }, [])

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
            {messages.map((msg, i) => {
              const content = msg.parts.map((p) => p.text).join('')
              const isUser = msg.role === 'user'
              return (
              <div
                key={i}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  background: isUser ? 'var(--sage-light)' : 'var(--surface-2)',
                  color: isUser ? 'var(--sage-dark)' : 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  maxWidth: '80%',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                {content}
              </div>
            )})}
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
