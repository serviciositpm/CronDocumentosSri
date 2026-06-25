import { INotaCreditoParser } from '../../domain/services/INotaCreditoParser';
import { NotaCredito, DetalleNotaCredito } from '../../domain/entities/NotaCredito';
import xml2js from 'xml2js';

export class XmlToNotaCreditoParser implements INotaCreditoParser {
  async parse(xmlResponse: string, claveAcceso: string): Promise<NotaCredito> {
    const parsed = await xml2js.parseStringPromise(xmlResponse);
    const ncNode = parsed.notaCredito;
    if (!ncNode) throw new Error('No es una Nota de Crédito');

    const infoTributaria = ncNode.infoTributaria[0];
    const infoNotaCredito = ncNode.infoNotaCredito[0];

    // infoTributaria (igual criterio que XmlToInvoiceParser / XmlToNotaDebitoParser)
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

    // infoNotaCredito
    const fechaEmision = infoNotaCredito.fechaEmision[0];
    const dirEstablecimiento = infoNotaCredito.dirEstablecimiento?.[0] || dirMatriz;
    const contribuyenteEspecial = infoNotaCredito.contribuyenteEspecial?.[0] || 'NO ES CONTRIBUYENTE ESPECIAL';
    const obligadoContabilidad = infoNotaCredito.obligadoContabilidad?.[0] || 'NO';
    const tipoIdentificacionComprador = infoNotaCredito.tipoIdentificacionComprador[0];
    const razonSocialComprador = infoNotaCredito.razonSocialComprador[0];
    const identificacionComprador = infoNotaCredito.identificacionComprador[0];
    const codDocModificado = infoNotaCredito.codDocModificado[0];
    const numDocModificado = infoNotaCredito.numDocModificado[0];
    const fechaEmisionDocSustento = infoNotaCredito.fechaEmisionDocSustento[0];
    const motivo = infoNotaCredito.motivo?.[0] || '';
    const totalSinImpuestos = parseFloat(infoNotaCredito.totalSinImpuestos[0]);
    const valorModificacion = parseFloat(infoNotaCredito.valorModificacion[0]);
    const moneda = infoNotaCredito.moneda?.[0] || 'DOLAR';

    // Impuestos: igual que Factura, anidados en <totalConImpuestos><totalImpuesto>
    // (a diferencia de NotaDebito, que los trae planos bajo <impuestos>)
    let baseImponible12 = 0, baseImponible15 = 0, baseImponible5 = 0, baseImponible0 = 0;
    let noobjetoiva = 0, excentoiva = 0, ice = 0, valorIva12 = 0, valorIva15 = 0, valorIva5 = 0, irbpnr = 0;
    const totalConImpuestos = infoNotaCredito.totalConImpuestos?.[0];
    if (totalConImpuestos?.totalImpuesto) {
      for (const imp of totalConImpuestos.totalImpuesto) {
        const codigo = imp.codigo[0];
        const codigoPorcentaje = imp.codigoPorcentaje[0];
        const base = parseFloat(imp.baseImponible[0]);
        const valImp = parseFloat(imp.valor[0]);
        if (codigo === '3') ice = valImp;
        if (codigo === '5') irbpnr = valImp;
        switch (codigoPorcentaje) {
          case '0': baseImponible0 = base; break;
          case '2': baseImponible12 = base; valorIva12 = valImp; break;
          case '3': baseImponible12 = base; valorIva12 = valImp; break;
          case '4': baseImponible15 = base; valorIva15 = valImp; break;
          case '5': baseImponible5 = base; valorIva5 = valImp; break;
          case '6': noobjetoiva = base; break;
          case '7': excentoiva = base; break;
        }
      }
    }

    // Detalles: igual estructura que Factura (NO "motivos" como NotaDebito)
    const detalles: DetalleNotaCredito[] = [];
    const detallesNode = ncNode.detalles?.[0]?.detalle;
    if (detallesNode) {
      for (const det of detallesNode) {
        const codigoPrincipal = det.codigoPrincipal?.[0] || '0001';
        const codigoAuxiliar = det.codigoAuxiliar?.[0] || '';
        const descripcion = det.descripcion[0];
        const cantidad = parseFloat(det.cantidad[0]);
        const precioUnitario = parseFloat(det.precioUnitario[0]);
        const descuento = det.descuento ? parseFloat(det.descuento[0]) : 0;
        const precioTotalSinImpuesto = parseFloat(det.precioTotalSinImpuesto[0]);
        let valorimpuesto = 0;
        if (det.impuestos?.[0]?.impuesto) {
          for (const imp of det.impuestos[0].impuesto) {
            valorimpuesto += parseFloat(imp.valor[0]);
          }
        }
        detalles.push({
          item: codigoPrincipal,
          codigoaux: codigoAuxiliar,
          description: descripcion,
          quantity: cantidad,
          price: precioUnitario,
          desc: descuento,
          preciosinimp: precioTotalSinImpuesto,
          valorimp: valorimpuesto,
          totalitem: precioTotalSinImpuesto
        });
      }
    }

    // Información adicional (mismo criterio que Factura/NotaDebito)
    const datosinfoadicional: Array<{ campo: string; valorcampo: string }> = [];
    if (ncNode.infoAdicional?.[0]?.campoAdicional) {
      for (const campo of ncNode.infoAdicional[0].campoAdicional) {
        datosinfoadicional.push({
          campo: campo.$.nombre,
          valorcampo: campo._
        });
      }
    }

    const nombrearchivo = `${ruc}-${estab}-${ptoEmi}-${secuencial}.pdf`;

    return new NotaCredito(
      nombrearchivo,
      ruc, claveAcceso, infoTributaria.codDoc[0], estab, ptoEmi, secuencial, dirMatriz,
      razonSocial, nombreComercial, ambiente, tipoEmision,
      agenteRetencion, cadenaAgenteRetencion, contribuyenteRimpe,
      fechaEmision, dirEstablecimiento, contribuyenteEspecial, obligadoContabilidad,
      tipoIdentificacionComprador, razonSocialComprador, identificacionComprador,
      codDocModificado, numDocModificado, fechaEmisionDocSustento, motivo,
      totalSinImpuestos, valorModificacion, moneda,
      baseImponible12, baseImponible15, baseImponible5, baseImponible0,
      noobjetoiva, excentoiva, ice, valorIva12, valorIva15, valorIva5, irbpnr,
      detalles, datosinfoadicional
    );
  }
}