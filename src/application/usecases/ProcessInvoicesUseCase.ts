import { ICredencialSRIRepository } from '../../domain/repositories/ICredencialSRIRepository';
import { ILogRepository } from '../../domain/repositories/ILogRepository';
import { IFacturaRepository } from '../../domain/repositories/IFacturaRepository';
import { ISriClient } from '../../domain/services/ISriClient';
import { IInvoiceParser } from '../../domain/services/IInvoiceParser';
import { IPdfGenerator } from '../../domain/services/IPdfGenerator';
import { GetClavesAccesoUseCase } from './GetClavesAccesoUseCase';

export class ProcessInvoicesUseCase {
  constructor(
    private credRepo: ICredencialSRIRepository,
    private facturaRepo: IFacturaRepository,
    private logRepo: ILogRepository,
    private sriClient: ISriClient,
    private parser: IInvoiceParser,
    private pdfGenerator: IPdfGenerator
  ) {}

  async execute(): Promise<void> {
    const credencial = await this.credRepo.obtenerCredenciales();
    if (!credencial) {
      await this.logRepo.error('No se obtuvieron credenciales SRI');
      return;
    }

    // Inicializar el cliente SOAP con las credenciales del SRI
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
        const factura = await this.parser.parse(xmlAutorizado, clave.claveAcceso);
        const rutaPdf = await this.pdfGenerator.generarFactura(factura, credencial.urlDestino);
        await this.facturaRepo.actualizarRutaPdf(clave.claveAcceso, rutaPdf);
        await this.logRepo.info(`PDF generado para ${clave.claveAcceso}`, { ruta: rutaPdf });
      } catch (error: any) {
        await this.logRepo.error(`Error con clave ${clave.claveAcceso}`, { error: error.message });
      }
    }
  }
}