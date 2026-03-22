type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ASSIGNED'

const styles: Record<Status, { background: string; color: string }> = {
  PENDING: { background: 'var(--blush)', color: '#7a3020' },
  APPROVED: { background: 'var(--mint)', color: '#1a5c3a' },
  REJECTED: { background: 'var(--rose)', color: '#7a2020' },
  ASSIGNED: { background: 'var(--sky)', color: '#1a3c5c' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const style = styles[status]
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '999px',
        background: style.background,
        color: style.color,
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        textTransform: 'capitalize',
      }}
    >
      {status.toLowerCase()}
    </span>
  )
}
