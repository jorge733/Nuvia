import { Legal } from "@/components/legal";

export const metadata = { title: "Términos" };

export default function Terminos() {
  return (
    <Legal title="Términos de uso">
      <p>
        <strong>Borrador.</strong> Al usar Uniluva aceptas estas condiciones.
      </p>
      <h2>El servicio</h2>
      <p>
        Uniluva es una herramienta para que comunidades de vecinos se organicen. La información de gastos comunes, reuniones y documentos la
        publica la directiva de cada comunidad, que es responsable de su exactitud. Uniluva no es una administración de edificios ni procesa pagos.
      </p>
      <h2>Convivencia</h2>
      <p>
        No publiques contenido ofensivo, discriminatorio o que exponga datos de otras personas sin su autorización. La directiva puede quitar a
        miembros de la comunidad y eliminar contenido.
      </p>
      <h2>Oficios</h2>
      <p>
        Las recomendaciones de oficios son opiniones de vecinos. Uniluva no contrata, garantiza ni se hace responsable de los trabajos realizados.
      </p>
    </Legal>
  );
}
