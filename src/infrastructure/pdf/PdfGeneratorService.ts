import { IPdfGenerator } from '../../domain/services/IPdfGenerator';
import { Factura } from '../../domain/entities/Factura';
import { NotaDebito } from '../../domain/entities/NotaDebito';
import { NotaCredito } from '../../domain/entities/NotaCredito';
import { GuiaRemision } from '../../domain/entities/GuiaRemision';
import { Retencion } from '../../domain/entities/Retencion';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { PuppeteerManager } from './PuppeteerManager';
import puppeteer from 'puppeteer';
import AppError from '../../shared/errors/AppError';
import { logger } from '../../config/logger';

// Ancho de diseño de las plantillas (todas usan tablas de 1160px fijo).
// scale = (ancho útil de A4 con márgenes de 10mm) / 1160 ≈ 0.62
const ESCALA_PDF = 0.62;

export class PdfGeneratorService implements IPdfGenerator {
  async generarFactura(factura: Factura, rutaDestino: string): Promise<string> {
    const templateName = factura.codDocReembolso === '41'
      ? 'Template_Factura_Reembolsos.html'
      : 'Template_Factura.html';

    return this.renderizarYGenerar(templateName, factura, factura.nombrearchivo, rutaDestino);
  }

  async generarNotaDebito(notaDebito: NotaDebito, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Nd.html', notaDebito, notaDebito.nombrearchivo, rutaDestino);
  }

  async generarGuiaRemision(guiaRemision: GuiaRemision, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Guia.html', guiaRemision, guiaRemision.nombrearchivo, rutaDestino);
  }

  async generarNotaCredito(notaCredito: NotaCredito, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Nc.html', notaCredito, notaCredito.nombrearchivo, rutaDestino);
  }
  async generarRetencion(retencion: Retencion, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Retencion.html', retencion, retencion.nombrearchivo, rutaDestino);
  }

  private async renderizarYGenerar(
    templateName: string,
    datos: unknown,
    nombreArchivo: string,
    rutaDestino: string
  ): Promise<string> {
    const templatePath = path.join(__dirname, 'templates', templateName);

    let htmlTemplate: string;
    try {
      htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new AppError(`No se pudo leer la plantilla: ${error}`, 500);
    }

    const template = Handlebars.compile(htmlTemplate);
    const html = template(datos);
    const outputPath = path.join(rutaDestino, nombreArchivo);

    // Intentar primero con el navegador compartido
    try {
      return await this.generarPDFConNavegador(html, outputPath, false);
    } catch (error: any) {
      logger.warn('Falló con navegador compartido, intentando con uno nuevo', { error: error.message });
      // Fallback: usar un navegador nuevo
      return await this.generarPDFConNavegador(html, outputPath, true);
    }
  }

  private async generarPDFConNavegador(html: string, outputPath: string, usarNuevo: boolean): Promise<string> {
    let browser;
    let page;
    try {
      if (usarNuevo) {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } else {
        browser = await PuppeteerManager.getBrowser();
      }

      page = await browser.newPage();
      page.setDefaultTimeout(180000);
      page.setDefaultNavigationTimeout(180000);

      page.on('error', (err) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Error en la página de Puppeteer:', { error: message });
      });
      page.on('pageerror', (err) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Error de página en Puppeteer:', { error: message });
      });

      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 120000
      });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        timeout: 180000,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        scale: ESCALA_PDF
      });

      await page.close();
      await fs.access(outputPath);

      return outputPath;

    } catch (error: any) {
      logger.error('Error al generar PDF:', {
        error: error.message,
        stack: error.stack,
        usarNuevo
      });
      throw new AppError(`Error al generar PDF: ${error.message}`, 500);

    } finally {
      if (page && !page.isClosed()) {
        try { await page.close(); } catch (e) { /* noop */ }
      }
      if (usarNuevo && browser) {
        try { await browser.close(); } catch (e) { /* noop */ }
      }
    }
  }
}