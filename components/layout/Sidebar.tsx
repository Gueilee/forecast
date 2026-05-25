'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Table2,
  Users,
  RefreshCw,
  Settings,
  ChevronRight,
  MonitorPlay,
  Tv,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
  roles: string[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Visão Geral',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       roles: ['VIEWER', 'EDITOR', 'ADMIN'] },
      { href: '/forecast',  icon: Table2,          label: 'Forecast Matrix', roles: ['VIEWER', 'EDITOR', 'ADMIN'] },
    ],
  },
  {
    title: 'Apresentações',
    items: [
      { href: '/apresentacao', icon: MonitorPlay, label: 'Apresentação',      roles: ['VIEWER', 'EDITOR', 'ADMIN'] },
      { href: '/tv',           icon: Tv,          label: 'TV Controladoria',  roles: ['VIEWER', 'EDITOR', 'ADMIN'] },
    ],
  },
  {
    title: 'Administração',
    items: [
      { href: '/admin/plan',  icon: Settings,  label: 'Gestão do Plano', roles: ['EDITOR', 'ADMIN'] },
      { href: '/admin/sync',  icon: RefreshCw, label: 'Sincronização',   roles: ['ADMIN'] },
      { href: '/admin/users', icon: Users,     label: 'Usuários',        roles: ['ADMIN'] },
    ],
  },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
      )}
      style={{
        background: active ? 'rgba(66,44,118,0.08)' : 'transparent',
        color: active ? '#422c76' : 'rgba(65,64,66,0.55)',
        boxShadow: active ? '0 1px 6px rgba(66,44,118,0.08)' : 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(66,44,118,0.05)'
          e.currentTarget.style.color = '#414042'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(65,64,66,0.55)'
        }
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
          style={{ background: '#ff2f69' }}
        />
      )}
      <Icon className={cn('w-4 h-4 flex-shrink-0 transition-transform', active ? 'scale-110' : 'group-hover:scale-105')} />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role ?? 'VIEWER'

  const initials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <aside
      className="flex flex-col w-64 min-h-screen"
      style={{
        background: '#faf9f5',
        boxShadow: '4px 0 24px rgba(66,44,118,0.1)',
        borderRight: '1px solid rgba(66,44,118,0.08)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center px-6 py-5"
        style={{ borderBottom: '1px solid rgba(66,44,118,0.08)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo_v2.png"
          alt="Forecast by Vendemmia"
          style={{ width: '160px', height: 'auto', display: 'block' }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(item => item.roles.includes(userRole))
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title} className={si > 0 ? 'mt-5' : ''}>
              {/* Section label */}
              <div className="flex items-center gap-2 px-3 mb-2">
                <p
                  className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
                  style={{ color: 'rgba(66,44,118,0.35)' }}
                >
                  {section.title}
                </p>
                <div
                  className="flex-1 h-px"
                  style={{ background: 'rgba(66,44,118,0.1)' }}
                />
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return <NavLink key={item.href} item={item} active={active} />
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(66,44,118,0.08)' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(66,44,118,0.06)' }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold flex-shrink-0"
            style={{ background: '#422c76' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#414042' }}>
              {session?.user?.name ?? '—'}
            </p>
            <p className="text-[10px] truncate" style={{ color: '#9a8fb5' }}>
              {session?.user?.email ?? ''}
            </p>
          </div>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,47,105,0.12)', color: '#ff2f69' }}
          >
            {userRole}
          </span>
        </div>
      </div>
    </aside>
  )
}
