'use client'

import { useEffect, useState, useTransition, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type TokenState =
  | { status: 'loading' }
  | { status: 'valid'; type: 'INVITE' | 'RESET'; userName: string }
  | { status: 'invalid'; message: string }

function DefinirSenhaForm() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const token         = searchParams.get('token') ?? ''

  const [tokenState, setTokenState] = useState<TokenState>({ status: 'loading' })
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')
  const [isPending,  startTransition] = useTransition()

  // Valida o token ao montar
  useEffect(() => {
    if (!token) {
      setTokenState({ status: 'invalid', message: 'Link inválido. Solicite um novo.' })
      return
    }
    fetch(`/api/auth/set-password?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setTokenState({ status: 'valid', type: data.type, userName: data.userName })
        } else {
          setTokenState({ status: 'invalid', message: 'Este link expirou ou já foi utilizado.' })
        }
      })
      .catch(() => setTokenState({ status: 'invalid', message: 'Erro ao validar o link.' }))
  }, [token])

  function handleSubmit() {
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return }
    if (password !== confirm)  { setError('As senhas não coincidem'); return }
    setError('')
    startTransition(async () => {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao definir senha'); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    })
  }

  const isInvite = tokenState.status === 'valid' && tokenState.type === 'INVITE'

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

        {/* Loading */}
        {tokenState.status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#422c76' }} />
            <p className="text-sm" style={{ color: '#9a8fb5' }}>Validando link...</p>
          </div>
        )}

        {/* Invalid token */}
        {tokenState.status === 'invalid' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <XCircle className="w-12 h-12" style={{ color: '#ff2f69' }} />
            <h2 className="text-base font-bold" style={{ color: '#414042' }}>Link inválido</h2>
            <p className="text-sm" style={{ color: '#9a8fb5' }}>{tokenState.message}</p>
            <button
              onClick={() => router.push('/esqueci-senha')}
              className="mt-2 text-sm font-semibold underline underline-offset-2"
              style={{ color: '#422c76' }}
            >
              Solicitar novo link
            </button>
          </div>
        )}

        {/* Success */}
        {done && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="w-12 h-12" style={{ color: '#0d6d38' }} />
            <h2 className="text-base font-bold" style={{ color: '#414042' }}>Senha definida!</h2>
            <p className="text-sm" style={{ color: '#9a8fb5' }}>
              Redirecionando para o login...
            </p>
          </div>
        )}

        {/* Form */}
        {tokenState.status === 'valid' && !done && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#414042' }}>
                {isInvite ? `Bem-vindo(a), ${tokenState.userName}!` : 'Nova senha'}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#9a8fb5' }}>
                {isInvite
                  ? 'Defina sua senha para ativar o acesso ao sistema.'
                  : 'Escolha uma nova senha segura para sua conta.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold block" style={{ color: '#414042' }}>Nova senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none transition-all pr-10"
                  style={{ background: '#faf9f5', border: '1.5px solid rgba(66,44,118,0.18)', color: '#414042' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#422c76')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(66,44,118,0.18)')}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(66,44,118,0.4)' }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold block" style={{ color: '#414042' }}>Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none transition-all pr-10"
                  style={{ background: '#faf9f5', border: '1.5px solid rgba(66,44,118,0.18)', color: '#414042' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#422c76')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(66,44,118,0.18)')}
                />
                <button type="button" onClick={() => setShowConf(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(66,44,118,0.4)' }}>
                  {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="flex items-center gap-2">
                {[6, 8, 12].map(threshold => (
                  <div
                    key={threshold}
                    className="flex-1 h-1 rounded-full transition-colors"
                    style={{
                      background: password.length >= threshold
                        ? threshold === 6 ? '#e67e22' : threshold === 8 ? '#f1c40f' : '#0d6d38'
                        : 'rgba(66,44,118,0.1)',
                    }}
                  />
                ))}
                <span className="text-[10px]" style={{ color: 'rgba(65,64,66,0.5)' }}>
                  {password.length < 6 ? 'Muito curta' : password.length < 8 ? 'Fraca' : password.length < 12 ? 'Média' : 'Forte'}
                </span>
              </div>
            )}

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
              {isPending ? 'Salvando...' : isInvite ? 'Ativar conta' : 'Redefinir senha'}
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

export default function DefinirSenhaPage() {
  return (
    <Suspense>
      <DefinirSenhaForm />
    </Suspense>
  )
}
