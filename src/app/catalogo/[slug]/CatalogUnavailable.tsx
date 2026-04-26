export default function CatalogUnavailable() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <img src="https://app.estamply.app/logo-full.png" alt="Estamply" style={{ width: 140, marginBottom: 32 }} />
      <p style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', maxWidth: 360 }}>
        Este catálogo no está disponible en este momento.
      </p>
    </div>
  )
}
