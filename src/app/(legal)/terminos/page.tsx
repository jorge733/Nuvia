import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Términos de uso" };

export default function Terminos() {
  return (
    <>
      <p className="kicker">Términos</p>
      <h1>Términos de uso</h1>
      <p className="updated">Última actualización: 21 de noviembre de 2026</p>

      <p>
        Estos términos explican las condiciones para usar Uniluva. Al crear una cuenta o entrar con Google, aceptas estos términos, la{" "}
        <Link href="/privacidad">Política de privacidad</Link> y las <Link href="/normas">Normas de la comunidad</Link>.
      </p>

      <h2>1. Qué es Uniluva</h2>
      <p>
        Uniluva es una red social para compartir experiencias, conocimientos y conversaciones que puedan aportar, enseñar o ayudar. Aquí el
        valor de lo que compartes importa más que tu número de seguidores.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes tener al menos 14 años para usar Uniluva.</li>
        <li>La información de tu cuenta debe ser veraz y no puedes hacerte pasar por otra persona u organización.</li>
        <li>Eres responsable de mantener segura tu contraseña y de la actividad que ocurra en tu cuenta.</li>
        <li>Puedes eliminar tu cuenta cuando quieras desde Ajustes.</li>
      </ul>

      <h2>3. Tu contenido</h2>
      <p>
        Lo que publicas sigue siendo tuyo. Al compartirlo en Uniluva, nos das permiso para almacenarlo, mostrarlo y distribuirlo dentro de
        la plataforma, solo con el fin de que Uniluva funcione. Ese permiso termina cuando eliminas el contenido o tu cuenta.
      </p>
      <p>Solo publica contenido que tengas derecho a compartir. No subas imágenes o textos de otras personas sin su autorización.</p>

      <h2>4. Uso responsable</h2>
      <p>Para que Uniluva siga siendo un espacio útil y respetuoso, no está permitido:</p>
      <ul>
        <li>Acosar, amenazar, discriminar o incitar al odio o la violencia.</li>
        <li>Publicar contenido ilegal, sexual explícito o que ponga en riesgo a menores.</li>
        <li>Difundir datos personales de terceros sin su consentimiento.</li>
        <li>Enviar spam, publicidad repetitiva o engañosa, o manipular artificialmente las reacciones.</li>
        <li>Intentar acceder sin permiso a cuentas ajenas o interferir con el funcionamiento del servicio.</li>
      </ul>
      <p>Las comunidades pueden tener reglas adicionales definidas por quienes las administran.</p>

      <h2>5. Moderación</h2>
      <p>
        Cualquier persona con cuenta puede reportar un aporte. Podemos retirar contenido o suspender cuentas que incumplan estos términos o
        las Normas de la comunidad. Cuando sea posible, te explicaremos el motivo.
      </p>

      <h2>6. Disponibilidad del servicio</h2>
      <p>
        Trabajamos para que Uniluva esté disponible y funcione bien, pero el servicio se ofrece tal como está y puede tener interrupciones,
        errores o cambios. Podemos modificar o retirar funciones para mejorar la experiencia.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        Cada persona es responsable del contenido que publica. Los aportes compartidos en Uniluva no sustituyen la asesoría de un
        profesional en temas de salud, legales, financieros u otros.
      </p>

      <h2>8. Cambios a estos términos</h2>
      <p>Si actualizamos estos términos de forma importante, te avisaremos dentro de Uniluva antes de que entren en vigor.</p>

      <h2>9. Contacto</h2>
      <p>
        Si tienes preguntas sobre estos términos, escríbenos a <a href="mailto:uniluva123@gmail.com">uniluva123@gmail.com</a>.
      </p>
    </>
  );
}
