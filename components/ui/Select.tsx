'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type SelectOption = {
  value: string
  label: ReactNode
  disabled?: boolean
}

type SelectProps = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

export default function Select({ value, onChange, options, placeholder, disabled }: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const selectedLabel = useMemo(() => {
    const match = options.find((opt) => opt.value === value)
    return match?.label ?? placeholder ?? 'Select'
  }, [options, placeholder, value])

  return (
    <div ref={containerRef} className={`select ${disabled ? 'is-disabled' : ''}`}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`select-value ${value ? '' : 'is-placeholder'}`}>{selectedLabel}</span>
        <span className="select-caret">▾</span>
      </button>
      {open && !disabled && (
        <div className="select-menu" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                className={`select-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  if (opt.disabled) return
                  onChange(opt.value)
                  setOpen(false)
                }}
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
