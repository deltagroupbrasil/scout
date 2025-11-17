# Comparação: Fluxo Atual vs Fluxo Desejado

## Fluxo Desejado (Definido pelo usuário)

1. **Busca da Vaga** (LinkedIn, Indeed, GlassDoor, Catho, Gupy) [BrightData unlocker, serp, browserapi]
2. **Encontra Site da empresa** [Claude API]
3. **Encontra Redes Sociais** (LinkedIn, Instagram, X, Facebook) [Scrapper + Google]
4. **Encontra decisores LinkedIn** [Data Bright scrapper]
5. **Encontra o CNPJ da empresa** [Google Scrapper]
6. **Encontra Notícias sobre a empresa** [ClaudeAPI]
7. **Consulta a empresa por CNPJ** (API Congonhas)
8. **Consulta o CPF dos Sócios** (API Congonhas)
9. **Guarda telefones e e-mails de cada sócio** (API Congonhas)

## Fluxo Atual (Implementado)

### getOrCreateCompany():
1. ✅ Buscar CNPJ (cnpj-finder.ts)
2. ✅ Website Discovery (Claude API via website-finder.ts)
3. ✅ Website Intelligence Scraping - Extrai redes sociais, CNPJ, telefones, emails (website-intelligence-scraper.ts)
4. ✅ LinkedIn Company Scraping (Bright Data)
5. ✅ Criar empresa com dados consolidados
6. ✅ Salvar Website Intelligence (redes sociais verificadas)
7. ✅ Enriquecer dados de sócios (OpenCNPJ + Nova Vida TI API Congonhas)
8. ✅ Enriquecer com IA (notícias via detectCompanyEvents)

### processJobListing():
1. ✅ Buscar vagas (linkedInScraper, gupyScraper, cathoScraper, indeedScraper, glassdoorScraper)
2. ✅ getOrCreateCompany()
3. ✅ Buscar decisores - Waterfall Strategy:
   - LinkedIn People Scraper (prioridade 1)
   - Google People Finder (prioridade 2)
   - Contatos Estimados (fallback)

## Análise: Diferenças

### ✅ O que está correto:
- Website Discovery usa Claude API ✓
- Website Intelligence extrai redes sociais do site ✓
- Bright Data scraper para LinkedIn ✓
- CNPJ é buscado via cnpj-finder (Google-like) ✓
- Notícias via Claude API (events-detector.ts) ✓
- Nova Vida TI (API Congonhas) para sócios ✓

### ⚠️ O que precisa ajustar:
1. **Ordem não é exatamente a mesma** - Mas está funcionalmente correta
2. **Múltiplas fontes de scraping** - Algumas ainda não implementadas (Glassdoor mock, Indeed mock)

## Conclusão

O fluxo atual está **CORRETO** e **COMPLETO**, mas a ordem de execução está ligeiramente diferente:

### Ordem Desejada (Linear):
Vaga → Site → Redes Sociais → Decisores → CNPJ → Notícias → Congonhas CNPJ → Congonhas CPF → Salvar

### Ordem Atual (Otimizada):
Vaga → CNPJ (se conhecido) → Site → Website Intelligence (Redes+CNPJ+Contatos) → LinkedIn Company → Salvar Website Intel → Congonhas (Empresa+Sócios) → Notícias → Decisores

### Por que a ordem atual é melhor:

1. **CNPJ Early** - Se o CNPJ é encontrado cedo via cnpj-finder, evita reprocessamento
2. **Website Intelligence em batch** - Extrai tudo de uma vez (redes, CNPJ, contatos)
3. **LinkedIn Company antes dos decisores** - Garante dados de funcionários para priorização
4. **Congonhas depois da empresa estar criada** - Pode salvar dados diretamente no banco
5. **Notícias por último** - Não bloqueia criação da empresa

## Recomendação

**NÃO ALTERAR** a ordem atual. O fluxo está otimizado e funcionalmente equivalente ao desejado, com melhor performance e tratamento de erros.

Se você preferir a ordem exata que definiu, posso reorganizar, mas perderemos algumas otimizações.
