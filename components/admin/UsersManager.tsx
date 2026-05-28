'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; user: UserRow }
  | { type: 'delete'; user: UserRow }

// ── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'DIRETO',    label: 'Direto' },
  { value: 'CONTABIL',  label: 'Contábil' },
  { value: 'OPERACOES', label: 'Operações' },
  { value: 'ADMIN',     label: 'Admin' },
]

const ROLE_COLOR: Record<string, { bg: string; fg: string }> = {
  ADMIN:     { bg: 'rgba(255,47,105,0.12)', fg: '#ff2f69' },
  DIRETO:    { bg: 'rgba(66,44,118,0.12)',  fg: '#422c76' },
  CONTABIL:  { bg: 'rgba(16,124,65,0.12)',  fg: '#0d6d38' },
  OPERACOES: { bg: 'rgba(234,88,12,0.12)',  fg: '#c2410c' },
}

// ── Small components ─────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLOR[role] ?? { bg: 'rgba(0,0,0,0.08)', fg: '#666' }
  const label = ROLES.find(r => r.value === role)?.label ?? role
  return (
    <span
      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.fg }}
    >
      {label}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: '#422c76' }}
    >
      {initials}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', border: '1px solid rgba(66,44,118,0.12)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(66,44,118,0.08)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: '#414042' }}>{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'rgba(66,44,118,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(66,44,118,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'rgba(65,64,66,0.6)' }}>{label}</label>
      {children}
    </div>
  )
}

