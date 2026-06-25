import { IGuiaRemisionParser } from '../../domain/services/IGuiaRemisionParser';
import { GuiaRemision, DetalleGuia } from '../../domain/entities/GuiaRemision';
import xml2js from 'xml2js';

export class XmlToGuiaRemisionParser implements IGuiaRemisionParser {
  async parse(xmlResponse: string, claveAcceso: string): Promise<GuiaRemision> {
    const parsed = await xml2js.parseStringPromise(xmlResponse);
    const guiaNode = parsed.guiaRemision;
    if (!guiaNode) throw new Error('No es una Guía de Remisión');

    const infoTributaria = guiaNode.infoTributaria[0];
    const infoGuiaRemision = guiaNode.infoGuiaRemision[0];

    // infoTributaria (mismo criterio que el resto de parsers)
    const ambiente = infoTributaria.ambiente[0] === '2' ? 'PRODUCCION' : 'PRUEBAS';
    const tipoEmision = infoTributaria.tipoEmision[0] === '1' ? 'NORMAL' : 'OFFLINE';
    const razonSocial = infoTributaria.razonSocial[0];
    const ruc = infoTributaria.ruc[0];
    const estab = infoTributaria.estab[0];
    const ptoEmi = infoTributaria.ptoEmi[0];
    const secuencial = infoTributaria.secuencial[0];
    const dirMatriz = infoTributaria.dirMatriz[0];
    const nombreComercial = infoTributaria.nombreComercial?.[0] || razonSocial;
    const agenteRetencion = infoTributaria.agenteRetencion?.[0] || '';
    const cadenaAgenteRetencion = agenteRetencion ? `AGENTE RETENCIÓN RESOLUCIÓN No. ${agenteRetencion}` : '';
    const contribuyenteRimpe = infoTributaria.contribuyenteRimpe?.[0] || '';

    // infoGuiaRemision: datos de cabecera del traslado (transportista, fechas, etc.)
    const dirEstablecimiento = infoGuiaRemision.dirEstablecimiento?.[0] || dirMatriz;
    const contribuyenteEspecial = infoGuiaRemision.contribuyenteEspecial?.[0] || 'NO ES CONTRIBUYENTE ESPECIAL';
    const obligadoContabilidad = infoGuiaRemision.obligadoContabilidad?.[0] || 'NO';
    const dirPartida = infoGuiaRemision.dirPartida[0];
    const fechaIniTransporte = infoGuiaRemision.fechaIniTransporte[0];
    const fechaFinTransporte = infoGuiaRemision.fechaFinTransporte[0];
    const rucTransportista = infoGuiaRemision.rucTransportista[0];
    const razonSocialTransportista = infoGuiaRemision.razonSocialTransportista[0];
    const placa = infoGuiaRemision.placa[0];

    // Destinatarios: el SRI permite varios por guía, cada uno con su propio
    // motivo/dirección/detalle de ítems. Por ahora solo tomamos el primero,
    // igual que la plantilla. Si necesitas soportar varios, este es el punto
    // donde habría que iterar "destinatariosNode" completo en vez de [0].
    const destinatariosNode = guiaNode.destinatarios?.[0]?.destinatario;
    if (!destinatariosNode || destinatariosNode.length === 0) {
      throw new Error('La Guía de Remisión no tiene destinatarios');
    }
    if (destinatariosNode.length > 1) {
      // No lanzamos error: seguimos con el primero, pero dejamos rastro en logs
      // para que se note si en la práctica llegan guías con varios destinos.
      console.warn(`Guía ${claveAcceso} tiene ${destinatariosNode.length} destinatarios; solo se imprimirá el primero.`);
    }
    const destinatario = destinatariosNode[0];

    const identificacionDestinatario = destinatario.identificacionDestinatario[0];
    const razonSocialDestinatario = destinatario.razonSocialDestinatario[0];
    const dirDestinatario = destinatario.dirDestinatario[0];
    const motivoTraslado = destinatario.motivoTraslado[0];

    // Detalles del primer destinatario (sin precios/impuestos: solo cantidad)
    const detalles: DetalleGuia[] = [];
    const detallesNode = destinatario.detalles?.[0]?.detalle;
    if (detallesNode) {
      for (const det of detallesNode) {
        const codigoInterno = det.codigoInterno?.[0] || det.codigoBarras?.[0] || '0001';
        const codigoAdicional = det.codigoAdicional?.[0] || '';
        const descripcion = det.descripcion[0];
        const cantidad = parseFloat(det.cantidad[0]);
        detalles.push({
          item: codigoInterno,
          codigoaux: codigoAdicional,
          description: descripcion,
          quantity: cantidad
        });
      }
    }

    // Información adicional
    const datosinfoadicional: Array<{ campo: string; valorcampo: string }> = [];
    if (guiaNode.infoAdicional?.[0]?.campoAdicional) {
      for (const campo of guiaNode.infoAdicional[0].campoAdicional) {
        datosinfoadicional.push({
          campo: campo.$.nombre,
          valorcampo: campo._
        });
      }
    }

    const nombrearchivo = `${ruc}-${estab}-${ptoEmi}-${secuencial}.pdf`;

    return new GuiaRemision(
      nombrearchivo,
      ruc, claveAcceso, infoTributaria.codDoc[0], estab, ptoEmi, secuencial, dirMatriz,
      razonSocial, nombreComercial, ambiente, tipoEmision,
      agenteRetencion, cadenaAgenteRetencion, contribuyenteRimpe,
      dirEstablecimiento, contribuyenteEspecial, obligadoContabilidad,
      dirPartida, fechaIniTransporte, fechaFinTransporte,
      rucTransportista, razonSocialTransportista, placa,
      motivoTraslado, identificacionDestinatario, razonSocialDestinatario, dirDestinatario,
      detalles, datosinfoadicional
    );
  }
}