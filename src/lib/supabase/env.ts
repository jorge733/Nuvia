// La URL del proyecto y la clave publishable son públicas por diseño (se envían al navegador
// y la seguridad depende de las políticas RLS). Por eso se dejan como valor por defecto:
// las variables de entorno, si existen, tienen prioridad.
const DEFAULT_URL = "https://iehpvtvkzpbcaaficlgj.supabase.co";
const DEFAULT_KEY = "sb_publishable_n1CO1-tgHvhHOhWIvBkQKw_xbnQz-3b";

export function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
  // Acepta también la URL copiada con /rest/v1/ al final.
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function supabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;
}
