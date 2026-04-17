'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RedirectToProduct({ slug, productId }: { slug: string; productId: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/catalogo/${slug}?product=${productId}`)
  }, [router, slug, productId])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #e5e7eb', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
