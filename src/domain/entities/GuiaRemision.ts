export interface DetalleGuia {
  item: string;
  codigoaux: string;
  description: string;
  quantity: number;
}

export class GuiaRemision {
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
    // infoGuiaRemision (cabecera del traslado)
    public readonly dirEstablecimiento: string,
    public readonly contribuyenteEspecial: string,
    public readonly obligadoContabilidad: string,
    public readonly dirPartida: string,
    public readonly fechaIniTransporte: string,
    public readonly fechaFinTransporte: string,
    public readonly rucTransportista: string,
    public readonly razonSocialTransportista: string,
    public readonly placa: string,
    // destinatarios[0] -- la guía del SRI permite VARIOS destinatarios por
    // documento, cada uno con su propio motivo/dirección/detalle. Esta
    // entidad solo modela el PRIMERO, igual que la plantilla actual.
    // Si en la práctica se despachan guías con más de un destinatario,
    // esto debe extenderse (ver nota en XmlToGuiaRemisionParser).
    public readonly motivoTraslado: string,
    public readonly identificacionDestinatario: string,
    public readonly razonSocialDestinatario: string,
    public readonly dirDestinatario: string,
    public readonly detalles: DetalleGuia[],
    public readonly datosinfoadicional: Array<{ campo: string; valorcampo: string }>
  ) {}
}