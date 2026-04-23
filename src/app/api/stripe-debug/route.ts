import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // List recent invoices
    const invoices = await stripe.invoices.list({ limit: 3 })
    const invoiceData = invoices.data.map(inv => ({
      id: inv.id,
      status: inv.status,
      payment_intent: inv.payment_intent,
      collection_method: inv.collection_method,
      amount_due: inv.amount_due,
      currency: inv.currency,
      billing_reason: inv.billing_reason,
      payment_settings: (inv as any).payment_settings,
    }))

    // List recent subscriptions
    const subs = await stripe.subscriptions.list({ limit: 3, status: 'all' })
    const subData = subs.data.map(sub => ({
      id: sub.id,
      status: sub.status,
      latest_invoice: sub.latest_invoice,
      default_payment_method: sub.default_payment_method,
      collection_method: sub.collection_method,
      payment_settings: sub.payment_settings,
    }))

    // Check if there's a customer
    if (invoices.data.length > 0) {
      const customerId = typeof invoices.data[0].customer === 'string'
        ? invoices.data[0].customer
        : invoices.data[0].customer?.id
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId)
        return NextResponse.json({
          invoices: invoiceData,
          subscriptions: subData,
          customer: {
            id: (customer as any).id,
            invoice_settings: (customer as any).invoice_settings,
            default_source: (customer as any).default_source,
          },
        })
      }
    }

    return NextResponse.json({ invoices: invoiceData, subscriptions: subData })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
