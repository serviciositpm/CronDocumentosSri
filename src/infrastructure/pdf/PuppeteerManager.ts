import puppeteer, { Browser } from 'puppeteer';
import AppError from '../../shared/errors/AppError';

export class PuppeteerManager {
  private static browser: Browser | null = null;

  static async getBrowser(): Promise<Browser> {
    if (!PuppeteerManager.browser || !PuppeteerManager.browser.connected) {
      PuppeteerManager.browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          // '--single-process' fue removido: es inestable bajo carga y
          // suele ser la causa de errores "Target closed" intermitentes.
          '--disable-accelerated-2d-canvas',
        ]
      });

      // Si el navegador se cae solo (crash), limpiamos la referencia
      // para que el próximo getBrowser() lance uno nuevo en vez de
      // quedarse intentando usar uno muerto.
      PuppeteerManager.browser.on('disconnected', () => {
        PuppeteerManager.browser = null;
      });
    }
    return PuppeteerManager.browser;
  }

  static async close(): Promise<void> {
    if (PuppeteerManager.browser) {
      await PuppeteerManager.browser.close();
      PuppeteerManager.browser = null;
    }
  }
}
