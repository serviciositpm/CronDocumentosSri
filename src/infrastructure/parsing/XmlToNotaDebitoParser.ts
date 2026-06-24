import { INotaDebitoParser } from '../../domain/services/INotaDebitoParser';
import { NotaDebito, Motivo } from '../../domain/entities/NotaDebito';
import xml2js from 'xml2js';

export class XmlToNotaDebitoParser implements INotaDebitoParser {
  async parse(xmlResponse: string, claveAcceso: string): Promise<NotaDebito> {
    const parsed = await xml2js.parseStringPromise(xmlResponse);
    const ndNode = parsed.notaDebito;
    if (!ndNode) throw new Error('No es una Nota de Débito');

    const infoTributaria = ndNode.infoTributaria[0];
    const infoNotaDebito = ndNode.infoNotaDebito[0];

    // infoTributaria (igual criterio que XmlToInvoiceParser)
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

    // infoNotaDebito
    const fechaEmision = infoNotaDebito.fechaEmision[0];
    const dirEstablecimiento = infoNotaDebito.dirEstablecimiento?.[0] || dirMatriz;
    const contribuyenteEspecial = infoNotaDebito.contribuyenteEspecial?.[0] || 'NO ES CONTRIBUYENTE ESPECIAL';
    const obligadoContabilidad = infoNotaDebito.obligadoContabilidad?.[0] || 'NO';
    const tipoIdentificacionComprador = infoNotaDebito.tipoIdentificacionComprador[0];
    const razonSocialComprador = infoNotaDebito.razonSocialComprador[0];
    const identificacionComprador = infoNotaDebito.identificacionComprador[0];
    const codDocModificado = infoNotaDebito.codDocModificado[0];
    const numDocModificado = infoNotaDebito.numDocModificado[0];
    const fechaEmisionDocSustento = infoNotaDebito.fechaEmisionDocSustento[0];
    const totalSinImpuestos = parseFloat(infoNotaDebito.totalSinImpuestos[0]);
    const valorTotal = parseFloat(infoNotaDebito.valorTotal[0]);

    // Impuestos: a diferencia de Factura, aquí van directo bajo <impuestos><impuesto>
    // (no anidados en totalConImpuestos)
    let baseImponible15 = 0, baseImponible5 = 0, baseImponible0 = 0;
    let noobjetoiva = 0, excentoiva = 0, ice = 0, valorIva15 = 0, valorIva5 = 0, irbpnr = 0;
    const impuestosNode = infoNotaDebito.impuestos?.[0]?.impuesto;
    if (impuestosNode) {
      for (const imp of impuestosNode) {
        const codigo = imp.codigo[0];
        const codigoPorcentaje = imp.codigoPorcentaje[0];
        const base = parseFloat(imp.baseImponible[0]);
        const valImp = parseFloat(imp.valor[0]);
        if (codigo === '3') ice = valImp;       // ICE
        if (codigo === '5') irbpnr = valImp;    // IRBPNR
        switch (codigoPorcentaje) {
          case '0': baseImponible0 = base; break;
          case '4': baseImponible15 = base; valorIva15 = valImp; break;
          case '5': baseImponible5 = base; valorIva5 = valImp; break;
          case '6': noobjetoiva = base; break;
          case '7': excentoiva = base; break;
        }
      }
    }

    // Motivos (equivalente a los "detalles" de la factura)
    const motivos: Motivo[] = [];
    const motivosNode = ndNode.motivos?.[0]?.motivo;
    if (motivosNode) {
      for (const m of motivosNode) {
        motivos.push({
          razon: m.razon[0],
          valor: parseFloat(m.valor[0])
        });
      }
    }

    // Información adicional (mismo criterio que Factura)
    const datosinfoadicional: Array<{ campo: string; valorcampo: string }> = [];
    if (ndNode.infoAdicional?.[0]?.campoAdicional) {
      for (const campo of ndNode.infoAdicional[0].campoAdicional) {
        datosinfoadicional.push({
          campo: campo.$.nombre,
          valorcampo: campo._
        });
      }
    }

    const nombrearchivo = `${ruc}-${estab}-${ptoEmi}-${secuencial}.pdf`;

    return new NotaDebito(
      nombrearchivo,
      ruc, claveAcceso, infoTributaria.codDoc[0], estab, ptoEmi, secuencial, dirMatriz,
      razonSocial, nombreComercial, ambiente, tipoEmision, agenteRetencion, cadenaAgenteRetencion,
      contribuyenteRimpe,
      fechaEmision, dirEstablecimiento, contribuyenteEspecial, obligadoContabilidad,
      tipoIdentificacionComprador, razonSocialComprador, identificacionComprador,
      codDocModificado, numDocModificado, fechaEmisionDocSustento, totalSinImpuestos,
      baseImponible15, baseImponible5, baseImponible0, noobjetoiva, excentoiva, ice,
      valorIva15, valorIva5, irbpnr, valorTotal,
      motivos, datosinfoadicional
    );
  }
}