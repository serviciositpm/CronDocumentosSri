export interface DetalleRetencion {
  codDocSustento: string;
  numDocSustento: string;
  fechaEmisionDocSustento: string;
  codigoImpuesto: string;
  codigoRetencion: string;
  baseImponible: number;
  porcentajeRetener: number;
  valorRetenido: number;
}

export class Retencion {
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
    // infoCompRetencion
    public readonly fechaEmision: string,
    public readonly fechaAut: string,
    public readonly dirEstablecimiento: string,
    public readonly contribuyenteEspecial: string,
    public readonly obligadoContabilidad: string,
    public readonly tipoIdentificacionSujetoRetenido: string,
    public readonly razonSocialSujetoRetenido: string,
    public readonly identificacionSujetoRetenido: string,
    public readonly periodoFiscal: string,
    // detalle: líneas de retención (no ítems de producto, son impuestos retenidos)
    public readonly detalles: DetalleRetencion[],
    // total retenido = suma de valorRetenido de todas las líneas.
    // El XML del SRI NO trae un campo de total explícito para este
    // comprobante; lo calculamos en el parser sumando "detalles".
    public readonly totalRetenido: number,
    public readonly datosinfoadicional: Array<{ campo: string; valorcampo: string }>
  ) {}
}