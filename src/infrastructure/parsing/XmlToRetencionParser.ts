import { IRetencionParser } from '../../domain/services/IRetencionParser';
import { Retencion, DetalleRetencion } from '../../domain/entities/Retencion';
import xml2js from 'xml2js';
import { descCodDocSustento, descCodigoImpuesto } from '../../shared/utils/catalogosri.utils';


export class XmlToRetencionParser implements IRetencionParser {
  async parse(xmlResponse: string, claveAcceso: string): Promise<Retencion> {
    const parsed = await xml2js.parseStringPromise(xmlResponse);
    const retNode = parsed.comprobanteRetencion;
    if (!retNode) throw new Error('No es un Comprobante de Retención');

    const infoTributaria = retNode.infoTributaria[0];
    const infoCompRetencion = retNode.infoCompRetencion[0];

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

    // infoCompRetencion
    const fechaEmision = infoCompRetencion.fechaEmision[0];
    // El XML autorizado no trae "fechaAut" como tag propio: es la fecha de
    // autorización que viene en el sobre <comprobanteRetencion><autorizacion>,
    // no dentro de infoCompRetencion. Si tu cliente SOAP la expone en otro
    // nodo del response, ajusta esta línea; por ahora caemos a fechaEmision.
    const fechaAut = retNode.fechaAutorizacion?.[0] || fechaEmision;
    const dirEstablecimiento = infoCompRetencion.dirEstablecimiento?.[0] || dirMatriz;
    const contribuyenteEspecial = infoCompRetencion.contribuyenteEspecial?.[0] || 'NO ES CONTRIBUYENTE ESPECIAL';
    const obligadoContabilidad = infoCompRetencion.obligadoContabilidad?.[0] || 'NO';
    const tipoIdentificacionSujetoRetenido = infoCompRetencion.tipoIdentificacionSujetoRetenido[0];
    const razonSocialSujetoRetenido = infoCompRetencion.razonSocialSujetoRetenido[0];
    const identificacionSujetoRetenido = infoCompRetencion.identificacionSujetoRetenido[0];
    const periodoFiscal = infoCompRetencion.periodoFiscal[0];

    // Detectar versión del esquema. Hay dos versiones vigentes del SRI:
    //   V1.0.0 (pre-noviembre 2022): detalle bajo <impuestos><impuesto>
    //   V2.0.0 (ATS, desde noviembre 2022): detalle bajo <docsSustento><docSustento>
    // Leemos primero el atributo version="..." del XML; si no viene (algunos
    // emisores lo omiten), determinamos la versión por la presencia de nodos.
    const version = retNode.$?.version || '';
    const esV2 = version.startsWith('2') || !!retNode.docsSustento?.[0]?.docSustento?.length;

    const detalles: DetalleRetencion[] = [];
    let totalRetenido = 0;

    if (esV2) {
      // --- V2.0.0: retenciones anidadas dentro de cada docSustento ---
      const docsSustentoNode = retNode.docsSustento?.[0]?.docSustento || [];
      for (const doc of docsSustentoNode) {
        const codDocSustento = doc.codDocSustento?.[0] || '';
        const numDocSustento = doc.numDocSustento?.[0] || '';
        const fechaEmisionDocSustento = doc.fechaEmisionDocSustento?.[0] || '';
        const retencionesNode = doc.retenciones?.[0]?.retencion || [];
        for (const ret of retencionesNode) {
          const codImp = ret.codigo[0];
          const valorRetenido = parseFloat(ret.valorRetenido[0]);
          detalles.push({
            codDocSustento,
            descDocSustento: descCodDocSustento(codDocSustento),
            numDocSustento,
            fechaEmisionDocSustento,
            codigoImpuesto: codImp,
            descImpuesto: descCodigoImpuesto(codImp),
            codigoRetencion: ret.codigoRetencion[0],
            baseImponible: parseFloat(ret.baseImponible[0]),
            porcentajeRetener: parseFloat(ret.porcentajeRetener[0]),
            valorRetenido
          });
          totalRetenido += valorRetenido;
        }
      }
    } else {
      // --- V1.0.0: retenciones directamente bajo <impuestos><impuesto> ---
      // Usado por bancos y emisores con el formato antiguo. Los campos de
      // docSustento son opcionales en este esquema; pueden venir o no.
      const impuestosNode = retNode.impuestos?.[0]?.impuesto || [];
      for (const imp of impuestosNode) {
        const codDoc = imp.codDocSustento?.[0] || '';
        const codImp = imp.codigo[0];
        const valorRetenido = parseFloat(imp.valorRetenido[0]);
        detalles.push({
          codDocSustento: codDoc,
          descDocSustento: descCodDocSustento(codDoc),
          numDocSustento: imp.numDocSustento?.[0] || '',
          fechaEmisionDocSustento: imp.fechaEmisionDocSustento?.[0] || '',
          codigoImpuesto: codImp,
          descImpuesto: descCodigoImpuesto(codImp),
          codigoRetencion: imp.codigoRetencion[0],
          baseImponible: parseFloat(imp.baseImponible[0]),
          porcentajeRetener: parseFloat(imp.porcentajeRetener[0]),
          valorRetenido
        });
        totalRetenido += valorRetenido;
      }
    }

    // Información adicional
    const datosinfoadicional: Array<{ campo: string; valorcampo: string }> = [];
    if (retNode.infoAdicional?.[0]?.campoAdicional) {
      for (const campo of retNode.infoAdicional[0].campoAdicional) {
        datosinfoadicional.push({
          campo: campo.$.nombre,
          valorcampo: campo._
        });
      }
    }

    const nombrearchivo = `${ruc}-${estab}-${ptoEmi}-${secuencial}.pdf`;

    return new Retencion(
      nombrearchivo,
      ruc, claveAcceso, infoTributaria.codDoc[0], estab, ptoEmi, secuencial, dirMatriz,
      razonSocial, nombreComercial, ambiente, tipoEmision,
      agenteRetencion, cadenaAgenteRetencion, contribuyenteRimpe,
      fechaEmision, fechaAut, dirEstablecimiento, contribuyenteEspecial, obligadoContabilidad,
      tipoIdentificacionSujetoRetenido, razonSocialSujetoRetenido, identificacionSujetoRetenido, periodoFiscal,
      detalles, totalRetenido, datosinfoadicional
    );
  }
}