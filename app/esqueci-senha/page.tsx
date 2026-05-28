'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MailCheck } from 'lucide-react'

export default function EsqueciSenhaPage() {
  const router = useRouter()
  const [email,     setEmail]     = useState('')
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!email.trim()) { setError('Informe seu e-mail'); return }
    setError('')
    startTransition(async () => {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao processar solicitação')
        return
      }
      setSent(true)
    })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundImage: 'url(/login.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(20,8,48,0.35)' }} />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: '#ff2f69' }} />

      <div
        className="relative z-10 w-full max-w-sm rounded-3xl p-8 space-y-5"
        style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 32px 80px rgba(45,29,92,0.35)' }}
      >
        {/* Logo */}
        <div className="flex justify-center pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Forecast by Vendemmia" style={{ width: '180px', height: 'auto' }} />
        </div>
        <div style={{ height: '1px', background: 'rgba(66,44,118,0.1)' }} />

        {sent ? (
          /* Success state */
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MailCheck className="w-12 h-12" style={{ color: '#422c76' }} />
            <h2 className="text-base font-bold" style={{ color: '#414042' }}>E-mail enviado!</h2>
            <p className="text-sm" style={{ color: '#9a8fb5', lineHeight: 1.6 }}>
              Se o e-mail <strong style={{ color: '#414042' }}>{email}</strong> estiver cadastrado,
              você receberá as instruções em instantes.
            </p>
            <p className="text-xs" style={{ color: '#9a8fb5' }}>
              Verifique também sua caixa de spam.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: '#422c76' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          </div>
        ) : (
          /* Form */
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#414042' }}>Esqueceu sua senha?</h2>
              <p className="text-xs mt-1" style={{ color: '#9a8fb5', lineHeight: 1.6 }}>
                Informe seu e-mail corporativo e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold block" style={{ color: '#414042' }}>E-mail</label>
              <input
                type="email"
                placeholder="nome@vendemmia.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
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
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full py-2.5 text-sm font-bold rounded-xl text-white transition-all disabled:opacity-60 mt-1"
              style={{
                background: isPending ? 'rgba(66,44,118,0.7)' : 'linear-gradient(135deg, #422c76 0%, #ff2f69 100%)',
                boxShadow: isPending ? 'none' : '0 4px 20px rgba(255,47,105,0.35)',
              }}
            >
              {isPending ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: 'rgba(65,64,66,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#422c76')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(65,64,66,0.5)')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </button>
          </div>
        )}

        <p className="text-center text-[11px]" style={{ color: 'rgba(65,64,66,0.35)' }}>
          © 2026 Vendemmia Comércio Internacional Ltda.
        </p>
      </div>
    </div>
  )
}
