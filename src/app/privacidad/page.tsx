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
        Tu correo electrónico, nombre, teléfono (opcional), la comunidad y unidad a la que perteneces, tus gastos comunes, comprobantes de pago,
        reclamos, sugerencias y recomendaciones de oficios que publiques.
      </p>
      <h2>Para qué</h2>
      <p>
        Solo para operar la plataforma de tu comunidad: mostrarte tus gastos comunes, reuniones y documentos, y permitir la comunicación con la
        administración y tus vecinos. No vendemos tus datos ni los usamos para publicidad.
      </p>
      <h2>Quién los ve</h2>
      <p>
        Tus vecinos aprobados ven tu nombre en reclamos públicos y recomendaciones. Tus montos de gasto común, comprobantes, teléfono y mensajes
        privados solo los ve la directiva de tu comunidad (administración y comité).
      </p>
      <h2>Datos de terceros (oficios)</h2>
      <p>
        Quien recomienda a un trabajador declara contar con su autorización para publicar su nombre y teléfono. El trabajador puede pedir que
        retiremos sus datos en cualquier momento.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, supresión, oposición y portabilidad de tus datos, y eliminar tu cuenta, escribiendo a
        privacidad@uniluva.com. Respondemos en un máximo de 30 días.
      </p>
    </Legal>
  );
}
