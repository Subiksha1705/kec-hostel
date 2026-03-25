import React from 'react'

type Column<T> = {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

type TableProps<T> = {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  loading?: boolean
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div
            style={{
              height: '14px',
              borderRadius: '6px',
              background: 'var(--border)',
              width: i === 0 ? '60%' : '80%',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        </td>
      ))}
    </tr>
  )
}

export default function Table<T>({ columns, data, emptyMessage, loading }: TableProps<T>) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary)',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center' }}>
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {emptyMessage ?? 'Nothing here yet.'}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  style={{ background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '14px' }}
                    >
                      {column.render ? column.render(item) : (item as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
