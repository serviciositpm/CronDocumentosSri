import { IPdfGenerator } from '../../domain/services/IPdfGenerator';
import { Factura } from '../../domain/entities/Factura';
import { NotaDebito } from '../../domain/entities/NotaDebito';
import { NotaCredito } from '../../domain/entities/NotaCredito';
import { GuiaRemision } from '../../domain/entities/GuiaRemision';
import { Retencion } from '../../domain/entities/Retencion';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import bwipjs from 'bwip-js';
import { PuppeteerManager } from './PuppeteerManager';
import puppeteer from 'puppeteer';
import AppError from '../../shared/errors/AppError';
import { logger } from '../../config/logger';

/**
 * Genera un código de barras Code39 como imagen PNG en base64
 * usando bwip-js — funciona igual en Windows y Linux sin instalar fuentes.
 */
async function generarBarcodeBase64(texto: string): Promise<string> {
  try {
    const png = await bwipjs.toBuffer({
      bcid:        'code39',       // tipo de barcode
      text:        texto,          // clave de acceso
      scale:       2,              // resolución (2 = 144dpi)
      height:      14,             // altura en mm
      includetext: false,          // el texto ya se muestra debajo del barcode
      textxalign:  'center',
    });
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (err: any) {
    logger.warn('No se pudo generar el barcode', { err: err?.message });
    return '';
  }
}

export class PdfGeneratorService implements IPdfGenerator {

  async generarFactura(factura: Factura, rutaDestino: string): Promise<string> {
    const templateName = factura.codDocReembolso === '41'
      ? 'Template_Factura_Reembolsos.html'
      : 'Template_Factura.html';
    return this.renderizarYGenerar(templateName, factura, factura.nombrearchivo, rutaDestino, factura.claveAcceso);
  }

  async generarNotaDebito(notaDebito: NotaDebito, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Nd.html', notaDebito, notaDebito.nombrearchivo, rutaDestino, notaDebito.claveAcceso);
  }

  async generarNotaCredito(notaCredito: NotaCredito, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Nc.html', notaCredito, notaCredito.nombrearchivo, rutaDestino, notaCredito.claveAcceso);
  }

  async generarGuiaRemision(guiaRemision: GuiaRemision, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Guia.html', guiaRemision, guiaRemision.nombrearchivo, rutaDestino, guiaRemision.claveAcceso);
  }

  async generarRetencion(retencion: Retencion, rutaDestino: string): Promise<string> {
    return this.renderizarYGenerar('Template_Retencion.html', retencion, retencion.nombrearchivo, rutaDestino, retencion.claveAcceso);
  }

  private async renderizarYGenerar(
    templateName: string,
    datos: any,
    nombreArchivo: string,
    rutaDestino: string,
    claveAcceso: string
  ): Promise<string> {
    const templatePath = path.join(__dirname, 'templates', templateName);

    let htmlTemplate: string;
    try {
      htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      throw new AppError(`No se pudo leer la plantilla: ${error}`, 500);
    }

    // Generar el barcode como imagen base64 ANTES de compilar el template
    const barcodeImg = await generarBarcodeBase64(claveAcceso);

    // Inyectar el barcode en los datos del template
    const datosConBarcode = { ...datos, barcodeImg };

    const template = Handlebars.compile(htmlTemplate);
    const html = template(datosConBarcode);
    const outputPath = path.join(rutaDestino, nombreArchivo);

    try {
      return await this.generarPDFConNavegador(html, outputPath, false);
    } catch (error: any) {
      logger.warn('Falló con navegador compartido, reintentando', { error: error.message });
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
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
      } else {
        browser = await PuppeteerManager.getBrowser();
      }

      page = await browser.newPage();
      page.setDefaultTimeout(180000);
      page.setDefaultNavigationTimeout(180000);

      page.on('error',     (err: unknown) => logger.error('Puppeteer page error',  { error: String(err) }));
      page.on('pageerror', (err: unknown) => logger.error('Puppeteer pageerror',   { error: String(err) }));

      await page.setContent(html, { waitUntil: 'load', timeout: 120000 });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        timeout: 180000,
        // Sin scale ni márgenes forzados: el CSS @page de la plantilla
        // controla todo el layout directamente en coordenadas de papel.
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });

      await page.close();
      await fs.access(outputPath);
      return outputPath;

    } catch (error: any) {
      logger.error('Error al generar PDF', { error: error.message, usarNuevo });
      throw new AppError(`Error al generar PDF: ${error.message}`, 500);
    } finally {
      if (page && !page.isClosed()) { try { await page.close(); } catch (_) {} }
      if (usarNuevo && browser)     { try { await browser.close(); } catch (_) {} }
    }
  }
}