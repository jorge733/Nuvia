import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function Privacidad() {
  return (
    <>
      <p className="kicker">Privacidad</p>
      <h1>Política de privacidad</h1>
      <p className="updated">Última actualización: 21 de noviembre de 2026</p>

      <p>
        Uniluva existe para que las ideas útiles lleguen a quienes las necesitan. Para eso necesitamos algunos datos tuyos, y queremos que
        sepas exactamente cuáles, para qué los usamos y cómo puedes controlarlos.
      </p>
      <p>
        <strong>En pocas palabras:</strong> usamos tus datos solo para que Uniluva funcione. No los vendemos, no mostramos publicidad
        personalizada y puedes eliminar tu cuenta cuando quieras desde Ajustes.
      </p>

      <h2>1. Qué datos recopilamos</h2>
      <ul>
        <li>
          <strong>Datos de tu cuenta:</strong> nombre, correo electrónico, nombre de usuario y, si eliges entrar con Google, el nombre
          asociado a esa cuenta.
        </li>
        <li>
          <strong>Datos de tu perfil:</strong> biografía, foto de perfil y comunidades a las que te unes.
        </li>
        <li>
          <strong>Contenido que compartes:</strong> aportes, imágenes, enlaces, comentarios y reacciones.
        </li>
        <li>
          <strong>Reportes:</strong> cuando reportas un aporte, guardamos el motivo que escribes y quién lo envió.
        </li>
      </ul>
      <p>No recopilamos tu ubicación precisa, tus contactos ni datos de pago.</p>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Crear y mantener tu cuenta, e iniciar tu sesión de forma segura.</li>
        <li>Mostrar tus aportes en Uniluva y en las comunidades que elijas.</li>
        <li>Ordenar los aportes según su utilidad y calcular tu reputación por aportes.</li>
        <li>Avisarte dentro de Uniluva cuando alguien comenta o reacciona a tus aportes.</li>
        <li>Cuidar la comunidad: revisar reportes y prevenir abusos o usos indebidos.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad personalizada.</p>

      <h2>3. Quién puede ver lo que compartes</h2>
      <p>
        Tus aportes, comentarios, nombre, nombre de usuario, foto, biografía y comunidades son públicos. Tus reacciones son privadas: solo
        las ve la persona que escribió el aporte, y nunca se muestran como un contador público. Tu correo electrónico no se muestra a nadie.
      </p>

      <h2>4. Servicios que nos ayudan a funcionar</h2>
      <p>Para operar Uniluva usamos proveedores que tratan datos en nuestro nombre y bajo sus propias medidas de seguridad:</p>
      <ul>
        <li>Supabase (autenticación, base de datos y almacenamiento de archivos).</li>
        <li>Vercel (alojamiento del sitio web).</li>
        <li>Google, solo si eliges entrar con tu cuenta de Google.</li>
      </ul>
      <p>Estos servicios pueden almacenar información en servidores ubicados fuera de tu país.</p>

      <h2>5. Cuánto tiempo guardamos tus datos</h2>
      <p>
        Mientras tu cuenta esté activa. Cuando eliminas tu cuenta, borramos tu perfil, tus aportes, comentarios, reacciones, imágenes,
        membresías y avisos. Algunos registros mínimos pueden conservarse por un tiempo limitado cuando la ley lo exija o para resolver
        reportes pendientes.
      </p>

      <h2>6. Tus derechos y controles</h2>
      <ul>
        <li>
          <strong>Corregir tus datos:</strong> desde Ajustes → Perfil.
        </li>
        <li>
          <strong>Eliminarlos:</strong> desde Ajustes → Eliminar cuenta.
        </li>
        <li>
          <strong>Obtener una copia, oponerte o hacer consultas:</strong> escribiéndonos al correo de contacto.
        </li>
      </ul>

      <h2>7. Edad mínima</h2>
      <p>Uniluva está pensada para personas de 14 años o más. Si sabemos que una cuenta pertenece a alguien menor de esa edad, la eliminaremos.</p>

      <h2>8. Seguridad</h2>
      <p>
        Usamos conexiones cifradas, reglas de acceso a nivel de base de datos que limitan quién puede leer o modificar cada dato y la
        infraestructura segura de nuestros proveedores. Ningún sistema es infalible, por eso te recomendamos usar una contraseña única.
      </p>

      <h2>9. Cambios a esta política</h2>
      <p>Si cambiamos esta política de forma importante, te lo avisaremos dentro de Uniluva antes de que el cambio entre en vigor.</p>

      <h2>10. Contacto</h2>
      <p>
        Para cualquier consulta sobre tus datos, escríbenos a <a href="mailto:uniluva123@gmail.com">uniluva123@gmail.com</a>.
      </p>
    </>
  );
}
