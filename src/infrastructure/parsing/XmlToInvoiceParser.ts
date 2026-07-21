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

    // Impuestos — tabla 16 (codigo) y tabla 17 (codigoPorcentaje) de la ficha técnica SRI v2.32
    //
    // TABLA 16 – código de impuesto:
    //   2 = IVA   3 = ICE   5 = IRBPNR
    //
    // TABLA 17 – codigoPorcentaje (solo aplica cuando codigo=2, IVA):
    //   0 = IVA 0%
    //   2 = IVA 12% (histórico, vigente hasta nov 2023)
    //   3 = IVA 14% (histórico, vigente 2016)
    //   4 = IVA 15% (vigente desde abr 2024)
    //   5 = IVA 5% (vivienda interés social)
    //   6 = No objeto de IVA
    //   7 = Exento de IVA
    //   8 = IVA 8% (turismo en feriados, transitorio)
    //  10 = IVA 0% (servicios turísticos – uso interno SRI, equivale a código 0)
    let baseImponible12 = 0, baseImponible15 = 0, baseImponible5 = 0, baseImponible8 = 0, baseImponible0 = 0;
    let noobjetoiva = 0, excentoiva = 0;
    let ice = 0, valorIva12 = 0, valorIva15 = 0, valorIva5 = 0, valorIva8 = 0, irbpnr = 0;

    const totalConImpuestos = infoFactura.totalConImpuestos[0];
    if (totalConImpuestos?.totalImpuesto) {
      for (const imp of totalConImpuestos.totalImpuesto) {
        const codigo = imp.codigo[0];          // tipo de impuesto
        const codigoPorcentaje = imp.codigoPorcentaje[0];
        const base = parseFloat(imp.baseImponible[0]);
        const valImp = parseFloat(imp.valor[0]);

        if (codigo === '3') { ice += valImp; continue; }   // ICE (puede venir por ítem, sumamos)
        if (codigo === '5') { irbpnr = valImp; continue; } // IRBPNR

        // IVA (codigo === '2')
        switch (codigoPorcentaje) {
          case '0':
          case '10': baseImponible0 += base; break;                        // 0% e int. turístico 0%
          case '2':
          case '3':  baseImponible12 += base; valorIva12 += valImp; break; // 12% y 14% históricos
          case '4':  baseImponible15 += base; valorIva15 += valImp; break; // 15% vigente
          case '5':  baseImponible5  += base; valorIva5  += valImp; break; // 5%
          case '6':  noobjetoiva     += base; break;                       // No objeto
          case '7':  excentoiva      += base; break;                       // Exento
          case '8':  baseImponible8  += base; valorIva8  += valImp; break; // 8% turismo feriados
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
      let detinfoadicional = '';
      if (det.detallesAdicionales?.[0]?.detAdicional) {
        const partes: string[] = [];
        for (const add of det.detallesAdicionales[0].detAdicional) {
          partes.push(`${add.$.nombre}: ${add.$.valor}`);
        }
        detinfoadicional = partes.join(' | ');
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
    // El XML de una factura de reembolso (codDocReembolso='41') trae:
    // <reembolsos>
    //   <reembolsoDetalle>
    //     <tipoProveedorReembolso>      → tipo de proveedor
    //     <paisPagoProveedorReembolso>  → país de pago
    //     <aplicaRetConvDobTrib>        → aplica retención
    //     <pagoRegFis>                  → pago régimen fiscal
    //     <codDocReembolso>             → tipo de documento
    //     <establDocReembolso>          → establecimiento
    //     <emisionDocReembolso>         → punto de emisión
    //     <secuencialDocReembolso>      → secuencial
    //     <fechaEmisionDocReembolso>    → fecha de emisión
    //     <numeroautorizacionDocReemb>  → nro. autorización
    //     <identificacionProveedorReembolso> → RUC/CI del proveedor
    //     <detalleImpuestos>
    //       <detalleImpuesto>
    //         <codigo>2</codigo>
    //         <codigoPorcentaje>0|4|...</codigoPorcentaje>
    //         <baseImponibleReembolso>
    //         <impuestoReembolso>
    const reembolsos: Reembolso[] = [];
    if (codDocReembolso === '41' && facturaNode.reembolsos?.[0]?.reembolsoDetalle) {
      for (const reem of facturaNode.reembolsos[0].reembolsoDetalle) {
        // Campos de identificación del documento
        const codDocReem     = reem.codDocReembolso?.[0] || '';
        const estabReem      = reem.establDocReembolso?.[0] || reem.estabDocReembolso?.[0] || '';
        const ptoEmiReem     = reem.emisionDocReembolso?.[0] || reem.ptoEmiDocReembolso?.[0] || '';
        const secuencialReem = reem.secuencialDocReembolso?.[0] || '';
        const fechaReem      = reem.fechaEmisionDocReembolso?.[0] || '';
        const identificacion = reem.identificacionProveedorReembolso?.[0] || '';

        // Impuestos del reembolso
        let baseImponible0Reem    = 0;
        let baseImponibleGravReem = 0;
        let ivaLiquidadoReem      = 0;

        const detalleImpuestos = reem.detalleImpuestos?.[0]?.detalleImpuesto;
        if (detalleImpuestos) {
          for (const imp of detalleImpuestos) {
            const codPorcentaje = imp.codigoPorcentaje?.[0] || '0';
            const base  = parseFloat(imp.baseImponibleReembolso?.[0] || '0');
            const valor = parseFloat(imp.impuestoReembolso?.[0] || '0');

            if (codPorcentaje === '0' || codPorcentaje === '6' || codPorcentaje === '7') {
              baseImponible0Reem += base;           // base 0%, no objeto, exento
            } else {
              baseImponibleGravReem += base;        // base gravada (15%, 12%, 5%, 8%)
              ivaLiquidadoReem      += valor;       // IVA del reembolso
            }
          }
        }

        reembolsos.push({
          // Nombres que usa la plantilla Template_Factura_Reembolsos.html
          codDocReembolso:                codDocReem,
          identificacionProveedorReembolso: identificacion,
          estabReembolso:                 estabReem,
          ptoEmiReembolso:                ptoEmiReem,
          secuencialReembolso:            secuencialReem,
          fechaEmisionReembolso:          fechaReem,
          reembolsoBaseImponible0:        baseImponible0Reem.toFixed(2),
          reembolsoBaseImponibleGrabada:  baseImponibleGravReem.toFixed(2),
          reembolsoIvaLiquidado:          ivaLiquidadoReem.toFixed(2),
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
      contribuyenteRimpe, baseImponible12, baseImponible15, baseImponible5, baseImponible8,
      baseImponible0, noobjetoiva, excentoiva, ice, valorIva12, valorIva15, valorIva5,
      valorIva8, irbpnr, formaPago, totalPago, plazo, unidadTiempo, detalles, datosinfoadicional,
      reembolsos, codDocReembolso
    );
  }
}