function ModalActions({
  onCancel, onConfirm, confirmLabel, confirmDanger = false, pending,
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  confirmDanger?: boolean
  pending: boolean
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onCancel} disabled={pending}
        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
        style={{ border: '1px solid rgba(66,44,118,0.15)', color: 'rgba(65,64,66,0.7)', background: 'transparent' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(66,44,118,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm} disabled={pending}
        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
        style={{ background: confirmDanger ? '#ff2f69' : '#422c76', opacity: pending ? 0.6 : 1 }}
      >
        {pending ? 'Aguarde...' : confirmLabel}
      </button>
    </div>
  )
}

// ── Shared input styles ───────────────────────────────────────────────────────

const inputBase = 'w-full rounded-xl border px-3 py-2.5 text-sm outline-none'
const inputStyle  = { border: '1px solid rgba(66,44,118,0.18)', background: '#fafafa', color: '#414042' }
const inputFocus  = { border: '1px solid rgba(66,44,118,0.4)',  background: '#fff'    }

function TextInput({
  value, onChange, type = 'text', placeholder, rightSlot,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="relative">
      <input
        className={inputBase}
        style={{ ...inputStyle, paddingRight: rightSlot ? '2.75rem' : undefined }}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => Object.assign(e.target.style, { ...inputFocus, paddingRight: rightSlot ? '2.75rem' : undefined })}
        onBlur={e => Object.assign(e.target.style, { ...inputStyle, paddingRight: rightSlot ? '2.75rem' : undefined })}
      />
      {rightSlot && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
      )}
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <TextInput
      value={value} onChange={onChange}
      type={show ? 'text' : 'password'}
      placeholder={placeholder}
      rightSlot={
        <button type="button" onClick={() => setShow(p => !p)} style={{ color: 'rgba(66,44,118,0.35)' }}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative rounded-full transition-colors flex-shrink-0"
      style={{ width: '2.5rem', height: '1.375rem', background: checked ? '#422c76' : 'rgba(107,114,128,0.3)' }}
    >
      <span
        className="absolute rounded-full bg-white shadow transition-transform"
        style={{ width: '1rem', height: '1rem', top: '0.1875rem',
          transform: checked ? 'translateX(1.25rem)' : 'translateX(0.1875rem)' }}
      />
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UsersManager({ initial, currentUserId }: { initial: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>(initial)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Create form state
  const [cName,  setCName]  = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cPass,  setCPass]  = useState('')
  const [cRole,  setCRole]  = useState('DIRETO')

  // Edit form state
  const [eName,   setEName]   = useState('')
  const [eRole,   setERole]   = useState('')
  const [eActive, setEActive] = useState(true)
  const [ePass,   setEPass]   = useState('')

  // ── Modal helpers ──
  function openCreate() {
    setCName(''); setCEmail(''); setCPass(''); setCRole('DIRETO')
    setError(''); setModal({ type: 'create' })
  }

  function openEdit(u: UserRow) {
    setEName(u.name); setERole(u.role); setEActive(u.isActive); setEPass('')
    setError(''); setModal({ type: 'edit', user: u })
  }

  function closeModal() { setModal({ type: 'none' }); setError('') }

  // ── API calls ──
  function handleCreate() {
    if (!cName.trim() || !cEmail.trim() || !cPass || !cRole) {
      setError('Preencha todos os campos'); return
    }
    setError('')
    startTransition(async () => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cName.trim(), email: cEmail.trim().toLowerCase(), password: cPass, role: cRole }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar usuário'); return }
      setUsers(p => [data, ...p])
      closeModal()
    })
  }

  function handleEdit() {
    if (modal.type !== 'edit') return
    if (!eName.trim()) { setError('Nome é obrigatório'); return }
    setError('')
    startTransition(async () => {
      const body: Record<string, unknown> = { name: eName.trim(), role: eRole, isActive: eActive }
      if (ePass) body.password = ePass
      const res = await fetch(`/api/admin/users/${modal.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao atualizar'); return }
      setUsers(p => p.map(u => u.id === data.id ? data : u))
      closeModal()
    })
  }

  function handleDelete() {
    if (modal.type !== 'delete') return
    setError('')
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${modal.user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao excluir'); return }
      setUsers(p => p.filter(u => u.id !== modal.user.id))
      closeModal()
    })
  }

  const activeCount = users.filter(u => u.isActive).length

  return (
    <div className="p-6 max-w-4xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs" style={{ color: 'rgba(65,64,66,0.5)' }}>
          {activeCount} de {users.length} usuário{users.length !== 1 ? 's' : ''} ativo{activeCount !== 1 ? 's' : ''}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85"
          style={{ background: '#422c76' }}
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Perfis legend */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {ROLES.map(r => (
          <div key={r.value} className="flex items-center gap-1.5">
            <RoleBadge role={r.value} />
            <span className="text-[10px]" style={{ color: 'rgba(65,64,66,0.45)' }}>
              {r.value === 'ADMIN' ? '— acesso total' : '— acesso geral'}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(66,44,118,0.1)' }}>
        <table className="w-full bg-white">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(66,44,118,0.08)', background: 'rgba(66,44,118,0.025)' }}>
              {(['Usuário', 'Perfil', 'Status', ''] as const).map((h, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${i === 3 ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(66,44,118,0.4)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(66,44,118,0.06)' : undefined }}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      <p className="text-sm font-medium leading-tight" style={{ color: '#414042' }}>
                        {u.name}
                        {u.id === currentUserId && (
                          <span
                            className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(66,44,118,0.1)', color: '#422c76' }}
                          >
                            você
                          </span>
                        )}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(65,64,66,0.45)' }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                <td className="px-5 py-3.5">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={u.isActive
                      ? { background: 'rgba(16,124,65,0.1)',   color: '#0d6d38' }
                      : { background: 'rgba(107,114,128,0.1)', color: '#6b7280' }}
                  >
                    {u.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(u)} title="Editar"
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                      style={{ color: 'rgba(66,44,118,0.35)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(66,44,118,0.07)'; e.currentTarget.style.color = '#422c76' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(66,44,118,0.35)' }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => { setError(''); setModal({ type: 'delete', user: u }) }}
                        title="Excluir"
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                        style={{ color: 'rgba(255,47,105,0.35)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,47,105,0.07)'; e.currentTarget.style.color = '#ff2f69' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,47,105,0.35)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm" style={{ color: 'rgba(65,64,66,0.35)' }}>
                  Nenhum usuário cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create Modal ── */}
      {modal.type === 'create' && (
        <Modal title="Novo Usuário" onClose={closeModal}>
          <div className="space-y-4">
            <FormField label="Nome completo">
              <TextInput value={cName} onChange={setCName} placeholder="ex: João da Silva" />
            </FormField>
            <FormField label="E-mail">
              <TextInput value={cEmail} onChange={setCEmail} type="email" placeholder="usuario@vendemmia.com.br" />
            </FormField>
            <FormField label="Senha">
              <PasswordInput value={cPass} onChange={setCPass} placeholder="Mínimo 6 caracteres" />
            </FormField>
            <FormField label="Perfil de acesso">
              <select
                className={inputBase} style={inputStyle} value={cRole}
                onChange={e => setCRole(e.target.value)}
                onFocus={e => Object.assign(e.target.style, inputFocus)}
                onBlur={e => Object.assign(e.target.style, inputStyle)}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </FormField>
            {error && <p className="text-xs font-medium" style={{ color: '#ff2f69' }}>{error}</p>}
            <ModalActions
              onCancel={closeModal} onConfirm={handleCreate}
              confirmLabel="Criar Usuário" pending={isPending}
            />
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {modal.type === 'edit' && (
        <Modal title="Editar Usuário" onClose={closeModal}>
          <div className="space-y-4">
            {/* User identity chip */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(66,44,118,0.04)', border: '1px solid rgba(66,44,118,0.08)' }}
            >
              <Avatar name={modal.user.name} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#414042' }}>{modal.user.name}</p>
                <p className="text-[10px]" style={{ color: 'rgba(65,64,66,0.5)' }}>{modal.user.email}</p>
              </div>
            </div>

            <FormField label="Nome completo">
              <TextInput value={eName} onChange={setEName} />
            </FormField>
            <FormField label="Perfil de acesso">
              <select
                className={inputBase} style={inputStyle} value={eRole}
                onChange={e => setERole(e.target.value)}
                onFocus={e => Object.assign(e.target.style, inputFocus)}
                onBlur={e => Object.assign(e.target.style, inputStyle)}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </FormField>
            <FormField label="Nova senha (deixe vazio para manter)">
              <PasswordInput value={ePass} onChange={setEPass} placeholder="Nova senha (opcional)" />
            </FormField>

            {/* Active toggle — hidden for own account */}
            {modal.user.id !== currentUserId && (
              <div
                className="flex items-center justify-between p-3.5 rounded-xl"
                style={{ background: 'rgba(66,44,118,0.03)', border: '1px solid rgba(66,44,118,0.08)' }}
              >
                <div>
                  <p className="text-xs font-medium" style={{ color: '#414042' }}>Conta ativa</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(65,64,66,0.5)' }}>
                    {eActive ? 'Usuário pode acessar o sistema' : 'Acesso ao sistema bloqueado'}
                  </p>
                </div>
                <Toggle checked={eActive} onChange={() => setEActive(p => !p)} />
              </div>
            )}

            {error && <p className="text-xs font-medium" style={{ color: '#ff2f69' }}>{error}</p>}
            <ModalActions
              onCancel={closeModal} onConfirm={handleEdit}
              confirmLabel="Salvar Alterações" pending={isPending}
            />
          </div>
        </Modal>
      )}

      {/* ── Delete Modal ── */}
      {modal.type === 'delete' && (
        <Modal title="Excluir Usuário" onClose={closeModal}>
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,47,105,0.04)', border: '1px solid rgba(255,47,105,0.1)' }}
            >
              <Avatar name={modal.user.name} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#414042' }}>{modal.user.name}</p>
                <p className="text-[10px]" style={{ color: 'rgba(65,64,66,0.5)' }}>{modal.user.email}</p>
              </div>
            </div>
            <p className="text-sm" style={{ color: '#414042' }}>
              Esta ação é irreversível. O usuário perderá o acesso permanentemente ao sistema.
            </p>
            {error && <p className="text-xs font-medium" style={{ color: '#ff2f69' }}>{error}</p>}
            <ModalActions
              onCancel={closeModal} onConfirm={handleDelete}
              confirmLabel="Excluir Usuário" confirmDanger pending={isPending}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
