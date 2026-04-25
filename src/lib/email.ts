import { Resend } from 'resend'

let _resend: Resend | null = null
function resend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const FROM = 'Estamply <no-reply@estamply.app>'
const LOGO = 'https://estamply-cdn.b-cdn.net/logos/estamply-logo.png'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'

// ── Layout ──

function layout(content: string) {
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
<p style="font-size:10px;color:#ccc;margin:8px 0 0"><a href="mailto:soporte@estamply.app" style="color:#ccc">soporte@estamply.app</a></p>
</td></tr>
</table>
</td></tr></table></body></html>`
}

function btn(text: string, href: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td align="center">
<a href="${href}" style="display:inline-block;padding:12px 32px;background:#0F766E;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${text}</a>
</td></tr></table>`
}

function h2(text: string) {
  return `<h2 style="color:#18181b;margin:0 0 12px;font-size:20px">${text}</h2>`
}

function p(text: string) {
  return `<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px">${text}</p>`
}

function info(label: string, value: string) {
  return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0"><span style="color:#555;font-size:13px">${label}</span><span style="color:#18181b;font-size:13px;font-weight:600">${value}</span></div>`
}

function sig() {
  return `<p style="color:#999;font-size:12px;margin:16px 0 0">— El equipo de Estamply</p>`
}

// ══════════════════════════════════════════
// AUTENTICACION Y CUENTA
// ══════════════════════════════════════════

