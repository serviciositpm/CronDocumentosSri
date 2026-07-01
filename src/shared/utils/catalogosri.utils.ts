/**
 * Catálogos de la Ficha Técnica de Comprobantes Electrónicos SRI - v2.32 (octubre 2025)
 *
 * TABLA 4 – Tipo de comprobante sustento (codDocSustento)
 * Referencia: numeral 9.14 de la ficha técnica SRI v2.32
 */
export const TABLA_4_COD_DOC_SUSTENTO: Record<string, string> = {
  '01': 'Factura',
  '02': 'Nota de Venta - RISE',
  '03': 'Liquidación de Compra de Bienes y Prestación de Servicios',
  '04': 'Nota de Crédito',
  '05': 'Nota de Débito',
  '06': 'Guía de Remisión',
  '07': 'Comprobante de Retención',
  '08': 'Boletos o entradas a espectáculos públicos',
  '09': 'Tiquetes emitidos por máquinas registradoras',
  '10': 'Pasajes expedidos por empresas de aviación',
  '11': 'Documentos emitidos por instituciones financieras',
  '12': 'Documento emitido por instituciones financieras (débito / convenio)',
  '16': 'Formulario utilizado por personas naturales en relación de dependencia (empleados)',
  '18': 'Documentos de importación',
  '19': 'Comprobantes de pago de cuotas o aportes',
  '20': 'Documentos de servicios administrativos emitidos por Instituciones del Estado',
  '21': 'Carta de Porte Aéreo',
  '22': 'Acta de entrega - recepción de bienes (en operaciones de comercio exterior)',
  '41': 'Comprobante de Venta emitido en el exterior',
  '42': 'Liquidación de compra de bienes locales emitida por el adquirente',
  '43': 'Proveedor directo de exportador bajo régimen especial',
  '44': 'Reposición de bienes destruidos o caducados',
  '45': 'Acta de entrega',
  '47': 'Nota de crédito de reembolso',
  '48': 'Nota de débito de reembolso',
  '49': 'Factura de reembolso',
};

/**
 * TABLA 19 – Impuesto a retener (campo <codigo> dentro de <impuesto>/<retencion>)
 * Referencia: numeral 9.14 de la ficha técnica SRI v2.32
 */
export const TABLA_19_CODIGO_IMPUESTO: Record<string, string> = {
  '1': 'Renta',
  '2': 'IVA',
  '4': 'IVA Presuntivo y Renta',  // comercializadores/distribuidores petróleo
  '6': 'ISD',
};

/**
 * Devuelve "código - descripción" o solo el código si no está en el catálogo.
 */
export function descCodDocSustento(codigo: string): string {
  const desc = TABLA_4_COD_DOC_SUSTENTO[codigo];
  return desc ? `${codigo} - ${desc}` : codigo;
}

export function descCodigoImpuesto(codigo: string): string {
  const desc = TABLA_19_CODIGO_IMPUESTO[codigo];
  return desc ? `${codigo} - ${desc}` : codigo;
}