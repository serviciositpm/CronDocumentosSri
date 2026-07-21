export interface DetalleFactura {
    item: string;
    codigoaux: string;
    description: string;
    quantity: number;
    price: number;
    desc: number;
    preciosinimp: number;
    valorimp: number;
    totalitem: number;
    detinfoadicional: string;
}
export interface Reembolso {
  // Campos de identificación del documento de reembolso
  codDocReembolso:                  string;
  identificacionProveedorReembolso: string;
  estabReembolso:                   string;
  ptoEmiReembolso:                  string;
  secuencialReembolso:              string;
  fechaEmisionReembolso:            string;
  // Campos de impuestos — nombres exactos que usa Template_Factura_Reembolsos.html
  reembolsoBaseImponible0:          string;  // Base imponible 0%, no objeto, exento
  reembolsoBaseImponibleGrabada:    string;  // Base imponible gravada (15%, 12%, 5%, 8%)
  reembolsoIvaLiquidado:            string;  // IVA del reembolso
}
export class Factura {
  constructor(
    public readonly nombrearchivo: string,
    public readonly fechaEmision: string,
    public readonly dirEstablecimiento: string,
    public readonly contribuyenteEspecial: string,
    public readonly obligadoContabilidad: string,
    public readonly tipoIdentificacionComprador: string,
    public readonly razonSocialComprador: string,
    public readonly identificacionComprador: string,
    public readonly direccionComprador: string,
    public readonly totalSinImpuestos: number,
    public readonly propina: number,
    public readonly importeTotal: number,
    public readonly totalDescuento: number,
    public readonly moneda: string,
    public readonly guiaRemision: string,
    public readonly ambiente: string,
    public readonly tipoEmision: string,
    public readonly razonSocial: string,
    public readonly nombreComercial: string,
    public readonly ruc: string,
    public readonly claveAcceso: string,
    public readonly codDoc: string,
    public readonly estab: string,
    public readonly ptoEmi: string,
    public readonly secuencial: string,
    public readonly dirMatriz: string,
    public readonly agenteRetencion: string,
    public readonly cadenaAgenteRetencion: string,
    public readonly contribuyenteRimpe: string,
    public readonly baseImponible12: number,
    public readonly baseImponible15: number,
    public readonly baseImponible5: number,
    public readonly baseImponible8: number,      // IVA 8% (turismo/feriados, codigoPorcentaje=8)
    public readonly baseImponible0: number,
    public readonly noobjetoiva: number,
    public readonly excentoiva: number,
    public readonly ice: number,                 // ICE (codigo=3)
    public readonly valorIva12: number,          // IVA 12% histórico (codigoPorcentaje 2 o 3)
    public readonly valorIva15: number,
    public readonly valorIva5: number,
    public readonly valorIva8: number,           // IVA 8% (turismo/feriados)
    public readonly irbpnr: number,
    public readonly formaPago: string,
    public readonly total: number,
    public readonly plazo: number,
    public readonly unidadTiempo: string,
    public readonly detalles: DetalleFactura[],
    public readonly datosinfoadicional: Array<{ campo: string; valorcampo: string }>,
    public readonly reembolsos: Reembolso[],
    public readonly codDocReembolso: string
  ) {}
}