import { IInvoiceParser } from '../../domain/services/IInvoiceParser';
import { Factura, DetalleFactura, Reembolso } from '../../domain/entities/Factura';
import { devolverFormaPago } from '../../shared/utils/formapago.util';
import xml2js from 'xml2js';

export class XmlToInvoiceParser implements IInvoiceParser {
  async parse(xmlResponse: string, claveAcceso: string): Promise<Factura> {
    const parsed = await xml2js.parseStringPromise(xmlResponse);
    const facturaNode = parsed.factura;
    if (!facturaNode) throw new Error('No es una factura');

    const infoTributaria = facturaNode.infoTributaria[0];
    const infoFactura = facturaNode.infoFactura[0];

    // Extraer datos básicos (similar al original pero tipado)
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

    const fechaEmision = infoFactura.fechaEmision[0];
    const dirEstablecimiento = infoFactura.dirEstablecimiento?.[0] || dirMatriz;
    const contribuyenteEspecial = infoFactura.contribuyenteEspecial?.[0] || 'NO ES CONTRIBUYENTE ESPECIAL';
    const obligadoContabilidad = infoFactura.obligadoContabilidad?.[0] || 'NO';
    const tipoIdentificacionComprador = infoFactura.tipoIdentificacionComprador[0];
    const guiaRemision = infoFactura.guiaRemision?.[0] || '000-000-000000000';
    const razonSocialComprador = infoFactura.razonSocialComprador[0];
    const identificacionComprador = infoFactura.identificacionComprador[0];
    const direccionComprador = infoFactura.direccionComprador?.[0] || 'N/A';
    const totalSinImpuestos = parseFloat(infoFactura.totalSinImpuestos[0]);
    const totalDescuento = infoFactura.totalDescuento ? parseFloat(infoFactura.totalDescuento[0]) : 0;
    const propina = infoFactura.propina ? parseFloat(infoFactura.propina[0]) : 0;
    const importeTotal = parseFloat(infoFactura.importeTotal[0]);
    const moneda = infoFactura.moneda?.[0] || 'DOLAR';
    const codDocReembolso = infoFactura.codDocReembolso?.[0] || '';

    // Impuestos
    let baseImponible12 = 0, baseImponible15 = 0, baseImponible5 = 0, baseImponible0 = 0;
    let noobjetoiva = 0, excentoiva = 0, valor = 0, valorIva15 = 0, valorIva5 = 0, irbpnr = 0;
    const totalConImpuestos = infoFactura.totalConImpuestos[0];
    if (totalConImpuestos?.totalImpuesto) {
      for (const imp of totalConImpuestos.totalImpuesto) {
        const codigo = imp.codigo[0];
        const codigoPorcentaje = imp.codigoPorcentaje[0];
        const base = parseFloat(imp.baseImponible[0]);
        const valImp = parseFloat(imp.valor[0]);
        if (codigo === '5') irbpnr = valImp;
        switch (codigoPorcentaje) {
          case '0': baseImponible0 = base; break;
          case '2': baseImponible12 = base; valor = valImp; break;
          case '3': baseImponible12 = base; valor = valImp; break;
          case '4': baseImponible15 = base; valorIva15 = valImp; break;
          case '5': baseImponible5 = base; valorIva5 = valImp; break;
          case '6': noobjetoiva = base; break;
          case '7': excentoiva = base; break;
        }
      }
    }

    // Pagos
    let formaPago = 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO';
    let totalPago = importeTotal;
    let plazo = 0;
    let unidadTiempo = 'DIAS';
    if (infoFactura.pagos && infoFactura.pagos[0]?.pago) {
      const pago = infoFactura.pagos[0].pago[0];
      formaPago = devolverFormaPago(pago.formaPago[0]);
      totalPago = parseFloat(pago.total[0]);
      plazo = pago.plazo ? parseInt(pago.plazo[0]) : 0;
    }

    // Detalles
    const detalles: DetalleFactura[] = [];
    const detallesNode = facturaNode.detalles[0].detalle;
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
      let detinfoadicional = 'S/I';
      if (det.detallesAdicionales?.[0]?.detAdicional) {
        for (const add of det.detallesAdicionales[0].detAdicional) {
          detinfoadicional += `${add.$.nombre} => ${add.$.valor} `;
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
        totalitem: precioTotalSinImpuesto,
        detinfoadicional
      });
    }

    // Reembolsos
    const reembolsos: Reembolso[] = [];
    if (codDocReembolso === '41' && facturaNode.reembolsos?.[0]?.reembolsoDetalle) {
      for (const reem of facturaNode.reembolsos[0].reembolsoDetalle) {
        // parse reembolso similar al original (simplificado)
        reembolsos.push({
          documentreem: `${reem.estabDocReembolso[0]}-${reem.ptoEmiDocReembolso[0]}-${reem.secuencialDocReembolso[0]}`,
          identificationreem: reem.identificacionProveedorReembolso?.[0] || '',
          issuedatereem: reem.fechaEmisionDocReembolso[0],
          subiva15reem: 0, subiva5reem: 0, sub0reem: 0, iva15reem: 0, iva5reem: 0, totalreem: 0
        });
      }
    }

    // Información adicional
    const datosinfoadicional: Array<{ campo: string; valorcampo: string }> = [];
    if (facturaNode.infoAdicional?.[0]?.campoAdicional) {
      for (const campo of facturaNode.infoAdicional[0].campoAdicional) {
        datosinfoadicional.push({
          campo: campo.$.nombre,
          valorcampo: campo._
        });
      }
    }

    const nombrearchivo = `${ruc}-${estab}-${ptoEmi}-${secuencial}.pdf`;

    return new Factura(
      nombrearchivo, fechaEmision, dirEstablecimiento, contribuyenteEspecial,
      obligadoContabilidad, tipoIdentificacionComprador, razonSocialComprador,
      identificacionComprador, direccionComprador, totalSinImpuestos, propina,
      importeTotal, totalDescuento, moneda, guiaRemision, ambiente, tipoEmision,
      razonSocial, nombreComercial, ruc, claveAcceso, infoTributaria.codDoc[0],
      estab, ptoEmi, secuencial, dirMatriz, agenteRetencion, cadenaAgenteRetencion,
      contribuyenteRimpe, baseImponible12, baseImponible15, baseImponible5,
      baseImponible0, noobjetoiva, excentoiva, valor, valorIva15, valorIva5,
      irbpnr, formaPago, totalPago, plazo, unidadTiempo, detalles, datosinfoadicional,
      reembolsos, codDocReembolso
    );
  }
}