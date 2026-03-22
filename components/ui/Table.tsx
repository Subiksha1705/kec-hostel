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
}

export default function Table<T>({ columns, data, emptyMessage }: TableProps<T>) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: 'left',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
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
                style={{
                  background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '14px',
                    }}
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
  )
}
