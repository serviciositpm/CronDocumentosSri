import { IPdfGenerator } from '../../domain/services/IPdfGenerator';
import { Factura } from '../../domain/entities/Factura';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { PuppeteerManager } from './PuppeteerManager';
import puppeteer from 'puppeteer';
import AppError from '../../shared/errors/AppError';
import { logger } from '../../config/logger';

export class PdfGeneratorService implements IPdfGenerator {
  async generarFactura(factura: Factura, rutaDestino: string): Promise<string> {
    const templateName = factura.codDocReembolso === '41'
      ? 'Template_Factura_Reembolsos.html'
      : 'Template_Factura.html';

    const templatePath = path.join(__dirname, 'templates', templateName);

    let htmlTemplate: string;
    try {
      htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new AppError(`No se pudo leer la plantilla: ${error}`, 500);
    }

    const template = Handlebars.compile(htmlTemplate);
    const html = template(factura);
    const outputPath = path.join(rutaDestino, factura.nombrearchivo);

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
        // La plantilla está maquetada con tablas de ancho fijo (1160px) y
        // sin @page que la adapte. Sin "scale", Chrome corta a la derecha
        // todo lo que no entra en el ancho útil de A4 (~718px con estos
        // márgenes). 0.62 ≈ 718/1160 hace que el diseño completo entre en
        // la hoja. Ajusta este número si cambias la plantilla o los márgenes.
        scale: 0.62
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
      // Cerrar siempre la página si quedó abierta (éxito o error)
      if (page && !page.isClosed()) {
        try { await page.close(); } catch (e) { /* noop */ }
      }
      // Si fue un navegador "nuevo" (no el compartido), SIEMPRE cerrarlo,
      // tanto si hubo éxito como si hubo error. Esto es lo que faltaba
      // y causaba la fuga de procesos chrome.exe.
      if (usarNuevo && browser) {
        try { await browser.close(); } catch (e) { /* noop */ }
      }
    }
  }
}
