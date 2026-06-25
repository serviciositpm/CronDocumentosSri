import cron from 'node-cron';
import { ProcessInvoicesUseCase } from './application/usecases/ProcessInvoicesUseCase';
import { CredencialSRIRepositorySQL } from './infrastructure/database/sql/CredencialSRIRepositorySQL';
import { FacturaRepositorySQL } from './infrastructure/database/sql/FacturaRepositorySQL';
import { LogRepositoryMongo } from './infrastructure/database/mongodb/LogRepositoryMongo';
import { SriSoapClient } from './infrastructure/webservices/SriSoapClient';
import { XmlToInvoiceParser } from './infrastructure/parsing/XmlToInvoiceParser';
import { XmlToNotaDebitoParser } from './infrastructure/parsing/XmlToNotaDebitoParser';
import { XmlToNotaCreditoParser } from './infrastructure/parsing/XmlToNotaCreditoParser';
import { XmlToGuiaRemisionParser } from './infrastructure/parsing/XmlToGuiaRemisionParser';
import { PdfGeneratorService } from './infrastructure/pdf/PdfGeneratorService';
import MongoConnection from './infrastructure/database/mongodb/MongoConnection';
import { logger } from './config/logger';
import SqlConnection from './infrastructure/database/sql/SqlConnection';

async function main() {
  try {
    await MongoConnection.connect();
    await SqlConnection.getPool();

    const credRepo = new CredencialSRIRepositorySQL();
    const facturaRepo = new FacturaRepositorySQL();
    const logRepo = new LogRepositoryMongo();
    const sriClient = new SriSoapClient();
    const parser = new XmlToInvoiceParser();
    const notaDebitoParser = new XmlToNotaDebitoParser();
    const notaCreditoParser = new XmlToNotaCreditoParser();
    const guiaRemisionParser = new XmlToGuiaRemisionParser();
    const pdfGen = new PdfGeneratorService();

    const processUseCase = new ProcessInvoicesUseCase(
      credRepo, facturaRepo, logRepo, sriClient, parser, notaDebitoParser, notaCreditoParser, guiaRemisionParser, pdfGen
    );

    let isRunning = false;

    cron.schedule('* * * * *', async () => {
      if (isRunning) {
        logger.warn('Ciclo anterior aún en ejecución, se omite este tick');
        return;
      }
      isRunning = true;
      try {
        logger.info('Iniciando ciclo de procesamiento');
        await processUseCase.execute();
      } catch (error) {
        logger.error('Error en el ciclo de procesamiento', { error });
      } finally {
        isRunning = false;
      }
    });

    logger.info('Servicio iniciado. Esperando tareas...');
  } catch (error) {
    logger.error('Error al iniciar la aplicación', { error });
    process.exit(1);
  }
}

main();