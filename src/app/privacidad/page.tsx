import { Legal } from "@/components/legal";

export const metadata = { title: "Privacidad" };

// Borrador base: debe revisarlo un abogado antes del lanzamiento (Ley 19.628 y Ley 21.719).
export default function Privacidad() {
  return (
    <Legal title="Política de privacidad">
      <p>
        <strong>Borrador.</strong> Esta política resume cómo Uniluva trata tus datos personales conforme a la legislación chilena de protección de
        datos.
      </p>
      <h2>Qué datos tratamos</h2>
      <p>
        Tu correo electrónico, nombre y teléfono (opcional); los integrantes de tu familia que agregues (nombre, tipo y, si lo indicas, teléfono);
        y las actividades, relevos y tareas que registres en la agenda.
      </p>
      <h2>Para qué</h2>
      <p>Solo para que tú y tu familia organicen su agenda. No vendemos tus datos ni los usamos para publicidad.</p>
      <h2>Quién los ve</h2>
      <p>
        Las actividades familiares las ven los integrantes de tu familia que usan la app. Las actividades marcadas como “Solo yo” solo las ves tú, y
        las marcadas como “Ocupado” aparecen para tu familia sin título ni detalles.
      </p>
      <h2>Niños y personas sin cuenta</h2>
      <p>
        Puedes registrar a niños, adultos mayores u otras personas que no usan la app. Al hacerlo, declaras tener su autorización o la de su
        representante legal. Registra solo los datos necesarios.
      </p>
      <h2>Enlace de calendario</h2>
      <p>El enlace para suscribirte desde Google o Apple Calendar es personal y secreto. Puedes renovarlo cuando quieras desde tu perfil.</p>
      <h2>Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, supresión, oposición y portabilidad de tus datos, y eliminar tu cuenta, escribiendo a
        privacidad@uniluva.com. Respondemos en un máximo de 30 días.
      </p>
    </Legal>
  );
}
