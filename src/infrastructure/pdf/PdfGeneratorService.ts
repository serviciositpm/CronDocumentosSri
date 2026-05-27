import { IPdfGenerator } from '../../domain/services/IPdfGenerator';
import { Factura } from '../../domain/entities/Factura';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { PuppeteerManager } from './PuppeteerManager';
import AppError from '../../shared/errors/AppError';

export class PdfGeneratorService implements IPdfGenerator {
  async generarFactura(factura: Factura, rutaDestino: string): Promise<string> {
    const templateName = factura.codDocReembolso === '41' ? 'Template_Factura_Reembolsos.html' : 'Template_Factura.html';
    const templatePath = path.join(__dirname, 'templates', templateName);
    const htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(htmlTemplate);
    const html = template(factura);
    const outputPath = path.join(rutaDestino, factura.nombrearchivo);

    const browser = await PuppeteerManager.getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
    await page.close();

    const exists = await fs.access(outputPath).then(() => true).catch(() => false);
    if (!exists) throw new AppError(`No se generó PDF: ${outputPath}`, 500);
    return outputPath;
  }
}