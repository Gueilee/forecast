import nodemailer from 'nodemailer'

const BASE_URL  = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const MAILER_DSN = process.env.MAILER_DSN || '';
const MAILER_FROM = process.env.MAILER_FROM || '';

let smtpHost = '';
let smtpPort = 587;
let smtpUser = '';
let smtpPass = '';
let smtpSecure = false;

if (MAILER_DSN) {
  try {
    const parsed = new URL(MAILER_DSN);
    const searchParams = parsed.searchParams;

    const userParam = searchParams.get('username');
    const passParam = searchParams.get('password');
    const encryptionParam = searchParams.get('encryption');

    smtpUser = userParam || decodeURIComponent(parsed.username || '');
    smtpPass = passParam || decodeURIComponent(parsed.password || '');
    smtpHost = parsed.hostname || '';

    if (parsed.port) {
      smtpPort = parseInt(parsed.port, 10);
    } else {
      smtpPort = parsed.protocol === 'smtps:' ? 465 : 587;
    }

    const encryption = (
      encryptionParam ||
      (parsed.protocol === 'smtps:' || smtpPort === 465 ? 'ssl' : 'tls')
    ).toLowerCase();
    smtpSecure = encryption === 'ssl';
  } catch (e) {
    console.error('Erro ao parsear MAILER_DSN:', e);
  }
}

// Fallback para variáveis individuais se MAILER_DSN não estiver definido ou não tiver host
if (!smtpHost) {
  smtpHost = process.env.EMAIL_HOST || '';
  smtpPort = parseInt(process.env.EMAIL_PORT || '587', 10);
  smtpUser = process.env.EMAIL_USER || '';
  smtpPass = process.env.EMAIL_PASS || '';
  smtpSecure = process.env.EMAIL_SECURE === 'true' || smtpPort === 465;
}

const FROM = MAILER_FROM || process.env.EMAIL_FROM || (smtpUser ? `Forecast Vendemmia <${smtpUser}>` : 'Forecast Vendemmia <noreply@vendemmia.com.br>');
const DEV_MODE = !smtpHost;

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
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0edf8;font-family:Inter,Arial,sans-serif">
  <div style="max-width:520px;margin:40px auto;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(66,44,118,0.18)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#422c76 0%,#ff2f69 100%);padding:28px 40px 24px">
      <p style="margin:0;color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.3px">FORECAST</p>
      <p style="margin:2px 0 0;color:rgba(255,255,255,0.65);font-size:11px;font-weight:500;letter-spacing:1px;text-transform:uppercase">by Vendemmia</p>
    </div>
    <!-- Body -->
    <div style="background:#fff;padding:36px 40px">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#faf9f5;padding:16px 40px;border-top:1px solid rgba(66,44,118,0.08)">
      <p style="margin:0;text-align:center;font-size:11px;color:#9ca3af">
        © 2026 Vendemmia Comércio Internacional · Mensagem automática, não responda este e-mail
      </p>
    </div>
  </div>
</body>
</html>`
}

function btn(label: string, link: string) {
  return `<a href="${link}" style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#422c76,#ff2f69);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.1px">${label}</a>`
}

function inviteHtml(name: string, link: string) {
  return wrapper(`
    <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#414042">Bem-vindo(a), ${name}!</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.65">
      Sua conta no <strong style="color:#414042">Forecast Vendemmia</strong> foi criada com sucesso.
      Para ativar seu acesso, clique no botão abaixo e defina sua senha pessoal.
    </p>
    <div style="margin:28px 0">
      ${btn('Definir minha senha', link)}
    </div>
    <div style="padding:14px 16px;background:#faf9f5;border-radius:10px;border:1px solid rgba(66,44,118,0.1)">
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
        ⏱ Este link é válido por <strong>7 dias</strong>.<br>
        Se você não esperava este convite, pode ignorar este e-mail com segurança.
      </p>
    </div>
  `)
}

function resetHtml(name: string, link: string) {
  return wrapper(`
    <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#414042">Redefinição de senha</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.65">
      Olá, <strong style="color:#414042">${name}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta no Forecast Vendemmia.
    </p>
    <div style="margin:28px 0">
      ${btn('Redefinir minha senha', link)}
    </div>
    <div style="padding:14px 16px;background:#faf9f5;border-radius:10px;border:1px solid rgba(66,44,118,0.1)">
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
        ⏱ Este link expira em <strong>1 hora</strong>.<br>
        Se você não solicitou a redefinição, ignore este e-mail — sua senha não foi alterada.
      </p>
    </div>
  `)
}
