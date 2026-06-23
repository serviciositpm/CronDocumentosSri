import puppeteer, { Browser } from 'puppeteer';
import AppError from '../../shared/errors/AppError';

export class PuppeteerManager {
  private static browser: Browser | null = null;

  static async getBrowser(): Promise<Browser> {
    if (!PuppeteerManager.browser) {
      PuppeteerManager.browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--disable-accelerated-2d-canvas',
          //`--user-data-dir=${path.join(process.cwd(), 'chrome_cache')}`
        ]
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