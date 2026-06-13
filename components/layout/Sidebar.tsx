'use client'

import { useState, useEffect } from 'react'
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
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
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

const ALL_ROLES = ['DIRETO', 'CONTABIL', 'OPERACOES', 'ADMIN']

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Visão Geral',
    items: [
      { href: '/dashboard',                icon: LayoutDashboard, label: 'Dashboard',         roles: ALL_ROLES },
      { href: '/forecast',                 icon: Table2,          label: 'Forecast Matrix',   roles: ALL_ROLES },
      { href: '/forecast/faturado-manual', icon: PencilLine,      label: 'Lançamento Manual', roles: ALL_ROLES },
    ],
  },
  {
    title: 'Apresentações',
    items: [
      { href: '/apresentacao', icon: MonitorPlay, label: 'Apresentação',     roles: ALL_ROLES },
      { href: '/tv',           icon: Tv,          label: 'TV Controladoria', roles: ALL_ROLES },
    ],
  },
  {
    title: 'Administração',
    items: [
      { href: '/admin/plan',  icon: Settings,  label: 'Gestão do Plano', roles: ALL_ROLES },
      { href: '/admin/sync',  icon: RefreshCw, label: 'Sincronização',   roles: ALL_ROLES },
      { href: '/admin/users', icon: Users,     label: 'Usuários',        roles: ['ADMIN'] },
    ],
  },
]

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center rounded-xl text-sm font-medium transition-all group relative',
        collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
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
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
          style={{ background: '#ff2f69' }}
        />
      )}
      {active && collapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: '#ff2f69' }}
        />
      )}
      <Icon
        className={cn(
          'flex-shrink-0 transition-transform',
          active ? 'scale-110' : 'group-hover:scale-105',
          collapsed ? 'w-4.5 h-4.5' : 'w-4 h-4',
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {active && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
        </>
      )}
    </Link>
  )
}

export function Sidebar() {
  const pathname   = usePathname()
  const { data: session } = useSession()
  const userRole   = session?.user?.role ?? 'DIRETO'

  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  const toggle = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  const initials = session?.user?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  // Avoid layout flash before localStorage is read
  if (!mounted) return (
    <aside
      className="flex flex-col min-h-screen w-64"
      style={{
        background: '#faf9f5',
        boxShadow: '4px 0 24px rgba(66,44,118,0.1)',
        borderRight: '1px solid rgba(66,44,118,0.08)',
      }}
    />
  )

  return (
    <aside
      className="flex flex-col min-h-screen flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '256px',
        transition: 'width 200ms ease',
        background: '#faf9f5',
        boxShadow: '4px 0 24px rgba(66,44,118,0.1)',
        borderRight: '1px solid rgba(66,44,118,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Logo + toggle */}
      <div
        className="flex items-center flex-shrink-0 px-3 py-5 relative"
        style={{ borderBottom: '1px solid rgba(66,44,118,0.08)', minHeight: '72px' }}
      >
        <div className="flex-1 flex justify-center">
          {collapsed ? (
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-black select-none"
              style={{ background: '#422c76', letterSpacing: '-0.5px' }}
            >
              FC
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/logo_v2.png"
              alt="Forecast by Vendemmia"
              style={{ width: '140px', height: 'auto', display: 'block' }}
            />
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-lg transition-all"
          style={{ color: 'rgba(66,44,118,0.3)' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(66,44,118,0.08)'
            e.currentTarget.style.color = '#422c76'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(66,44,118,0.3)'
          }}
        >
          {collapsed
            ? <PanelLeftOpen  className="w-3.5 h-3.5" />
            : <PanelLeftClose className="w-3.5 h-3.5" />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden">
        {NAV_SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(item => item.roles.includes(userRole))
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title} className={si > 0 ? 'mt-5' : ''}>
              {/* Section label / divider */}
              {collapsed ? (
                <div
                  className="mx-2 mb-2 h-px"
                  style={{ background: 'rgba(66,44,118,0.12)' }}
                />
              ) : (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0 whitespace-nowrap"
                    style={{ color: 'rgba(66,44,118,0.35)' }}
                  >
                    {section.title}
                  </p>
                  <div className="flex-1 h-px" style={{ background: 'rgba(66,44,118,0.1)' }} />
                </div>
              )}

              <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center')}>
                {visibleItems.map(item => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <NavLink key={item.href} item={item} active={active} collapsed={collapsed} />
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User info */}
      <div
        className="px-2 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(66,44,118,0.08)' }}
      >
        {collapsed ? (
          <div
            title={`${session?.user?.name ?? ''} · ${userRole}`}
            className="flex items-center justify-center w-10 h-10 rounded-full text-white text-xs font-bold mx-auto cursor-default"
            style={{ background: '#422c76' }}
          >
            {initials}
          </div>
        ) : (
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
        )}
      </div>
    </aside>
  )
}
