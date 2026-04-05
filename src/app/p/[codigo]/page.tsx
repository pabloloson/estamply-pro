import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicQuoteView from './PublicQuoteView'

export default async function PublicPresupuestoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const supabase = await createClient()

  const { data: presupuesto } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('codigo', codigo)
    .single()

  if (!presupuesto) notFound()

  return <PublicQuoteView presupuesto={presupuesto} />
}
