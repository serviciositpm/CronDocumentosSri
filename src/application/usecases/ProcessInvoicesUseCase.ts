import { ICredencialSRIRepository } from '../../domain/repositories/ICredencialSRIRepository';
import { ILogRepository } from '../../domain/repositories/ILogRepository';
import { IFacturaRepository } from '../../domain/repositories/IFacturaRepository';
import { ISriClient } from '../../domain/services/ISriClient';
import { IInvoiceParser } from '../../domain/services/IInvoiceParser';
import { INotaDebitoParser } from '../../domain/services/INotaDebitoParser';
import { INotaCreditoParser } from '../../domain/services/INotaCreditoParser';
import { IGuiaRemisionParser } from '../../domain/services/IGuiaRemisionParser';
import { IRetencionParser } from '../../domain/services/IRetencionParser';
import { IPdfGenerator } from '../../domain/services/IPdfGenerator';
import { GetClavesAccesoUseCase } from './GetClavesAccesoUseCase';
import { obtenerCodDocDesdeClaveAcceso, TIPO_COMPROBANTE } from '../../shared/utils/claveacceso.utils';

export class ProcessInvoicesUseCase {
  constructor(
    private credRepo: ICredencialSRIRepository,
    private facturaRepo: IFacturaRepository,
    private logRepo: ILogRepository,
    private sriClient: ISriClient,
    private parser: IInvoiceParser,
    private notaDebitoParser: INotaDebitoParser,
    private notaCreditoParser: INotaCreditoParser,
    private guiaRemisionParser: IGuiaRemisionParser,
    private retencionParser: IRetencionParser,
    private pdfGenerator: IPdfGenerator
  ) {}

  async execute(): Promise<void> {
    const credencial = await this.credRepo.obtenerCredenciales();
    if (!credencial) {
      await this.logRepo.error('No se obtuvieron credenciales SRI');
      return;
    }

    await this.sriClient.initialize(credencial.ruc, credencial.password);

    const getClavesUseCase = new GetClavesAccesoUseCase(this.facturaRepo);
    const claves = await getClavesUseCase.execute();
    if (claves.length === 0) {
      await this.logRepo.info('No hay claves de acceso pendientes');
      return;
    }

    for (const clave of claves) {
      try {
        const result = await this.sriClient.autorizarComprobante(clave.claveAcceso);
        const xmlAutorizado = result.RespuestaAutorizacionComprobante.autorizaciones.autorizacion.comprobante;

        const codDoc = obtenerCodDocDesdeClaveAcceso(clave.claveAcceso);
        let rutaPdf: string;

        switch (codDoc) {
          case TIPO_COMPROBANTE.NOTA_DEBITO: {
            const notaDebito = await this.notaDebitoParser.parse(xmlAutorizado, clave.claveAcceso);
            rutaPdf = await this.pdfGenerator.generarNotaDebito(notaDebito, credencial.urlDestino);
            break;
          }
          case TIPO_COMPROBANTE.NOTA_CREDITO: {
            const notaCredito = await this.notaCreditoParser.parse(xmlAutorizado, clave.claveAcceso);
            rutaPdf = await this.pdfGenerator.generarNotaCredito(notaCredito, credencial.urlDestino);
            break;
          }
          case TIPO_COMPROBANTE.GUIA_REMISION: {
            const guiaRemision = await this.guiaRemisionParser.parse(xmlAutorizado, clave.claveAcceso);
            rutaPdf = await this.pdfGenerator.generarGuiaRemision(guiaRemision, credencial.urlDestino);
            break;
          }
          case TIPO_COMPROBANTE.RETENCION: {
            const retencion = await this.retencionParser.parse(xmlAutorizado, clave.claveAcceso);
            rutaPdf = await this.pdfGenerator.generarRetencion(retencion, credencial.urlDestino);
            break;
          }
          case TIPO_COMPROBANTE.FACTURA:
          default: {
            // Por ahora, cualquier tipo no manejado explícitamente cae aquí y
            // se intenta parsear como factura (comportamiento original).
            // A futuro, agrega más "case" aquí (guía de remisión, retención, etc.)
            const factura = await this.parser.parse(xmlAutorizado, clave.claveAcceso);
            rutaPdf = await this.pdfGenerator.generarFactura(factura, credencial.urlDestino);
            break;
          }
        }

        await this.facturaRepo.actualizarRutaPdf(clave.claveAcceso, rutaPdf);
        await this.logRepo.info(`PDF generado para ${clave.claveAcceso}`, { ruta: rutaPdf, codDoc });
      } catch (error: any) {
        await this.logRepo.error(`Error con clave ${clave.claveAcceso}`, { error: error.message });
      }
    }
  }
}