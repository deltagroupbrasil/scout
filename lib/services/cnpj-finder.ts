// CNPJ Finder Service
// Busca CNPJ de empresas brasileiras usando APIs públicas e database de CNPJs conhecidos

// Database de CNPJs de empresas grandes brasileiras conhecidas
const KNOWN_CNPJS: Record<string, string> = {
  // Varejo (12 empresas)
  'magazine luiza': '47960950000121',
  'magazineluiza': '47960950000121',
  'magalu': '47960950000121',
  'lojas americanas': '33014556001096',
  'americanas': '33014556001096',
  'via varejo': '33041260000113',
  'casas bahia': '59438910000132',
  'ponto frio': '00795608000144',
  'carrefour': '45543915009072',
  'pao de acucar': '47508411042824',
  'grupo pao de acucar': '47508411042824',
  'extra': '47508411042824',
  'renner': '92754738000162',
  'c&a': '45242914000105',
  'riachuelo': '33042730000104',
  'mercado livre': '10573521000191',

  // Indústria (12 empresas)
  'petrobras': '33000167000101',
  'vale': '33592510000154',
  'ambev': '02808708000169',
  'natura': '71673990000177',
  'embraer': '07689002000189',
  'gerdau': '33611500000184',
  'usiminas': '60894730000102',
  'braskem': '42150391000110',
  'suzano': '16404287000155',
  'klabin': '89637490000145',
  'csn': '33042730000104',
  'ultrapar': '33256439000139',

  // Bancos e Financeiras (10 empresas)
  'banco do brasil': '00000000000191',
  'bradesco': '60746948000112',
  'itau': '60701190000104',
  'santander': '90400888000142',
  'caixa economica': '00360305000104',
  'btg pactual': '30306294000145',
  'inter': '00416968000101',
  'nubank': '18236120000158',
  'xp': '02332886000104',
  'safra': '58160789000128',

  // Tecnologia (12 empresas)
  'totvs': '53113791000122',
  'stefanini': '58069360000120',
  'ci&t': '02380557000165',
  'locaweb': '02550477000162',
  'movile': '09345250000138',
  'stone': '16501555000157',
  'pagseguro': '08561701000101',
  'positivo': '81243735000148',
  'tempo assist': '02127738000174',
  'senior': '80138731000135',
  'linx': '06948969000102',
  'senior sistemas': '80138731000135',

  // Saúde (8 empresas)
  'grupo fleury': '60840055000131',
  'dasa': '61486650000183',
  'rede dor': '29585447000160',
  'hapvida': '02748406000197',
  'unimed': '06981794000156',
  'amil': '29309127000182',
  'sulamerica': '01685053000104',
  'notredame intermédica': '43162590000100',

  // Alimentos e Bebidas (10 empresas)
  'brf': '01838723000127',
  'jbs': '02916265000160',
  'marfrig': '03853896000140',
  'minerva': '67620377000141',
  'coca cola': '61186888000184',
  'nestle': '60409075001152',
  'unilever': '61068276000171',
  'seara': '01838723000127',
  'sadia': '01838723000127',
  'perdigao': '01838723000127',

  // Energia e Utilities (8 empresas)
  'eletrobras': '00001180000126',
  'cemig': '17155730000164',
  'copel': '76483817000120',
  'light': '60444437000168',
  'equatorial': '03220438000143',
  'neoenergia': '01083200000118',
  'enel': '08730650000145',
  'aes': '04128563000113',

  // Telecomunicações (6 empresas)
  'vivo': '02558157000162',
  'claro': '40432544000147',
  'tim': '02421421000111',
  'oi': '76535764000143',
  'embratel': '33530486000107',
  'nextel': '66970229000178',
}

export class CNPJFinderService {
  /**
   * Busca CNPJ por nome da empresa
   * 1. Tenta database local de CNPJs conhecidos
   * 2. Tenta APIs públicas (CNPJA)
   */
  async findCNPJByName(companyName: string): Promise<string | null> {
    try {
      console.log(`[CNPJ Finder] Buscando CNPJ para: "${companyName}"`)

      // 1. Verificar database de CNPJs conhecidos
      const knownCNPJ = this.searchKnownCNPJs(companyName)
      if (knownCNPJ) {
        console.log(`✅ [CNPJ Finder] CNPJ encontrado no database local: ${knownCNPJ}`)
        return knownCNPJ
      }

      // 2. Limpar nome da empresa (remover S.A., LTDA, etc)
      const cleanName = this.cleanCompanyName(companyName)

      // 3. Tentar buscar via CNPJA API (desabilitado por enquanto - APIs públicas requerem chave)
      // const cnpj = await this.searchViaCNPJA(cleanName)
      // if (cnpj) {
      //   console.log(`✅ [CNPJ Finder] CNPJ encontrado via API: ${cnpj}`)
      //   return cnpj
      // }

      console.log(`⚠️  [CNPJ Finder] CNPJ não encontrado para: "${companyName}"`)
      return null
    } catch (error) {
      console.error('[CNPJ Finder] Erro ao buscar CNPJ:', error)
      return null
    }
  }

