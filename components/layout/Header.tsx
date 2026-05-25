'use client'

import { signOut } from 'next-auth/react'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession } from 'next-auth/react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { data: session } = useSession()
  const initials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
      style={{
        background: '#ffffff',
        borderColor: 'rgba(66,44,118,0.1)',
        boxShadow: '0 1px 12px rgba(66,44,118,0.06)',
      }}
    >
      <div>
        <h1
          className="text-lg font-bold leading-tight"
          style={{ color: '#414042' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: '#9a8fb5' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}

        {/* Notification bell */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
          style={{ color: '#9a8fb5' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f3f0f9')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-colors focus:outline-none group"
            style={{ background: 'rgba(66,44,118,0.06)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(66,44,118,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(66,44,118,0.06)')}
          >
            <div
              className="flex items-center justify-center w-6 h-6 rounded-lg text-white text-[10px] font-bold"
              style={{ background: '#422c76' }}
            >
              {initials}
            </div>
            <span className="text-xs font-semibold hidden sm:block" style={{ color: '#414042' }}>
              {session?.user?.name?.split(' ')[0]}
            </span>
            <ChevronDown className="w-3 h-3 opacity-40" style={{ color: '#414042' }} />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold truncate" style={{ color: '#414042' }}>
                {session?.user?.name}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: '#9a8fb5' }}>
                {session?.user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="cursor-pointer text-xs font-medium gap-2"
              style={{ color: '#ff2f69' }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
