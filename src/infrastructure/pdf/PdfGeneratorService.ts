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

      // Capturar errores de la página
      page.on('error', (err) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Error en la página de Puppeteer:', { error: message });
      });
      page.on('pageerror', (err) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Error de página en Puppeteer:', { error: message });
      });

      // Establecer contenido
      await page.setContent(html, { 
        waitUntil: 'load',  // más estable que networkidle0
        timeout: 120000 
      });

      // Generar PDF
      await page.pdf({ 
        path: outputPath, 
        format: 'A4', 
        printBackground: true,
        timeout: 180000,
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm'
        }
      });

      await page.close();

      // Verificar que el archivo se generó
      await fs.access(outputPath);
      
      return outputPath;

    } catch (error: any) {
      // Cerrar la página si existe
      if (page) {
        try { await page.close(); } catch (e) {}
      }
      // Si se creó un navegador nuevo, cerrarlo
      if (usarNuevo && browser) {
        try { await browser.close(); } catch (e) {}
      }
      
      logger.error('Error al generar PDF:', { 
        error: error.message, 
        stack: error.stack,
        usarNuevo
      });
      
      throw new AppError(`Error al generar PDF: ${error.message}`, 500);
    }
  }
}