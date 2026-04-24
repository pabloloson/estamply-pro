import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terminos y Condiciones | Estamply',
  description: 'Terminos y Condiciones de Uso de la plataforma Estamply.',
}

export default function TerminosPage() {
  return (
    <article className="legal-content">
      <h1>Terminos y Condiciones de Uso</h1>
      <p className="text-sm text-gray-400 mb-10">Ultima actualizacion: abril de 2026</p>

      <h2>1. Introduccion</h2>
      <p>Estos Terminos y Condiciones de Uso (&quot;Terminos&quot;) constituyen un acuerdo legal vinculante entre usted (&quot;Usuario&quot;, &quot;usted&quot;) y Zophix LLC, sociedad constituida en los Estados Unidos de America (&quot;Zophix&quot;, &quot;nosotros&quot;, &quot;la Empresa&quot;), operadora de la plataforma Estamply, accesible desde https://app.estamply.app (&quot;la Plataforma&quot;, &quot;el Servicio&quot;, &quot;Estamply&quot;).</p>
      <p>Al crear una cuenta, acceder o utilizar Estamply, usted declara haber leido, comprendido y aceptado estos Terminos en su totalidad. Si no esta de acuerdo con alguno de estos Terminos, no debe utilizar el Servicio.</p>

      <h2>2. Descripcion del Servicio</h2>
      <p>Estamply es una plataforma de software como servicio (SaaS) disenada para talleres de personalizacion, sublimacion, DTF, serigrafia y vinilo. La Plataforma ofrece herramientas de cotizacion, gestion de pedidos, administracion de clientes, catalogo web, estadisticas de negocio y otras funcionalidades relacionadas con la operacion de talleres de personalizacion.</p>

      <h2>3. Registro y Cuentas de Usuario</h2>
      <p>3.1. Para utilizar Estamply, usted debe crear una cuenta proporcionando informacion veraz, completa y actualizada. Puede registrarse mediante correo electronico y contrasena o mediante proveedores de autenticacion de terceros (como Google).</p>
      <p>3.2. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que ocurran bajo su cuenta.</p>
      <p>3.3. Usted debe ser mayor de 18 anos o tener la edad legal minima en su jurisdiccion para celebrar contratos vinculantes.</p>
      <p>3.4. Usted se compromete a notificarnos de inmediato cualquier uso no autorizado de su cuenta a traves de soporte@estamply.app.</p>
      <p>3.5. Nos reservamos el derecho de suspender o cancelar cuentas que violen estos Terminos, contengan informacion falsa o se utilicen de forma fraudulenta.</p>

      <h2>4. Planes, Precios y Facturacion</h2>
      <p>4.1. Estamply ofrece distintos planes de suscripcion (Emprendedor, Pro y Negocio) con diferentes funcionalidades y limites. Los detalles actualizados de precios se encuentran en <a href="https://estamply.app">https://estamply.app</a>.</p>
      <p>4.2. Al seleccionar un plan pago, usted autoriza a Zophix a cobrar la tarifa correspondiente de forma recurrente (mensual o anual, segun la modalidad elegida) a traves de los procesadores de pago habilitados (Stripe, MercadoPago u Hotmart, segun su region y moneda).</p>
      <p>4.3. Los precios pueden ser modificados con un aviso previo de al menos 30 dias. Los cambios de precio aplicaran al siguiente periodo de facturacion posterior a la notificacion.</p>
      <p>4.4. Estamply ofrece un periodo de prueba gratuito de 14 dias del plan Pro, sin necesidad de ingresar datos de pago. Al finalizar el periodo de prueba, el Usuario debera seleccionar un plan pago para continuar utilizando las funcionalidades Pro.</p>
      <p>4.5. Los pagos realizados no son reembolsables, salvo lo establecido por la legislacion aplicable en la jurisdiccion del Usuario o lo indicado expresamente en estos Terminos.</p>

      <h2>5. Uso Aceptable</h2>
      <p>5.1. El Usuario se compromete a utilizar Estamply exclusivamente para los fines previstos: la gestion operativa de su taller o negocio de personalizacion.</p>
      <p>5.2. Queda estrictamente prohibido:</p>
      <ul>
        <li>Utilizar la Plataforma para actividades ilegales, fraudulentas o que infrinjan derechos de terceros.</li>
        <li>Intentar acceder a cuentas, datos o sistemas de otros usuarios sin autorizacion.</li>
        <li>Realizar ingenieria inversa, descompilar o intentar extraer el codigo fuente de la Plataforma.</li>
        <li>Utilizar la Plataforma para enviar spam, contenido malicioso o comunicaciones no solicitadas.</li>
        <li>Sobrecargar intencionalmente la infraestructura del Servicio o interferir con su funcionamiento.</li>
        <li>Revender, sublicenciar o redistribuir el acceso a la Plataforma sin autorizacion escrita de Zophix.</li>
        <li>Cargar contenido que infrinja derechos de propiedad intelectual, sea difamatorio, obsceno o ilegal.</li>
      </ul>
      <p>5.3. El incumplimiento de estas restricciones puede resultar en la suspension o cancelacion inmediata de la cuenta, sin derecho a reembolso.</p>

      <h2>6. Propiedad Intelectual</h2>
      <p>6.1. La Plataforma Estamply, incluyendo su codigo fuente, diseno, marca, logotipos, textos, graficos y demas elementos, es propiedad exclusiva de Zophix LLC y esta protegida por las leyes de propiedad intelectual aplicables.</p>
      <p>6.2. Se otorga al Usuario una licencia limitada, no exclusiva, no transferible y revocable para acceder y utilizar la Plataforma durante la vigencia de su suscripcion, exclusivamente para sus fines comerciales internos.</p>
      <p>6.3. Nada en estos Terminos transfiere al Usuario derechos de propiedad intelectual sobre la Plataforma.</p>

      <h2>7. Datos del Usuario</h2>
      <p>7.1. El Usuario conserva todos los derechos de propiedad sobre los datos que cargue, cree o almacene en la Plataforma (&quot;Datos del Usuario&quot;), incluyendo informacion de clientes, cotizaciones, pedidos, productos del catalogo y estadisticas generadas.</p>
      <p>7.2. El Usuario otorga a Zophix una licencia limitada para utilizar los Datos del Usuario exclusivamente con el fin de proporcionar, mantener y mejorar el Servicio, y cumplir con la legislacion aplicable.</p>
      <p>7.3. Zophix no compartira, vendera ni cedera los Datos del Usuario a terceros, salvo lo estrictamente necesario para la prestacion del Servicio (por ejemplo, procesadores de pago) o cuando la ley lo requiera.</p>
      <p>7.4. El Usuario es el unico responsable de la legalidad, exactitud y pertinencia de los datos que cargue en la Plataforma, incluyendo el cumplimiento de las leyes de proteccion de datos aplicables respecto a la informacion de sus propios clientes.</p>
      <p>7.5. Al cancelar su cuenta, el Usuario podra solicitar la exportacion de sus datos antes de la eliminacion. Una vez transcurridos 30 dias desde la cancelacion, Zophix podra eliminar los Datos del Usuario de forma permanente.</p>

      <h2>8. Disponibilidad del Servicio</h2>
      <p>8.1. Zophix se esfuerza por mantener la Plataforma disponible de forma continua, pero no garantiza un tiempo de actividad del 100%. Pueden producirse interrupciones por mantenimiento programado, actualizaciones o circunstancias fuera de nuestro control.</p>
      <p>8.2. Zophix no sera responsable por perdidas, danos o perjuicios derivados de la indisponibilidad temporal del Servicio.</p>
      <p>8.3. Nos reservamos el derecho de modificar, suspender o descontinuar cualquier funcionalidad del Servicio, con aviso previo razonable cuando sea posible.</p>

      <h2>9. Limitacion de Responsabilidad</h2>
      <p>9.1. Estamply se proporciona &quot;tal como esta&quot; y &quot;segun disponibilidad&quot;. Zophix no otorga garantias expresas ni implicitas sobre la idoneidad del Servicio para un proposito particular, ni garantiza resultados especificos derivados de su uso.</p>
      <p>9.2. En la maxima medida permitida por la ley aplicable, Zophix no sera responsable por danos indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo, sin limitacion, perdida de beneficios, datos, oportunidades de negocio o fondo de comercio.</p>
      <p>9.3. La responsabilidad total acumulada de Zophix frente al Usuario por cualquier reclamacion relacionada con estos Terminos no superara el monto total abonado por el Usuario en los 12 meses anteriores al evento que origino la reclamacion.</p>
      <p>9.4. Las cotizaciones, calculos de costos y estimaciones generados por la Plataforma son herramientas orientativas. El Usuario es el unico responsable de verificar y validar dichos calculos antes de utilizarlos con sus propios clientes.</p>

      <h2>10. Indemnizacion</h2>
      <p>El Usuario se compromete a indemnizar, defender y mantener indemne a Zophix LLC, sus directivos, empleados y agentes frente a cualquier reclamacion, demanda, dano, perdida, costo o gasto (incluidos honorarios razonables de abogados) derivados de o relacionados con: (a) el uso del Servicio por parte del Usuario; (b) la violacion de estos Terminos; (c) la infraccion de derechos de terceros; o (d) los datos cargados por el Usuario en la Plataforma.</p>

      <h2>11. Cancelacion y Terminacion</h2>
      <p>11.1. El Usuario puede cancelar su suscripcion en cualquier momento desde la configuracion de su cuenta. La cancelacion sera efectiva al final del periodo de facturacion en curso.</p>
      <p>11.2. Zophix puede suspender o cancelar una cuenta de forma inmediata si el Usuario viola estos Terminos, sin perjuicio de otros recursos legales disponibles.</p>
      <p>11.3. Tras la cancelacion, el Usuario perdera acceso a las funcionalidades del plan pago pero podra solicitar la exportacion de sus datos dentro de los 30 dias posteriores.</p>

      <h2>12. Modificaciones a los Terminos</h2>
      <p>12.1. Zophix se reserva el derecho de modificar estos Terminos en cualquier momento. Las modificaciones se notificaran mediante correo electronico o aviso dentro de la Plataforma con al menos 15 dias de antelacion a su entrada en vigor.</p>
      <p>12.2. El uso continuado del Servicio despues de la entrada en vigor de las modificaciones constituye la aceptacion de los nuevos Terminos.</p>
      <p>12.3. Si el Usuario no esta de acuerdo con las modificaciones, podra cancelar su cuenta antes de la fecha de entrada en vigor de los cambios.</p>

      <h2>13. Resolucion de Disputas</h2>
      <p>13.1. Estos Terminos se rigen por las leyes del Estado de Wyoming, Estados Unidos de America, sin perjuicio de sus normas sobre conflicto de leyes.</p>
      <p>13.2. Cualquier disputa derivada de estos Terminos se resolvera mediante arbitraje vinculante administrado de acuerdo con las reglas de la American Arbitration Association (AAA), salvo que la ley aplicable en la jurisdiccion del Usuario establezca un foro obligatorio diferente.</p>
      <p>13.3. Nada en esta clausula limita el derecho del Usuario a presentar reclamaciones ante los organismos de proteccion al consumidor de su jurisdiccion, cuando la legislacion local asi lo permita.</p>

      <h2>14. Disposiciones Generales</h2>
      <p>14.1. Si alguna disposicion de estos Terminos resulta invalida o inaplicable, las demas disposiciones continuaran en pleno vigor y efecto.</p>
      <p>14.2. La falta de ejercicio de un derecho por parte de Zophix no constituira una renuncia a dicho derecho.</p>
      <p>14.3. Estos Terminos, junto con la <Link href="/legal/privacidad">Politica de Privacidad</Link> y la <Link href="/legal/cookies">Politica de Cookies</Link>, constituyen el acuerdo completo entre el Usuario y Zophix respecto al uso de Estamply.</p>
      <p>14.4. En caso de discrepancia entre versiones en distintos idiomas, prevalecera la version en espanol.</p>

      <h2>15. Contacto</h2>
      <p>Para consultas relacionadas con estos Terminos, puede contactarnos en:</p>
      <p>Zophix LLC<br />Correo electronico: soporte@estamply.app<br />Sitio web: <a href="https://estamply.app">https://estamply.app</a></p>
    </article>
  )
}
