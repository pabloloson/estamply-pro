import { Resend } from 'resend'

let _resend: Resend | null = null
function resend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const FROM = 'Estamply <no-reply@estamply.app>'
const LOGO = 'https://estamply-cdn.b-cdn.net/logos/estamply-logo.png'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'

// ── Templates ──

function layout(content: string, locale: string = 'es') {
  const unsub = locale === 'pt' ? 'Cancelar inscrição' : 'Cancelar suscripción'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="padding:24px 32px 16px;text-align:center;border-bottom:1px solid #f0f0f0">
<img src="${LOGO}" alt="Estamply" width="120" style="max-width:120px" />
</td></tr>
<tr><td style="padding:32px">${content}</td></tr>
<tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #f0f0f0">
<p style="font-size:11px;color:#999;margin:0">Estamply · <a href="https://estamply.app" style="color:#999">estamply.app</a></p>
<p style="font-size:10px;color:#ccc;margin:8px 0 0"><a href="${APP_URL}/settings" style="color:#ccc">${unsub}</a></p>
</td></tr>
</table>
</td></tr></table></body></html>`
}

function btn(text: string, href: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td align="center">
<a href="${href}" style="display:inline-block;padding:12px 32px;background:#0F766E;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${text}</a>
</td></tr></table>`
}

// ── Translations ──

const t: Record<string, Record<string, string>> = {
  welcome_subject: { es: '¡Bienvenido a Estamply!', pt: 'Bem-vindo ao Estamply!' },
  welcome_title: { es: '¡Bienvenido a Estamply! 👋', pt: 'Bem-vindo ao Estamply! 👋' },
  welcome_body: {
    es: 'Tu cuenta fue creada exitosamente. Estamply es el software diseñado para talleres de sublimación, DTF, vinilo y serigrafía.',
    pt: 'Sua conta foi criada com sucesso. O Estamply é o software projetado para oficinas de sublimação, DTF, vinil e serigrafia.',
  },
  welcome_cta: { es: 'Configurar mi taller', pt: 'Configurar minha oficina' },
  reset_subject: { es: 'Restablecer contraseña', pt: 'Redefinir senha' },
  reset_title: { es: 'Restablecer contraseña', pt: 'Redefinir senha' },
  reset_body: {
    es: 'Recibimos una solicitud para restablecer tu contraseña. Hacé click en el botón de abajo para crear una nueva. Si no solicitaste esto, ignorá este email.',
    pt: 'Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova. Se você não solicitou isso, ignore este email.',
  },
  reset_cta: { es: 'Restablecer contraseña', pt: 'Redefinir senha' },
  reset_expire: { es: 'Este link expira en 1 hora.', pt: 'Este link expira em 1 hora.' },
  invite_subject: { es: 'Te invitaron a un taller en Estamply', pt: 'Você foi convidado para uma oficina no Estamply' },
  invite_title: { es: 'Te invitaron a un taller 🎉', pt: 'Você foi convidado para uma oficina 🎉' },
  invite_body: {
    es: '<strong>{owner}</strong> te invitó a unirte al taller <strong>{workshop}</strong> en Estamply.',
    pt: '<strong>{owner}</strong> convidou você para entrar na oficina <strong>{workshop}</strong> no Estamply.',
  },
  invite_cta: { es: 'Aceptar invitación', pt: 'Aceitar convite' },
  quote_subject: { es: 'Presupuesto #{code} de {workshop}', pt: 'Orçamento #{code} de {workshop}' },
  quote_title: { es: 'Tu presupuesto está listo 📋', pt: 'Seu orçamento está pronto 📋' },
  quote_body: {
    es: '<strong>{workshop}</strong> te envió un presupuesto por <strong>{total}</strong>.',
    pt: '<strong>{workshop}</strong> enviou um orçamento de <strong>{total}</strong>.',
  },
  quote_cta: { es: 'Ver presupuesto', pt: 'Ver orçamento' },
  order_subject: { es: 'Pedido confirmado — {workshop}', pt: 'Pedido confirmado — {workshop}' },
  order_title: { es: '¡Tu pedido fue confirmado! ✅', pt: 'Seu pedido foi confirmado! ✅' },
  order_body: {
    es: '<strong>{workshop}</strong> confirmó tu pedido por <strong>{total}</strong>. Te avisaremos cuando esté listo.',
    pt: '<strong>{workshop}</strong> confirmou seu pedido de <strong>{total}</strong>. Avisaremos quando estiver pronto.',
  },
}

