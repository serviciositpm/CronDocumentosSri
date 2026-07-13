import fs from 'fs/promises';
import path from 'path';

/**
 * Nombres de mes en español en mayúsculas (índice 1-12).
 * Coinciden con el formato pedido: 2026/JULIO/FACTURA/archivo.pdf
 */
const MESES: Record<number, string> = {
  1:  'ENERO',
  2:  'FEBRERO',
  3:  'MARZO',
  4:  'ABRIL',
  5:  'MAYO',
  6:  'JUNIO',
  7:  'JULIO',
  8:  'AGOSTO',
  9:  'SEPTIEMBRE',
  10: 'OCTUBRE',
  11: 'NOVIEMBRE',
  12: 'DICIEMBRE',
};

/**
 * Nombres de carpeta por tipo de comprobante (codDoc SRI).
 * Tabla 3 de la ficha técnica SRI.
 */
const NOMBRE_TIPO: Record<string, string> = {
  '01': 'FACTURA',
  '03': 'LIQUIDACION',
  '04': 'NOTA_CREDITO',
  '05': 'NOTA_DEBITO',
  '06': 'GUIA',
  '07': 'RETENCION',
  '08': 'BOLETOS',
  '09': 'TIQUETES',
  '12': 'DOC_FINANCIERO',
  '41': 'FACTURA_REEMBOLSO',
};

/**
 * Extrae año y mes de la fecha de emisión codificada en la clave de acceso.
 * La clave de acceso tiene 49 dígitos; los primeros 8 son la fecha: ddmmaaaa.
 *
 * Ejemplo: clave '2306202601...' → día=23 mes=06 año=2026
 */
function extraerFechaDeClaveAcceso(claveAcceso: string): { anio: number; mes: number } {
  // posiciones: 0-1 = día, 2-3 = mes, 4-7 = año
  const dia  = parseInt(claveAcceso.substring(0, 2), 10);
  const mes  = parseInt(claveAcceso.substring(2, 4), 10);
  const anio = parseInt(claveAcceso.substring(4, 8), 10);

  if (!mes || mes < 1 || mes > 12 || !anio || anio < 2000) {
    // Fecha inválida en la clave → usar fecha actual como fallback
    const hoy = new Date();
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  }

  return { anio, mes };
}

/**
 * Construye la ruta completa con estructura año/mes/tipo y crea las
 * carpetas intermedias si no existen (equivalente a mkdir -p).
 *
 * Resultado: <baseDir>\2026\JULIO\GUIA\  (o / en Linux)
 *
 * @param baseDir      Ruta base configurada en BD: \\10.100.120.19\Erpdocumentos\pdfdocprueba
 * @param claveAcceso  Clave de acceso del comprobante (49 dígitos SRI)
 * @param codDoc       Código de tipo de comprobante: '01', '04', '05', '06', '07'...
 * @returns            Ruta completa de la carpeta destino, ya creada en disco
 */
export async function resolverRutaDestino(
  baseDir: string,
  claveAcceso: string,
  codDoc: string
): Promise<string> {
  const { anio, mes } = extraerFechaDeClaveAcceso(claveAcceso);
  const nombreMes  = MESES[mes]  ?? `MES_${mes}`;
  const nombreTipo = NOMBRE_TIPO[codDoc] ?? `TIPO_${codDoc}`;

  const rutaCompleta = path.join(baseDir, String(anio), nombreMes, nombreTipo);

  // Crea toda la cadena de carpetas si no existe (no lanza error si ya existe)
  await fs.mkdir(rutaCompleta, { recursive: true });

  return rutaCompleta;
}