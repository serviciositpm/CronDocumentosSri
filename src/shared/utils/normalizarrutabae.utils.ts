// src/shared/utils/normalizarRutaBase.util.ts
import path from 'path';

/**
 * Traduce una ruta UNC de Windows (\\servidor\recurso\...) al punto de
 * montaje local equivalente cuando el proceso corre en Linux, donde ese
 * recurso ya está montado vía CIFS (ver docker-compose.yml -> /pdfs).
 *
 * En Windows (dev) no hace nada: la ruta UNC funciona de forma nativa.
 *
 * Requiere en Linux las variables de entorno:
 *   UNC_BASE_PATH    = \\10.100.120.19\Erpdocumentos
 *   LOCAL_MOUNT_PATH = /pdfs
 */
export function normalizarRutaBase(rutaOrigen: string): string {
  if (process.platform !== 'linux') {
    return rutaOrigen;
  }

  const uncPrefix = process.env.UNC_BASE_PATH;
  const localMount = process.env.LOCAL_MOUNT_PATH;

  if (!uncPrefix || !localMount) {
    throw new Error(
      'UNC_BASE_PATH y LOCAL_MOUNT_PATH deben estar configuradas en el entorno Linux'
    );
  }

  if (!rutaOrigen.startsWith(uncPrefix)) {
    throw new Error(
      `La ruta base "${rutaOrigen}" no coincide con UNC_BASE_PATH ("${uncPrefix}"). ` +
      'Verifica que ambas variables estén sincronizadas con el valor real del SP.'
    );
  }

  // Recorta el prefijo UNC y convierte los backslashes restantes a '/'
  const resto = rutaOrigen
    .slice(uncPrefix.length)
    .split('\\')
    .filter(Boolean)
    .join('/');

  return path.posix.join(localMount, resto);
}
// src/shared/utils/normalizarRutaBase.util.ts (agregar función inversa)

/**
 * Convierte una ruta local de Linux (montada vía CIFS) de vuelta a su
 * forma UNC original, para que quede consistente en BD sin importar
 * en qué SO se generó el archivo.
 */
export function aRutaUNC(rutaLocal: string): string {
  if (process.platform !== 'linux') {
    return rutaLocal; // en Windows ya es UNC nativa
  }

  const uncPrefix = process.env.UNC_BASE_PATH;   // \\10.100.120.19\Erpdocumentos
  const localMount = process.env.LOCAL_MOUNT_PATH; // /pdfs

  if (!uncPrefix || !localMount || !rutaLocal.startsWith(localMount)) {
    throw new Error(`No se pudo convertir "${rutaLocal}" a formato UNC`);
  }

  const resto = rutaLocal
    .slice(localMount.length)
    .split('/')
    .filter(Boolean)
    .join('\\');

  return `${uncPrefix}\\${resto}`;
}