function tr(key: string, locale: string, vars?: Record<string, string>): string {
  let text = t[key]?.[locale] || t[key]?.['es'] || key
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v)
  return text
}

// ── Email functions ──

export async function sendWelcome(email: string, name: string, locale = 'es') {
  const html = layout(`
    <h2 style="color:#1a1a2e;margin:0 0 12px">${tr('welcome_title', locale)}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">${tr('welcome_body', locale)}</p>
    ${btn(tr('welcome_cta', locale), `${APP_URL}/onboarding`)}
    <p style="color:#999;font-size:12px">— El equipo de Estamply</p>
  `, locale)

  return resend().emails.send({
    from: FROM, to: email, subject: tr('welcome_subject', locale), html,
  })
}

export async function sendPasswordReset(email: string, resetToken: string, locale = 'es') {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
  const html = layout(`
    <h2 style="color:#1a1a2e;margin:0 0 12px">${tr('reset_title', locale)}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">${tr('reset_body', locale)}</p>
    ${btn(tr('reset_cta', locale), resetUrl)}
    <p style="color:#999;font-size:12px">${tr('reset_expire', locale)}</p>
  `, locale)

  return resend().emails.send({
    from: FROM, to: email, subject: tr('reset_subject', locale), html,
  })
}

export async function sendTeamInvite(email: string, ownerName: string, workshopName: string, password: string, locale = 'es') {
  const html = layout(`
    <h2 style="color:#1a1a2e;margin:0 0 12px">${tr('invite_title', locale)}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">${tr('invite_body', locale, { owner: ownerName, workshop: workshopName })}</p>
    <div style="margin:16px 0;padding:16px;background:#f8f7ff;border-radius:8px;border:1px solid #e8e4ff">
      <p style="font-size:13px;color:#555;margin:0 0 4px"><strong>Email:</strong> ${email}</p>
      <p style="font-size:13px;color:#555;margin:0"><strong>Contraseña:</strong> ${password}</p>
    </div>
    ${btn(tr('invite_cta', locale), `${APP_URL}/login`)}
  `, locale)

  return resend().emails.send({
    from: FROM, to: email, subject: tr('invite_subject', locale), html,
  })
}

export async function sendQuoteEmail(to: string, workshopName: string, code: string, total: string, quoteUrl: string, locale = 'es') {
  const html = layout(`
    <h2 style="color:#1a1a2e;margin:0 0 12px">${tr('quote_title', locale)}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">${tr('quote_body', locale, { workshop: workshopName, total })}</p>
    ${btn(tr('quote_cta', locale), quoteUrl)}
  `, locale)

  return resend().emails.send({
    from: FROM, to, subject: tr('quote_subject', locale, { code, workshop: workshopName }), html,
  })
}

export async function sendOrderConfirmed(to: string, workshopName: string, total: string, locale = 'es') {
  const html = layout(`
    <h2 style="color:#1a1a2e;margin:0 0 12px">${tr('order_title', locale)}</h2>
    <p style="color:#555;font-size:14px;line-height:1.6">${tr('order_body', locale, { workshop: workshopName, total })}</p>
  `, locale)

  return resend().emails.send({
    from: FROM, to, subject: tr('order_subject', locale, { workshop: workshopName }), html,
  })
}
