import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Estamply — Software para ateliês de estamparia',
  description: 'O primeiro software projetado para oficinas de sublimação, DTF, vinil e serigrafia. Faça orçamentos em segundos, envie propostas profissionais e gerencie pedidos.',
  alternates: {
    languages: {
      'es': 'https://estamply.app',
      'pt-BR': 'https://estamply.app/br',
    },
  },
}

export default function BRLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
