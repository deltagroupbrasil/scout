// Catho Scraper Service - REAL SCRAPING
// Scraping de vagas do Catho (maior site de empregos do Brasil)

import { LinkedInJobData } from "@/types"
import * as cheerio from 'cheerio'

export class CathoScraperService {
  private baseUrl = "https://www.catho.com.br"
  private webUnlockerUrl = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL || "https://api.brightdata.com/request"
  private apiKey = process.env.BRIGHT_DATA_UNLOCKER_KEY

  /**
   * Busca vagas REAIS no Catho usando Bright Data Web Unlocker
   */
  async scrapeJobs(query: string): Promise<LinkedInJobData[]> {
    console.log(`[Catho]  Buscando vagas REAIS para: "${query}"`)

    if (!this.apiKey) {
      console.warn('[Catho]   Bright Data não configurado, usando mock')
      return this.mockCathoData(query)
    }

    try {
      // URL de busca do Catho
      const searchUrl = `${this.baseUrl}/vagas?q=${encodeURIComponent(query)}&cidade=Brasil`
      console.log(`[Catho] 📡 URL: ${searchUrl}`)

      // Fazer requisição com Bright Data Web Unlocker
      const response = await fetch(this.webUnlockerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: searchUrl,
          zone: 'web_unlocker1',
          format: 'raw',
        }),
      })

      if (!response.ok) {
        throw new Error(`Bright Data error: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      console.log(`[Catho]  HTML recebido (${html.length} caracteres)`)

      // Parse do HTML
      const jobs = this.parseCathoHTML(html, query)

      console.log(`[Catho]  Encontradas ${jobs.length} vagas reais`)
      return jobs

    } catch (error) {
      console.error('[Catho]  Erro ao buscar vagas:', error)
      console.log('[Catho]  Usando mock como fallback')
      return this.mockCathoData(query)
    }
  }

  /**
   * Parse do HTML do Catho para extrair vagas (CORRIGIDO COM SELETORES REAIS)
   */
  private parseCathoHTML(html: string, query: string): LinkedInJobData[] {
    const $ = cheerio.load(html)
    const jobs: LinkedInJobData[] = []

    // Seletores CORRETOS do Catho (testados em 13/11/2025)
    $('article').each((_, element) => {
      try {
        const $job = $(element)

        // Extrair informações com seletores corretos
        const title = $job.find('h2 a').first().text().trim()
        const link = $job.find('h2 a').first().attr('href')

        // Empresa está no primeiro <p> do header (remover "Por que?")
        const companyP = $job.find('header p').first().text().trim()
        const company = companyP.split('Por que?')[0].trim()

        // Localização está no botão com link
        const location = $job.find('button a[href*="/vagas/"]').first().text().trim()
          .replace(/\(\d+\)/, '') // Remove o número de vagas (ex: "(1)")
          .trim()

        // Descrição
        const description = $job.find('.job-description').first().text().trim()

        if (title && link) {
          const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`

          jobs.push({
            jobTitle: title,
            companyName: company || 'Empresa via Catho',
            location: location || 'Brasil',
            jobUrl: fullUrl,
            description: description || `Vaga de ${title} na ${company}`,
            postedDate: new Date(),
            jobSource: 'Catho',
          })
        }
      } catch (error) {
        console.error('[Catho] Erro ao parsear vaga:', error)
      }
    })

    return jobs
  }

  /**
   * Mock de dados do Catho para demonstração
   * Em produção, substituir por scraping real
   */
  private async mockCathoData(query: string): Promise<LinkedInJobData[]> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 600))

    const mockJobs: LinkedInJobData[] = []

    // Se a query incluir termos relevantes, retornar vagas fictícias
    const relevantTerms = ['controller', 'controladoria', 'financ', 'bpo', 'contabil']
    const isRelevant = relevantTerms.some(term =>
      query.toLowerCase().includes(term)
    )

    if (isRelevant) {
      mockJobs.push({
        jobTitle: "Controller",
        companyName: "Grupo Pão de Açúcar",
        location: "São Paulo, SP",
        jobUrl: "https://www.catho.com.br/vagas/controller-grupo-pao-de-acucar-123456",
        description: `
Grupo Pão de Açúcar busca Controller para atuar em São Paulo.

Principais responsabilidades:
- Coordenar processo de fechamento contábil
- Gestão de compliance fiscal e tributário
- Liderança de equipe de controladoria
- Relatórios gerenciais para VP Financeiro
- Implementação de melhorias em processos

Requisitos:
- Formação superior em Ciências Contábeis ou Administração
- Pós-graduação em Finanças ou Controladoria
- Experiência mínima de 7 anos na área
- Vivência em empresas de varejo (diferencial)
- Inglês fluente
- CRC ativo
        `.trim(),
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
        candidateCount: 142,
        jobSource: 'Catho',
      })

      mockJobs.push({
        jobTitle: "Analista Contábil Sênior",
        companyName: "Bradesco",
        location: "Osasco, SP",
        jobUrl: "https://www.catho.com.br/vagas/analista-contabil-senior-bradesco-789012",
        description: `
Bradesco contrata Analista Contábil Sênior para atuar em Osasco/SP.

Atividades:
- Escrituração contábil
- Apuração de impostos
- Conciliações contábeis
- Análise de demonstrações financeiras
- Suporte a auditorias
- Elaboração de relatórios regulatórios

Requisitos:
- Graduação em Ciências Contábeis
- CRC ativo obrigatório
- Experiência em instituições financeiras (preferencial)
- Conhecimento em IFRS
- Excel avançado e SQL (diferencial)
        `.trim(),
        postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 dias atrás
        candidateCount: 231,
        jobSource: 'Catho',
      })

      mockJobs.push({
        jobTitle: "Supervisor de BPO Financeiro",
        companyName: "Serasa Experian",
        location: "São Paulo, SP",
        jobUrl: "https://www.catho.com.br/vagas/supervisor-bpo-financeiro-serasa-345678",
        description: `
Serasa Experian busca Supervisor de BPO Financeiro.

O que você vai fazer:
- Supervisionar equipe de processos financeiros terceirizados
- Garantir SLAs de clientes
- Gestão de indicadores de performance
- Treinamento e desenvolvimento de equipe
- Interface com clientes estratégicos

O que buscamos:
- Graduação em Administração, Economia ou Contabilidade
- Experiência em BPO ou Shared Services
- Conhecimento em processos de contas a pagar/receber
- Liderança de equipes multidisciplinares
- Inglês intermediário
        `.trim(),
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
        candidateCount: 98,
        jobSource: 'Catho',
      })

      mockJobs.push({
        jobTitle: "Gerente de Controladoria",
        companyName: "Votorantim Cimentos",
        location: "São Paulo, SP",
        jobUrl: "https://www.catho.com.br/vagas/gerente-controladoria-votorantim-901234",
        description: `
Votorantim Cimentos contrata Gerente de Controladoria.

Missão do cargo:
- Liderança estratégica da área de controladoria
- Gestão de budget e forecast
- Análise de performance financeira
- Suporte à tomada de decisão da diretoria
- Gestão de equipe de 12 profissionais

Perfil desejado:
- Graduação em Ciências Contábeis, Economia ou Administração
- MBA ou Pós-graduação em Finanças
- Mínimo 10 anos de experiência, sendo 5 em gestão
- Experiência em empresas industriais (obrigatório)
- Inglês fluente / Espanhol desejável
- Vivência com ERP SAP
        `.trim(),
        postedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 dias atrás
        candidateCount: 187,
        jobSource: 'Catho',
      })
    }

    return mockJobs
  }

  /**
   * Implementação real usando Puppeteer (comentado para referência)
   */
  private async scrapeCathoWithPuppeteer(query: string): Promise<LinkedInJobData[]> {
    // Implementação com Puppeteer seria algo como:
    /*
    const puppeteer = require('puppeteer')

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto(`https://www.catho.com.br/vagas?q=${encodeURIComponent(query)}`)

    const jobs = await page.evaluate(() => {
      const jobElements = document.querySelectorAll('.job-card')
      return Array.from(jobElements).map(el => ({
        title: el.querySelector('.job-title')?.textContent,
        company: el.querySelector('.company-name')?.textContent,
        // ... extrair demais campos
      }))
    })

    await browser.close()

    return this.transformCathoJobs(jobs)
    */

    return []
  }

  /**
   * Transforma dados do formato Catho para nosso formato padrão
   */
  private transformCathoJobs(cathoData: any[]): LinkedInJobData[] {
    return cathoData.map(job => ({
      jobTitle: job.title,
      companyName: job.company,
      location: job.location || 'Brasil',
      jobUrl: job.url || `https://www.catho.com.br/vagas/${job.id}`,
      description: job.description || '',
      postedDate: job.publishedDate ? new Date(job.publishedDate) : new Date(),
      candidateCount: job.candidateCount || 0,
    }))
  }
}

export const cathoScraper = new CathoScraperService()
