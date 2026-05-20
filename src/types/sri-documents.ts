// ---------- Genérico ----------
export interface DocumentoBase {
  claveAcceso: string;
  tipoDocumento: 'factura' | 'retencion' | 'notaCredito' | 'guiaRemision' | 'notaDebito';
  infoTributaria: InfoTributaria;
}

export interface InfoTributaria {
  ambiente: string;
  tipoEmision: string;
  razonSocial: string;
  nombreComercial?: string;
  ruc: string;
  dirMatriz: string;
  fechaEmision: string; // Podrías usar Date después de parsear
}

// ---------- Factura ----------
export interface Factura extends DocumentoBase {
  tipoDocumento: 'factura';
  infoFactura: {
    fechaEmision: string;
    dirEstablecimiento: string;
    contribuyenteEspecial?: string;
    obligadoContabilidad: string;
    tipoIdentificacionComprador: string;
    razonSocialComprador: string;
    identificacionComprador: string;
    totalSinImpuestos: number;
    totalDescuento: number;
    totalImpuestos: Impuesto[];
    propina: number;
    importeTotal: number;
  };
  detalles: DetalleFactura[];
  reembolsos?: Reembolso[];
}

export interface DetalleFactura {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  impuestos: ImpuestoDetalle[];
}

export interface Impuesto {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

export interface ImpuestoDetalle extends Impuesto {}

export interface Reembolso {
  tipoIdentificacionProveedorReembolso: string;
  identificacionProveedorReembolso: string;
  codDocReembolso: string;
  estabDocReembolso: string;
  ptoEmiDocReembolso: string;
  secuencialDocReembolso: string;
  fechaEmisionDocReembolso: string;
  totalSinImpuestosReembolso: number;
  totalImpuestosReembolso: Impuesto[];
}

// ---------- Retención ----------
export interface Retencion extends DocumentoBase {
  tipoDocumento: 'retencion';
  infoRetencion: {
    fechaEmision: string;
    dirEstablecimiento: string;
    contribuyenteEspecial?: string;
    obligadoContabilidad: string;
    tipoIdentificacionSujetoRetenido: string;
    razonSocialSujetoRetenido: string;
    identificacionSujetoRetenido: string;
    periodoFiscal: string;
  };
  impuestos: ImpuestoRetencion[];
}

export interface ImpuestoRetencion {
  codigo: string;
  codigoRetencion: string;
  baseImponible: number;
  porcentajeRetener: number;
  valorRetenido: number;
}

// Unión de todos los documentos posibles
export type DocumentoSRI = Factura | Retencion;