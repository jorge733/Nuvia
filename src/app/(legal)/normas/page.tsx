import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Normas de la comunidad" };

export default function Normas() {
  return (
    <>
      <p className="kicker">Comunidad</p>
      <h1>Normas de la comunidad</h1>
      <p className="updated">Última actualización: 21 de noviembre de 2026</p>

      <p>
        No necesitas ser famoso para ser importante. Lo que compartes puede ser justo lo que otra persona necesitaba. Estas normas nos
        ayudan a cuidar ese espacio entre todos.
      </p>

      <h2>Aporta valor</h2>
      <ul>
        <li>Comparte experiencias, conocimientos, preguntas y perspectivas que puedan enseñar o ayudar.</li>
        <li>Cuando compartas datos o consejos, cuenta de dónde vienen o desde qué experiencia hablas.</li>
        <li>Publica en la comunidad que corresponde para que tu aporte llegue a quien le sirve.</li>
      </ul>

      <h2>Conversa con respeto</h2>
      <ul>
        <li>Debate ideas, no ataques personas. Está bien no estar de acuerdo.</li>
        <li>No se permite el acoso, las amenazas, los insultos ni la discriminación por ningún motivo.</li>
        <li>Escucha perspectivas distintas a la tuya: descubrirlas es parte de Uniluva.</li>
      </ul>

      <h2>Cuida a las personas</h2>
      <ul>
        <li>No compartas datos personales, fotos ni conversaciones privadas de otras personas sin su permiso.</li>
        <li>No publiques contenido sexual explícito, violento o que ponga en riesgo a menores.</li>
        <li>Si alguien parece estar en peligro, anímalo a buscar ayuda profesional o servicios de emergencia.</li>
      </ul>

      <h2>Sé auténtico</h2>
      <ul>
        <li>No te hagas pasar por otra persona ni crees cuentas para engañar.</li>
        <li>No hagas spam, publicidad repetitiva ni intentes inflar reacciones de forma artificial.</li>
        <li>Respeta la autoría: da crédito cuando compartas el trabajo de otros.</li>
      </ul>

      <h2>Qué puedes hacer si algo no está bien</h2>
      <ul>
        <li>
          <strong>Reportar:</strong> en cualquier aporte, toca <em>Reportar</em> y cuéntanos el motivo.
        </li>
        <li>
          <strong>Escribirnos:</strong> a <a href="mailto:uniluva123@gmail.com">uniluva123@gmail.com</a> si necesitas ayuda con algo más.
        </li>
      </ul>
      <p>
        Revisamos los reportes y podemos retirar contenido o suspender cuentas que incumplan estas normas o los{" "}
        <Link href="/terminos">Términos de uso</Link>.
      </p>
    </>
  );
}
