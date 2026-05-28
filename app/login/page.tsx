'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Se chegar com ?token= (link de convite/reset antigo), redireciona para a tela correta
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) router.replace(`/definir-senha?token=${token}`)
  }, [searchParams, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', { email, password, redirect: false })

    if (res?.error) {
      setError('Email ou senha inválidos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{
        backgroundImage: 'url(/login.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay suave */}
      <div className="absolute inset-0" style={{ background: 'rgba(20, 8, 48, 0.35)' }} />

      {/* Glow decorativo */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: '#ff2f69' }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: '#01E18E' }} />

      {/* Card único com logo + formulário */}
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl p-8 space-y-5"
        style={{
          background: 'rgba(255,255,255,0.97)',
          boxShadow: '0 32px 80px rgba(45,29,92,0.35)',
        }}
      >
        {/* Logo dentro do card */}
        <div className="flex justify-center pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_v2.png"
            alt="Forecast by Vendemmia"
            style={{ width: '200px', height: 'auto', display: 'block' }}
          />
        </div>

        {/* Divisor */}
        <div style={{ height: '1px', background: 'rgba(66,44,118,0.1)' }} />

        {/* Título */}
        <div className="space-y-1">
          <h2 className="text-base font-bold" style={{ color: '#414042' }}>
            Acesso ao Sistema
          </h2>
          <p className="text-xs" style={{ color: '#9a8fb5' }}>
            Entre com suas credenciais corporativas
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold block" style={{ color: '#414042' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="nome@vendemmia.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none transition-all"
              style={{ background: '#faf9f5', border: '1.5px solid rgba(66,44,118,0.18)', color: '#414042' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#422c76')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(66,44,118,0.18)')}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold block" style={{ color: '#414042' }}>
              Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none transition-all"
              style={{ background: '#faf9f5', border: '1.5px solid rgba(66,44,118,0.18)', color: '#414042' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#422c76')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(66,44,118,0.18)')}
            />
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
              style={{ background: 'rgba(255,47,105,0.08)', border: '1px solid rgba(255,47,105,0.25)', color: '#ff2f69' }}
            >
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-bold rounded-xl text-white transition-all disabled:opacity-60 mt-1 cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: loading ? 'rgba(66,44,118,0.7)' : 'linear-gradient(135deg, #422c76 0%, #ff2f69 100%)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(255,47,105,0.35)',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>

          <div className="flex justify-center pt-1">
            <a
              href="/esqueci-senha"
              className="text-xs font-medium transition-colors"
              style={{ color: 'rgba(65,64,66,0.45)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#422c76')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(65,64,66,0.45)')}
            >
              Esqueceu sua senha?
            </a>
          </div>
        </form>

        <p className="text-center text-[11px]" style={{ color: 'rgba(65,64,66,0.35)' }}>
          © 2026 Vendemmia Comércio Internacional Ltda.
        </p>
      </div>
    </div>
  )
}

import { Suspense } from 'react'
export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
