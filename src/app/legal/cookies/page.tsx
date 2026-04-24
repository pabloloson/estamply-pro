import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politica de Cookies | Estamply',
  description: 'Politica de Cookies de la plataforma Estamply.',
}

export default function CookiesPage() {
  return (
    <article className="legal-content">
      <h1>Politica de Cookies</h1>
      <p className="text-sm text-gray-400 mb-10">Ultima actualizacion: abril de 2026</p>

      <h2>1. Que son las Cookies?</h2>
      <p>Las cookies son pequenos archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Se utilizan para recordar sus preferencias, mejorar su experiencia de navegacion y recopilar informacion sobre el uso del sitio.</p>

      <h2>2. Cookies que Utilizamos</h2>

      <h3>2.1. Cookies estrictamente necesarias</h3>
      <p>Estas cookies son esenciales para el funcionamiento de la Plataforma y no pueden desactivarse. Incluyen:</p>
      <ul>
        <li>Cookies de sesion y autenticacion (para mantenerlo conectado a su cuenta).</li>
        <li>Cookies de seguridad (proteccion CSRF y prevencion de fraude).</li>
      </ul>

      <h3>2.2. Cookies de analitica</h3>
      <p>Utilizamos Umami, una herramienta de analitica web respetuosa con la privacidad, para comprender como los usuarios interactuan con la Plataforma. Umami no utiliza cookies de seguimiento personal, no recopila datos personales identificables y cumple con el GDPR sin necesidad de consentimiento adicional. Los datos recopilados son anonimos y agregados.</p>

      <h3>2.3. Cookies de terceros</h3>
      <p>Cuando usted utiliza funcionalidades que involucran servicios de terceros (como procesadores de pago), dichos servicios pueden establecer sus propias cookies conforme a sus respectivas politicas de privacidad.</p>

      <h2>3. Gestion de Cookies</h2>
      <p>Usted puede configurar su navegador para rechazar o eliminar cookies. Tenga en cuenta que bloquear las cookies estrictamente necesarias puede afectar el funcionamiento de la Plataforma.</p>
      <p>Las instrucciones para gestionar cookies varian segun el navegador. Consulte la documentacion de ayuda de su navegador para obtener instrucciones especificas.</p>

      <h2>4. Cambios en esta Politica</h2>
      <p>Podemos actualizar esta Politica de Cookies periodicamente. Los cambios se publicaran en esta pagina con una fecha de actualizacion revisada.</p>

      <h2>5. Contacto</h2>
      <p>Para consultas sobre el uso de cookies:</p>
      <p>Zophix LLC<br />Correo electronico: soporte@estamply.app<br />Sitio web: <a href="https://estamply.app">https://estamply.app</a></p>
    </article>
  )
}
