export interface DetalleNotaCredito {
  item: string;
  codigoaux: string;
  description: string;
  quantity: number;
  price: number;
  desc: number;
  preciosinimp: number;
  valorimp: number;
  totalitem: number;
}

export class NotaCredito {
  constructor(
    public readonly nombrearchivo: string,
    // infoTributaria
    public readonly ruc: string,
    public readonly claveAcceso: string,
    public readonly codDoc: string,
    public readonly estab: string,
    public readonly ptoEmi: string,
    public readonly secuencial: string,
    public readonly dirMatriz: string,
    public readonly razonSocial: string,
    public readonly nombreComercial: string,
    public readonly ambiente: string,
    public readonly tipoEmision: string,
    public readonly agenteRetencion: string,
    public readonly cadenaAgenteRetencion: string,
    public readonly contribuyenteRimpe: string,
    // infoNotaCredito
    public readonly fechaEmision: string,
    public readonly dirEstablecimiento: string,
    public readonly contribuyenteEspecial: string,
    public readonly obligadoContabilidad: string,
    public readonly tipoIdentificacionComprador: string,
    public readonly razonSocialComprador: string,
    public readonly identificacionComprador: string,
    public readonly codDocModificado: string,
    public readonly numDocModificado: string,
    public readonly fechaEmisionDocSustento: string,
    public readonly motivo: string,
    public readonly totalSinImpuestos: number,
    // OJO: a diferencia de Factura/NotaDebito, el SRI llama a este campo
    // "valorModificacion" en el XML de Nota de Crédito, no "valorTotal".
    public readonly valorModificacion: number,
    public readonly moneda: string,
    // Impuestos (mismo criterio que Factura: anidados en totalConImpuestos,
    // NO planos como en NotaDebito)
    public readonly baseImponible12: number,
    public readonly baseImponible15: number,
    public readonly baseImponible5: number,
    public readonly baseImponible0: number,
    public readonly noobjetoiva: number,
    public readonly excentoiva: number,
    public readonly ice: number,
    public readonly valorIva12: number,
    public readonly valorIva15: number,
    public readonly valorIva5: number,
    public readonly irbpnr: number,
    // detalle de ítems (igual que Factura). La NC NO usa "motivos" como la ND;
    // el motivo de la NC es un único texto libre (ver campo "motivo" arriba).
    public readonly detalles: DetalleNotaCredito[],
    public readonly datosinfoadicional: Array<{ campo: string; valorcampo: string }>
  ) {}
}