export async function sendWelcome(email: string, name: string) {
  const html = layout(`
    ${h2('Bienvenido a Estamply!')}
    ${p(`Hola${name ? ` <strong>${name}</strong>` : ''}, tu cuenta fue creada exitosamente.`)}
    ${p('Estamply es el software disenado para talleres de sublimacion, DTF, vinilo y serigrafia. Configura tu taller para empezar a cotizar.')}
    ${btn('Configurar mi taller', `${APP_URL}/onboarding`)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Bienvenido a Estamply!', html })
}

export async function sendEmailVerification(email: string, verifyUrl: string) {
  const html = layout(`
    ${h2('Verifica tu email')}
    ${p('Hace click en el boton de abajo para verificar tu direccion de correo electronico.')}
    ${btn('Verificar email', verifyUrl)}
    ${p('Si no creaste una cuenta en Estamply, podes ignorar este email.')}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Verifica tu email — Estamply', html })
}

export async function sendPasswordReset(email: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
  const html = layout(`
    ${h2('Restablecer contrasena')}
    ${p('Recibimos una solicitud para restablecer tu contrasena. Hace click en el boton de abajo para crear una nueva.')}
    ${btn('Restablecer contrasena', resetUrl)}
    ${p('Este link expira en 1 hora. Si no solicitaste esto, ignora este email.')}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Restablecer contrasena — Estamply', html })
}

export async function sendPasswordChanged(email: string, userName: string) {
  const html = layout(`
    ${h2('Contrasena actualizada')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, tu contrasena fue actualizada exitosamente.`)}
    ${p('Si no realizaste este cambio, contactanos inmediatamente respondiendo a este email.')}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Tu contrasena fue actualizada — Estamply', html })
}

// ══════════════════════════════════════════
// EQUIPO
// ══════════════════════════════════════════

export async function sendTeamInvite(email: string, ownerName: string, workshopName: string, password: string) {
  const html = layout(`
    ${h2('Te invitaron a un taller')}
    ${p(`<strong>${ownerName}</strong> te invito a unirte al taller <strong>${workshopName}</strong> en Estamply.`)}
    <div style="margin:16px 0;padding:16px;background:#f8f7ff;border-radius:8px;border:1px solid #e8e4ff">
      <p style="font-size:13px;color:#555;margin:0 0 4px"><strong>Email:</strong> ${email}</p>
      <p style="font-size:13px;color:#555;margin:0"><strong>Contrasena:</strong> ${password}</p>
    </div>
    ${btn('Aceptar invitacion', `${APP_URL}/login`)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Te invitaron a un taller en Estamply', html })
}

// ══════════════════════════════════════════
// PRESUPUESTOS Y PEDIDOS (para clientes del taller)
// ══════════════════════════════════════════

export async function sendQuoteEmail(to: string, workshopName: string, code: string, total: string, quoteUrl: string) {
  const html = layout(`
    ${h2('Tu presupuesto esta listo')}
    ${p(`<strong>${workshopName}</strong> te envio un presupuesto por <strong>${total}</strong>.`)}
    ${btn('Ver presupuesto', quoteUrl)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to, subject: `Presupuesto #${code} de ${workshopName}`, html })
}

export async function sendOrderConfirmed(to: string, workshopName: string, total: string) {
  const html = layout(`
    ${h2('Tu pedido fue confirmado!')}
    ${p(`<strong>${workshopName}</strong> confirmo tu pedido por <strong>${total}</strong>. Te avisaremos cuando este listo.`)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to, subject: `Pedido confirmado — ${workshopName}`, html })
}

// ══════════════════════════════════════════
// SUSCRIPCION Y BILLING
// ══════════════════════════════════════════

export async function sendSubscriptionConfirmed(email: string, userName: string, planName: string, price: string, nextBillingDate: string) {
  const html = layout(`
    ${h2('Tu plan esta activo!')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, tu suscripcion al plan <strong>${planName}</strong> fue confirmada.`)}
    <div style="margin:16px 0;padding:16px;background:#F0FDFA;border-radius:8px;border:1px solid #D1FAE5">
      ${info('Plan', planName)}
      ${info('Precio', price)}
      ${info('Proximo cobro', nextBillingDate)}
    </div>
    ${btn('Ir a mi taller', `${APP_URL}/dashboard`)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: `Plan ${planName} activado — Estamply`, html })
}

export async function sendPlanUpgraded(email: string, userName: string, oldPlan: string, newPlan: string, price: string) {
  const html = layout(`
    ${h2('Upgrade exitoso!')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, tu plan fue actualizado de <strong>${oldPlan}</strong> a <strong>${newPlan}</strong>.`)}
    ${p(`Nuevo precio: <strong>${price}</strong>. Los cambios ya estan activos.`)}
    ${btn('Ir a mi taller', `${APP_URL}/dashboard`)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: `Upgrade a ${newPlan} — Estamply`, html })
}

export async function sendPlanDowngraded(email: string, userName: string, oldPlan: string, newPlan: string, effectiveDate: string) {
  const html = layout(`
    ${h2('Cambio de plan confirmado')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, tu plan cambiara de <strong>${oldPlan}</strong> a <strong>${newPlan}</strong>.`)}
    ${p(`El cambio sera efectivo el <strong>${effectiveDate}</strong>. Hasta esa fecha seguis con acceso completo a tu plan actual.`)}
    ${btn('Ver mi cuenta', `${APP_URL}/cuenta`)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: `Cambio de plan a ${newPlan} — Estamply`, html })
}

export async function sendPaymentSuccess(email: string, userName: string, amount: string, invoiceUrl?: string) {
  const html = layout(`
    ${h2('Pago recibido')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, recibimos tu pago por <strong>${amount}</strong>.`)}
    ${p('Tu suscripcion sigue activa. Gracias por confiar en Estamply.')}
    ${invoiceUrl ? btn('Ver factura', invoiceUrl) : ''}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Pago recibido — Estamply', html })
}

export async function sendPaymentFailed(email: string, userName: string, updatePaymentUrl: string) {
  const html = layout(`
    ${h2('No pudimos cobrar tu suscripcion')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, el ultimo intento de cobro de tu suscripcion fallo.`)}
    ${p('Para evitar la suspension de tu cuenta, actualiza tu metodo de pago lo antes posible.')}
    ${btn('Actualizar metodo de pago', updatePaymentUrl)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Problema con tu pago — Estamply', html })
}

export async function sendTrialExpiring(email: string, userName: string, daysLeft: number, upgradeUrl: string) {
  const html = layout(`
    ${h2(`Tu prueba gratuita vence en ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`)}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, tu periodo de prueba en Estamply esta por terminar.`)}
    ${p('Elegi un plan para seguir usando todas las funcionalidades sin interrupcion.')}
    ${btn('Elegir mi plan', upgradeUrl)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: `Tu prueba vence en ${daysLeft} dias — Estamply`, html })
}

export async function sendTrialExpired(email: string, userName: string, upgradeUrl: string) {
  const html = layout(`
    ${h2('Tu prueba gratuita termino')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, tu periodo de prueba en Estamply finalizo.`)}
    ${p('Tu cuenta sigue activa, pero algunas funcionalidades Pro estan limitadas. Elegi un plan para seguir con acceso completo.')}
    ${btn('Elegir mi plan', upgradeUrl)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Tu prueba gratuita termino — Estamply', html })
}

export async function sendSubscriptionCanceled(email: string, userName: string, accessUntilDate: string) {
  const html = layout(`
    ${h2('Suscripcion cancelada')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, tu suscripcion fue cancelada.`)}
    ${p(`Tenes acceso a tu plan actual hasta el <strong>${accessUntilDate}</strong>. Despues de esa fecha, tu cuenta pasara al plan gratuito.`)}
    ${p('Si cambias de opinion, podes reactivar tu suscripcion en cualquier momento.')}
    ${btn('Reactivar suscripcion', `${APP_URL}/planes`)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: 'Suscripcion cancelada — Estamply', html })
}

// ══════════════════════════════════════════
// ACTIVIDAD DEL NEGOCIO (para el dueno del taller)
// ══════════════════════════════════════════

export async function sendNewOrderFromCatalog(email: string, userName: string, clientName: string, orderTotal: string, orderUrl: string) {
  const html = layout(`
    ${h2('Nuevo pedido desde tu catalogo!')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, <strong>${clientName}</strong> hizo un pedido desde tu catalogo web por <strong>${orderTotal}</strong>.`)}
    ${p('Revisa los detalles del pedido en tu panel.')}
    ${btn('Ver pedido', orderUrl)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: `Nuevo pedido de ${clientName} — Estamply`, html })
}

export async function sendQuoteAccepted(email: string, userName: string, clientName: string, quoteTotal: string, quoteUrl: string) {
  const html = layout(`
    ${h2('Presupuesto aceptado!')}
    ${p(`Hola${userName ? ` <strong>${userName}</strong>` : ''}, <strong>${clientName}</strong> acepto tu presupuesto por <strong>${quoteTotal}</strong>.`)}
    ${p('Ya podes confirmar el pedido y empezar a producir.')}
    ${btn('Ver presupuesto', quoteUrl)}
    ${sig()}
  `)
  return resend().emails.send({ from: FROM, to: email, subject: `${clientName} acepto tu presupuesto — Estamply`, html })
}
