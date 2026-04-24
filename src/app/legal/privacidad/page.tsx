import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politica de Privacidad | Estamply',
  description: 'Politica de Privacidad de la plataforma Estamply.',
}

export default function PrivacidadPage() {
  return (
    <article className="legal-content">
      <h1>Politica de Privacidad</h1>
      <p className="text-sm text-gray-400 mb-10">Ultima actualizacion: abril de 2026</p>

      <h2>1. Introduccion</h2>
      <p>Esta Politica de Privacidad describe como Zophix LLC (&quot;Zophix&quot;, &quot;nosotros&quot;) recopila, utiliza, almacena y protege la informacion personal de los usuarios (&quot;usted&quot;, &quot;Usuario&quot;) de la plataforma Estamply (&quot;la Plataforma&quot;, &quot;el Servicio&quot;).</p>
      <p>Nos comprometemos a proteger su privacidad y a tratar sus datos personales de conformidad con las leyes aplicables, incluyendo el Reglamento General de Proteccion de Datos (GDPR) de la Union Europea, la Ley de Privacidad del Consumidor de California (CCPA), la Ley de Proteccion de Datos Personales de Argentina (Ley 25.326), la Lei Geral de Protecao de Dados de Brasil (LGPD) y demas legislacion aplicable en las jurisdicciones donde operamos.</p>

      <h2>2. Informacion que Recopilamos</h2>
      <p><strong>2.1. Informacion de registro:</strong> nombre, direccion de correo electronico, nombre del taller o negocio, pais, y contrasena (almacenada de forma cifrada). Si se registra mediante Google, recibimos su nombre y correo electronico asociado a la cuenta de Google.</p>
      <p><strong>2.2. Informacion de perfil:</strong> nombre del taller, logo, datos de contacto del negocio, informacion fiscal y preferencias de configuracion.</p>
      <p><strong>2.3. Datos operativos:</strong> informacion que usted carga en la Plataforma en el curso de su uso, incluyendo datos de clientes de su taller, cotizaciones, pedidos, productos del catalogo, insumos, costos y estadisticas generadas.</p>
      <p><strong>2.4. Informacion de pago:</strong> al realizar pagos, los datos de su tarjeta o metodo de pago son procesados directamente por nuestros procesadores de pago (Stripe, MercadoPago u Hotmart). Zophix no almacena numeros de tarjetas de credito ni datos financieros sensibles.</p>
      <p><strong>2.5. Datos de uso:</strong> informacion sobre como utiliza la Plataforma, incluyendo paginas visitadas, funcionalidades utilizadas, frecuencia de uso, direccion IP, tipo de navegador, dispositivo, sistema operativo e idioma preferido.</p>
      <p><strong>2.6. Cookies y tecnologias similares:</strong> utilizamos cookies y tecnologias de seguimiento conforme a nuestra <Link href="/legal/cookies">Politica de Cookies</Link>.</p>

      <h2>3. Como Utilizamos su Informacion</h2>
      <p>Utilizamos la informacion recopilada para los siguientes fines:</p>
      <ul>
        <li>Proporcionar, operar y mantener el Servicio.</li>
        <li>Crear y administrar su cuenta de usuario.</li>
        <li>Procesar pagos y gestionar su suscripcion.</li>
        <li>Enviar comunicaciones relacionadas con el Servicio (actualizaciones, avisos de seguridad, cambios en los Terminos).</li>
        <li>Enviar comunicaciones de marketing, solo con su consentimiento previo, con opcion de cancelar la suscripcion en cualquier momento.</li>
        <li>Mejorar y optimizar la Plataforma basandonos en datos de uso agregados y anonimos.</li>
        <li>Detectar, prevenir y responder a actividades fraudulentas o potenciales violaciones de seguridad.</li>
        <li>Cumplir con obligaciones legales y responder a solicitudes legitimas de autoridades competentes.</li>
      </ul>

      <h2>4. Base Legal para el Tratamiento</h2>
      <p>El tratamiento de sus datos personales se basa en:</p>
      <ul>
        <li><strong>Ejecucion contractual:</strong> el procesamiento es necesario para proporcionarle el Servicio conforme a los <Link href="/legal/terminos">Terminos y Condiciones</Link>.</li>
        <li><strong>Consentimiento:</strong> para comunicaciones de marketing y uso de cookies no esenciales.</li>
        <li><strong>Interes legitimo:</strong> para mejorar el Servicio, garantizar la seguridad y prevenir fraudes.</li>
        <li><strong>Cumplimiento legal:</strong> cuando la ley nos obliga a procesar o conservar ciertos datos.</li>
      </ul>

      <h2>5. Comparticion de Datos con Terceros</h2>
      <p>Compartimos informacion personal unicamente en los siguientes casos:</p>
      <ul>
        <li><strong>Procesadores de pago:</strong> Stripe, MercadoPago y Hotmart procesan sus datos de pago conforme a sus propias politicas de privacidad.</li>
        <li><strong>Proveedores de infraestructura:</strong> utilizamos servicios de alojamiento (Hostinger), almacenamiento (Bunny.net), correo electronico transaccional (Resend) y analitica web (Umami) para operar la Plataforma.</li>
        <li><strong>Proveedores de autenticacion:</strong> si utiliza el inicio de sesion con Google, Google procesa sus datos de autenticacion conforme a su politica de privacidad.</li>
        <li><strong>Requerimientos legales:</strong> cuando la ley, un proceso judicial o una autoridad gubernamental nos lo exija.</li>
      </ul>
      <p>No vendemos, alquilamos ni comercializamos sus datos personales a terceros con fines publicitarios o de marketing.</p>

      <h2>6. Transferencias Internacionales de Datos</h2>
      <p>Dado que Zophix LLC esta constituida en los Estados Unidos y nuestros servidores pueden estar ubicados en diferentes regiones, sus datos pueden ser transferidos y procesados fuera de su pais de residencia. En tales casos, adoptamos medidas para garantizar que sus datos reciban un nivel de proteccion adecuado, incluyendo clausulas contractuales tipo u otros mecanismos reconocidos por la legislacion aplicable.</p>

      <h2>7. Seguridad de los Datos</h2>
      <p>Implementamos medidas tecnicas y organizativas para proteger sus datos personales, incluyendo:</p>
      <ul>
        <li>Cifrado de contrasenas mediante algoritmos de hash seguros.</li>
        <li>Comunicaciones cifradas mediante HTTPS/TLS.</li>
        <li>Copias de seguridad diarias automatizadas.</li>
        <li>Control de acceso basado en roles dentro de la Plataforma.</li>
        <li>Proteccion del servidor mediante firewall (UFW) y sistemas de deteccion de intrusiones (fail2ban).</li>
      </ul>
      <p>Ningun sistema de seguridad es infalible. Si bien nos esforzamos por proteger sus datos, no podemos garantizar la seguridad absoluta de la informacion transmitida o almacenada.</p>

      <h2>8. Retencion de Datos</h2>
      <p>Conservamos sus datos personales mientras su cuenta este activa o mientras sea necesario para proporcionarle el Servicio. Tras la cancelacion de su cuenta, conservamos sus datos durante un periodo de 30 dias para permitirle la exportacion. Transcurrido este plazo, sus datos seran eliminados, salvo que la ley nos exija conservarlos por un periodo mayor.</p>
      <p>Los datos de facturacion y transacciones pueden conservarse por el periodo requerido por la legislacion fiscal aplicable.</p>

      <h2>9. Sus Derechos</h2>
      <p>Dependiendo de su jurisdiccion, usted puede tener los siguientes derechos respecto a sus datos personales:</p>
      <ul>
        <li><strong>Acceso:</strong> solicitar informacion sobre los datos personales que tenemos sobre usted.</li>
        <li><strong>Rectificacion:</strong> corregir datos inexactos o incompletos.</li>
        <li><strong>Eliminacion:</strong> solicitar la eliminacion de sus datos personales.</li>
        <li><strong>Portabilidad:</strong> recibir sus datos en un formato estructurado y legible por maquina.</li>
        <li><strong>Oposicion:</strong> oponerse al tratamiento de sus datos en determinadas circunstancias.</li>
        <li><strong>Revocacion del consentimiento:</strong> retirar su consentimiento en cualquier momento, sin afectar la licitud del tratamiento previo.</li>
        <li><strong>No discriminacion:</strong> no sera discriminado por ejercer sus derechos de privacidad.</li>
      </ul>
      <p>Para ejercer cualquiera de estos derechos, contacte a soporte@estamply.app. Responderemos a su solicitud dentro del plazo establecido por la legislacion aplicable.</p>

      <h2>10. Datos de Menores</h2>
      <p>Estamply no esta dirigido a menores de 18 anos. No recopilamos intencionadamente datos personales de menores. Si tiene conocimiento de que un menor ha proporcionado datos personales a traves de la Plataforma, contacte con nosotros para que podamos tomar las medidas necesarias.</p>

      <h2>11. Cambios en esta Politica</h2>
      <p>Podemos actualizar esta Politica de Privacidad periodicamente. Le notificaremos los cambios significativos por correo electronico o mediante un aviso en la Plataforma. La fecha de &quot;Ultima actualizacion&quot; en la parte superior indica cuando fue revisada por ultima vez.</p>

      <h2>12. Contacto</h2>
      <p>Para consultas sobre privacidad o proteccion de datos:</p>
      <p>Zophix LLC<br />Correo electronico: soporte@estamply.app<br />Sitio web: <a href="https://estamply.app">https://estamply.app</a></p>
    </article>
  )
}
