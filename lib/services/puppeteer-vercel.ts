/**
 * Puppeteer configurado para Vercel Serverless
 * Usa puppeteer-core + @sparticuz/chromium-min
 */

import type { Browser, Page } from 'puppeteer-core'

export class PuppeteerVercelService {
  private browser: Browser | null = null

  /**
   * Lança o browser (compatível com Vercel)
   */
  async launchBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser
    }

    const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

    if (isVercel) {
      console.log('[Puppeteer] 🚀 Iniciando no Vercel com chromium-min...')

      // Importar dinamicamente para não quebrar em dev
      const puppeteerCore = await import('puppeteer-core')
      const chromium = await import('@sparticuz/chromium-min')

      this.browser = await puppeteerCore.default.launch({
        args: chromium.default.args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.default.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
        ),
        headless: true,
      })

      console.log('[Puppeteer] ✅ Browser iniciado no Vercel')
    } else {
      console.warn('[Puppeteer] ⚠️  Puppeteer não disponível fora do Vercel')
      throw new Error('Puppeteer só funciona em produção (Vercel). Use a API pública para desenvolvimento local.')
    }

    return this.browser
  }

  /**
   * Cria uma nova página
   */
  async newPage(): Promise<Page> {
    const browser = await this.launchBrowser()
    return browser.newPage()
  }

  /**
   * Fecha o browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log('[Puppeteer] 🔒 Browser fechado')
    }
  }

  /**
   * Scrape uma URL com retry
   */
  async scrapePage(url: string, options?: {
    waitFor?: string
    timeout?: number
    retries?: number
  }): Promise<string> {
    const { waitFor, timeout = 30000, retries = 2 } = options || {}

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Puppeteer] 🔄 Tentativa ${attempt + 1}/${retries + 1}...`)
        }

        const page = await this.newPage()

        try {
          await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout
          })

          if (waitFor) {
            await page.waitForSelector(waitFor, { timeout: 5000 })
          }

          const html = await page.content()
          await page.close()

          console.log(`[Puppeteer] ✅ Scraped ${html.length} caracteres`)
          return html
        } catch (error) {
          await page.close()
          throw error
        }
      } catch (error) {
        lastError = error as Error
        console.error(`[Puppeteer] ❌ Erro na tentativa ${attempt + 1}:`, error)

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.log(`[Puppeteer] ⏳ Aguardando ${delay}ms antes de retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`Falha ao scrape após ${retries + 1} tentativas: ${lastError?.message}`)
  }
}

export const puppeteerVercel = new PuppeteerVercelService()
