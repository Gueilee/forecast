'use client'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
  right?: React.ReactNode
  contentStyle?: React.CSSProperties
  contentBg?: string
}

export function SlideBase({ title, subtitle, children, right, contentStyle, contentBg = '#f2f1f8' }: Props) {
  return (
    <div style={{ width: '960px', height: '540px', background: contentBg, position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      {/* Header bar */}
      <div style={{
        background: '#2E2657',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', background: '#F23A5A' }} />
        <div style={{ flex: 1, paddingLeft: '20px', paddingRight: '12px' }}>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
          {subtitle && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9.5px', marginTop: '2px', letterSpacing: '0.05em' }}>
              {subtitle}
            </div>
          )}
        </div>
        {right && (
          <div style={{ paddingRight: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {right}
          </div>
        )}
      </div>

      {/* Content area */}
      <div style={{ height: '482px', overflow: 'hidden', ...contentStyle }}>
        {children}
      </div>
    </div>
  )
}

export function fmt(v: number, unit: 'M' | 'K' | '%' = 'M'): string {
  if (unit === '%') return `${v.toFixed(1)}%`
  if (unit === 'M') return `R$ ${(v / 1_000_000).toFixed(1)}M`
  return `R$ ${(v / 1_000).toFixed(0)}K`
}

export function pct(realizado: number, plan: number): number {
  return plan > 0 ? (realizado / plan) * 100 : 0
}

export function desvioColor(pctVal: number): string {
  if (pctVal >= 100) return '#00C07A'
  if (pctVal >= 80) return '#f59e0b'
  return '#F23A5A'
}