  /**
   * Busca CNPJ no database local de empresas conhecidas
   */
  private searchKnownCNPJs(companyName: string): string | null {
    const normalized = this.normalizeCompanyName(companyName)

    // Busca exata
    if (KNOWN_CNPJS[normalized]) {
      return KNOWN_CNPJS[normalized]
    }

    // Busca parcial (pegar primeira empresa que contém o termo)
    for (const [key, cnpj] of Object.entries(KNOWN_CNPJS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return cnpj
      }
    }

    return null
  }

  /**
   * Normaliza nome da empresa para busca no database
   */
  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
  }

  /**
   * Busca CNPJ via CNPJA API (permite busca por nome)
   * https://cnpja.com/docs/
   * API gratuita: 3 requests/minuto
   */
  private async searchViaCNPJA(companyName: string): Promise<string | null> {
    try {
      // CNPJA permite busca por razão social ou nome fantasia
      const searchTerm = encodeURIComponent(companyName)

      // Endpoint de busca (gratuito, mas com rate limit)
      const response = await fetch(
        `https://api.cnpja.com/companies?name=${searchTerm}`,
        {
          headers: {
            'User-Agent': 'LeapScout/1.0',
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.log(`[CNPJA] Status ${response.status}, tentando variações...`)
        return await this.tryNameVariations(companyName)
      }

      const data = await response.json()

      // API retorna array de empresas
      if (Array.isArray(data) && data.length > 0) {
        // Pegar a primeira empresa que mais se aproxima do nome
        const bestMatch = data.find((company: any) =>
          this.namesMatch(companyName, company.name || company.alias)
        )

        if (bestMatch && bestMatch.tax_id) {
          return this.formatCNPJ(bestMatch.tax_id)
        }

        // Se não encontrou match exato, pegar o primeiro resultado
        if (data[0].tax_id) {
          console.log(`⚠️  Match aproximado: "${data[0].name}"`)
          return this.formatCNPJ(data[0].tax_id)
        }
      }

      return await this.tryNameVariations(companyName)
    } catch (error) {
      console.error('[CNPJ Finder] Erro ao buscar via CNPJA:', error)
      return null
    }
  }

  /**
   * Tenta variações do nome da empresa
   */
  private async tryNameVariations(companyName: string): Promise<string | null> {
    // Tentar apenas com primeiras palavras (nome principal)
    const mainName = companyName.split(' ').slice(0, 2).join(' ')

    // Variações comuns
    const variations = [
      mainName,
      companyName.toUpperCase(),
      this.cleanCompanyName(companyName),
    ]

    for (const variation of variations) {
      if (variation === companyName) continue // Já tentou

      try {
        const searchTerm = encodeURIComponent(variation)
        const response = await fetch(
          `https://api.cnpja.com/companies?name=${searchTerm}`,
          {
            headers: {
              'User-Agent': 'LeapScout/1.0',
              'Accept': 'application/json',
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0 && data[0].tax_id) {
            console.log(`✅ Encontrado com variação: "${variation}"`)
            return this.formatCNPJ(data[0].tax_id)
          }
        }

        // Rate limit: aguardar 1 segundo entre tentativas
        await this.sleep(1000)
      } catch (error) {
        // Continuar tentando outras variações
        continue
      }
    }

    return null
  }

  /**
   * Extrai CNPJ de URL do LinkedIn (algumas empresas incluem CNPJ na URL)
   */
  extractCNPJFromURL(url?: string): string | null {
    if (!url) return null

    // Buscar padrão de CNPJ na URL: 14 dígitos
    const cnpjPattern = /\d{14}/g
    const matches = url.match(cnpjPattern)

    if (matches && matches.length > 0) {
      return this.formatCNPJ(matches[0])
    }

    return null
  }

  /**
   * Limpa nome da empresa removendo sufixos comuns
   */
  private cleanCompanyName(name: string): string {
    return name
      .replace(/\s+(S\.A\.?|LTDA\.?|S\/A|ME|EPP|EIRELI)$/gi, '')
      .replace(/\s+\-\s+.*$/, '') // Remove tudo após " - "
      .trim()
  }

  /**
   * Normaliza nome para busca (remove acentos, caracteres especiais)
   */
  private normalizeForSearch(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '+') // Substitui espaços por +
      .toUpperCase()
  }

  /**
   * Verifica se dois nomes de empresa são similares
   */
  private namesMatch(name1: string, name2: string): boolean {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')

    const n1 = normalize(name1)
    const n2 = normalize(name2)

    // Match exato
    if (n1 === n2) return true

    // Match parcial (um contém o outro)
    if (n1.includes(n2) || n2.includes(n1)) return true

    // Match por palavras principais (primeiras 2 palavras)
    const words1 = n1.split(/\s+/).slice(0, 2).join('')
    const words2 = n2.split(/\s+/).slice(0, 2).join('')

    return words1 === words2
  }

  /**
   * Formata CNPJ removendo caracteres especiais
   */
  private formatCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '').padStart(14, '0')
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const cnpjFinder = new CNPJFinderService()
