/**
 * La clave de acceso del SRI tiene 49 dígitos con esta estructura:
 *  1-8   Fecha de emisión (ddmmaaaa)
 *  9-10  Tipo de comprobante (codDoc)
 *  11-23 RUC del emisor
 *  24    Tipo de ambiente
 *  25-30 Serie (establecimiento + punto de emisión)
 *  31-39 Número secuencial
 *  40-47 Código numérico
 *  48    Tipo de emisión
 *  49    Dígito verificador
 *
 * Catálogo de codDoc (los relevantes hasta ahora):
 *  01 Factura
 *  04 Nota de Crédito
 *  05 Nota de Débito
 *  06 Guía de Remisión
 *  07 Comprobante de Retención
 */
export const TIPO_COMPROBANTE = {
  FACTURA: '01',
  NOTA_CREDITO: '04',
  NOTA_DEBITO: '05',
  GUIA_REMISION: '06',
  RETENCION: '07'
} as const;

export function obtenerCodDocDesdeClaveAcceso(claveAcceso: string): string {
  // Posiciones 9-10 (1-indexado) => índices 8-9 (0-indexado)
  return claveAcceso.substring(8, 10);
}