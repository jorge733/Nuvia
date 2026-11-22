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
        Uniluva es una agenda para que las familias se organicen y repartan sus actividades. Los recordatorios dependen de tu dispositivo y de tu
        calendario: no reemplazan indicaciones médicas, legales ni plazos oficiales.
      </p>
      <h2>Tu familia</h2>
      <p>
        Quien crea una familia es su administrador/a y puede invitar o quitar integrantes. Comparte el enlace de invitación solo con personas de
        confianza.
      </p>
      <h2>Uso responsable</h2>
      <p>No uses Uniluva para registrar datos de otras personas sin su autorización ni para fines ilícitos.</p>
    </Legal>
  );
}
