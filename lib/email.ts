import nodemailer from 'nodemailer'

const BASE_URL = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const MAILER_DSN  = process.env.MAILER_DSN  || ''
const MAILER_FROM = process.env.MAILER_FROM || ''

let smtpHost   = ''
let smtpPort   = 587
let smtpUser   = ''
let smtpPass   = ''
let smtpSecure = false

if (MAILER_DSN) {
  try {
    const parsed         = new URL(MAILER_DSN)
    const userParam      = parsed.searchParams.get('username')
    const passParam      = parsed.searchParams.get('password')
    const encryptionParam = parsed.searchParams.get('encryption')

    smtpUser = userParam || decodeURIComponent(parsed.username || '')
    smtpPass = passParam || decodeURIComponent(parsed.password || '')
    smtpHost = parsed.hostname || ''
    smtpPort = parsed.port
      ? parseInt(parsed.port, 10)
      : parsed.protocol === 'smtps:' ? 465 : 587

    const encryption = (encryptionParam || (smtpPort === 465 ? 'ssl' : 'tls')).toLowerCase()
    smtpSecure = encryption === 'ssl'
  } catch (e) {
    console.error('[email] Erro ao parsear MAILER_DSN:', e)
  }
}

if (!smtpHost) {
  smtpHost   = process.env.EMAIL_HOST  || ''
  smtpPort   = parseInt(process.env.EMAIL_PORT  || '587', 10)
  smtpUser   = process.env.EMAIL_USER  || ''
  smtpPass   = process.env.EMAIL_PASS  || ''
  smtpSecure = process.env.EMAIL_SECURE === 'true' || smtpPort === 465
}

const FROM     = MAILER_FROM || process.env.EMAIL_FROM || `Forecast Vendemmia <naoresponda@vendemmia.com.br>`
const DEV_MODE = !smtpHost

function makeTransport() {
  if (DEV_MODE) return null
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser ? {
      user: smtpUser,
      pass: smtpPass,
    } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  })
}

async function sendMail(to: string, subject: string, html: string) {
  const transport = makeTransport()
  if (!transport) {
    console.log(`\n📧 [DEV] E-mail para ${to}\n   Assunto: ${subject}\n`)
    return
  }
  await transport.sendMail({ from: FROM, to, subject, html })
}


// ── Public API ──────────────────────────────────────────────────────────────

export async function sendInviteEmail(to: string, name: string, token: string) {
  const link = `${BASE_URL}/definir-senha?token=${token}`
  await sendMail(to, 'Bem-vindo ao Forecast Vendemmia — Defina sua senha', inviteHtml(name, link))
}

export async function sendResetEmail(to: string, name: string, token: string) {
  const link = `${BASE_URL}/definir-senha?token=${token}`
  await sendMail(to, 'Redefinição de senha — Forecast Vendemmia', resetHtml(name, link))
}

// ── HTML Templates ──────────────────────────────────────────────────────────

function wrapper(content: string) {
  const logo = `${BASE_URL}/logo_v2.png`
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Forecast Vendemmia</title>
</head>
<body style="margin:0;padding:0;background:#f0edf8;font-family:Inter,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto">

    <!-- Header com logo -->
    <div style="background:linear-gradient(135deg,#422c76 0%,#6b21a8 50%,#ff2f69 100%);border-radius:20px 20px 0 0;padding:32px 40px 28px;text-align:center">
      <img src="${logo}" alt="Forecast by Vendemmia" width="180" style="display:inline-block;height:auto;max-width:180px" />
    </div>

    <!-- Linha divisória decorativa -->
    <div style="height:4px;background:linear-gradient(90deg,#422c76,#ff2f69)"></div>

    <!-- Corpo -->
    <div style="background:#ffffff;padding:40px 44px;border-left:1px solid rgba(66,44,118,0.1);border-right:1px solid rgba(66,44,118,0.1)">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#f5f3fa;border-radius:0 0 20px 20px;padding:20px 40px;border:1px solid rgba(66,44,118,0.1);border-top:none;text-align:center">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
        © 2026 Vendemmia Comércio Internacional &nbsp;·&nbsp; Mensagem automática, não responda este e-mail
      </p>
    </div>

  </div>
</body>
</html>`
}

function btn(label: string, link: string) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#422c76,#ff2f69);box-shadow:0 6px 24px rgba(255,47,105,0.35)">
          <a href="${link}"
             style="display:inline-block;padding:15px 36px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px;border-radius:12px;mso-padding-alt:0">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

function inviteHtml(name: string, link: string) {
  return wrapper(`
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#422c76;letter-spacing:-0.3px">
      Bem-vindo(a), ${name}!
    </h2>
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#ff2f69;text-transform:uppercase;letter-spacing:0.8px">
      Convite de acesso
    </p>

    <div style="height:1px;background:linear-gradient(90deg,rgba(66,44,118,0.15),transparent);margin:18px 0"></div>

    <p style="margin:0 0 12px;font-size:15px;color:#4b5563;line-height:1.7">
      Sua conta no <strong style="color:#414042">Forecast Vendemmia</strong> foi criada com sucesso.
      Clique no botão abaixo para definir sua senha e ativar o acesso ao sistema.
    </p>

    <div style="margin:32px 0">
      ${btn('Definir minha senha', link)}
    </div>

    <div style="padding:16px 18px;background:#f8f6ff;border-radius:12px;border-left:4px solid #422c76">
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.7">
        <strong style="color:#422c76">⏱ Este link é válido por 7 dias.</strong><br>
        Se você não esperava este convite, pode ignorar este e-mail com segurança — nenhuma ação é necessária.
      </p>
    </div>
  `)
}

function resetHtml(name: string, link: string) {
  return wrapper(`
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#422c76;letter-spacing:-0.3px">
      Redefinição de senha
    </h2>
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#ff2f69;text-transform:uppercase;letter-spacing:0.8px">
      Solicitação de acesso
    </p>

    <div style="height:1px;background:linear-gradient(90deg,rgba(66,44,118,0.15),transparent);margin:18px 0"></div>

    <p style="margin:0 0 12px;font-size:15px;color:#4b5563;line-height:1.7">
      Olá, <strong style="color:#414042">${name}</strong>. Recebemos uma solicitação para redefinir a senha
      da sua conta no <strong style="color:#414042">Forecast Vendemmia</strong>.
      Clique no botão abaixo para criar uma nova senha.
    </p>

    <div style="margin:32px 0">
      ${btn('Redefinir minha senha', link)}
    </div>

    <div style="padding:16px 18px;background:#f8f6ff;border-radius:12px;border-left:4px solid #422c76">
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.7">
        <strong style="color:#422c76">⏱ Este link expira em 1 hora.</strong><br>
        Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece inalterada.
      </p>
    </div>
  `)
}
