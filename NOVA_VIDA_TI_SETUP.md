# 🔧 Configuração da API Nova Vida TI

**Data**: 17/11/2025
**Status**: Pronto para configuração

---

## 📋 Visão Geral

A API Nova Vida TI permite buscar contatos reais de decisores em empresas brasileiras através do CNPJ. É usada no LeapScout para enriquecer leads com:

- Telefones corporativos e celulares
- Emails de decisores (CFO, Controladores, etc)
- Dados dos sócios/administradores
- WhatsApp corporativo

**Custo**: R$ 0.06 por consulta

---

## 🔑 Como Obter Credenciais

### 1. Contato Comercial

Entre em contato com a Nova Vida TI para contratar o serviço:

- **Website**: https://novavidati.com.br/
- **API**: https://novavidati.com.br/api-consultas/
- **Telefone**: (contatar via site)

### 2. Credenciais Necessárias

Após contratar, você receberá 3 credenciais:

1. **USUARIO**: Seu nome de usuário
2. **SENHA**: Sua senha de acesso
3. **CLIENTE**: Código do cliente

---

## ⚙️ Configuração no LeapScout

### Passo 1: Adicionar no `.env`

Abra o arquivo `.env` na raiz do projeto e preencha:

```env
# Nova Vida TI - API Congonhas (Consultas CNPJ/CPF - R$ 0.06 por consulta)
NOVA_VIDA_TI_USUARIO="seu_usuario_aqui"
NOVA_VIDA_TI_SENHA="sua_senha_aqui"
NOVA_VIDA_TI_CLIENTE="seu_codigo_cliente_aqui"
```

**Exemplo**:
```env
NOVA_VIDA_TI_USUARIO="joao.silva@empresa.com"
NOVA_VIDA_TI_SENHA="minhaSenha123"
NOVA_VIDA_TI_CLIENTE="12345"
```

### Passo 2: Reiniciar o servidor

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm run dev
```

---

## 🧪 Testar a Integração

### Teste 1: Análise da Resposta Base64

Se você recebeu uma string Base64 da API:

```bash
npx tsx scripts/analyze-novavidati-response.ts
```

### Teste 2: Teste Completo com Empresas Reais

```bash
npx tsx scripts/test-novavidati-real.ts
```

Este script testa:
- Geração de token
- Consulta de empresa por CNPJ
- Busca de contatos dos sócios
- Cálculo de custos

**Exemplo de saída esperada**:

```
============================================================
🧪 TESTE DE INTEGRAÇÃO NOVA VIDA TI
============================================================

────────────────────────────────────────────────────────────
📋 Testando: Magazine Luiza
   CNPJ: 00000000000191
   Teste com empresa conhecida
────────────────────────────────────────────────────────────

🔑 [Nova Vida TI] Gerando novo token...
   ✅ Token gerado com sucesso

💼 [Nova Vida TI] Enriquecendo: Magazine Luiza
   CNPJ: 00.000.000/0001-91
   ✅ Dados enriquecidos:
      Razão Social: MAGAZINE LUIZA S.A.
      Telefones: 3
      Emails: 2
      Sócios: 5

✅ DADOS ENRIQUECIDOS:
────────────────────────────────────────────────────────────

📊 Dados Cadastrais:
   Razão Social: MAGAZINE LUIZA S.A.
   Nome Fantasia: Magazine Luiza
   Porte: DEMAIS
   Capital Social: R$ 1.450.000.000
   Funcionários: 45000
   Data Abertura: 16/11/1992

📞 Contatos da Empresa:
   Telefones: 3
      1. (11) 3555-1234
      2. (11) 3555-5678
      3. (16) 3509-9000
   Emails: 2
      1. ri@magazineluiza.com.br
      2. contato@magazineluiza.com.br
   WhatsApp: 1
      1. (11) 98765-4321

👔 Sócios/Decisores: 5

   1. LUIZA HELENA TRAJANO INACIO RODRIGUES
      Cargo: Presidente do Conselho
      Participação: 5.23%
      Telefones: 1
         📱 (16) 99999-9999
      Emails: 1
         📧 luiza.trajano@magazineluiza.com.br

   2. FREDERICO TRAJANO INÁCIO RODRIGUES
      Cargo: CEO
      Participação: 3.18%
      Telefones: 1
         📱 (11) 98888-8888
      Emails: 1
         📧 frederico.trajano@magazineluiza.com.br

────────────────────────────────────────────────────────────
📈 TOTAL DE CONTATOS ENCONTRADOS: 12
────────────────────────────────────────────────────────────

   💰 [Nova Vida TI] 6 consultas - Custo total: R$ 0.36
```

---

## 📊 Como Funciona

### 1. Fluxo de Enriquecimento

```
Lead com CNPJ
  ↓
GerarTokenJson (autenticação)
  ↓
NVCHECKJson com CNPJ (dados da empresa)
  ↓
Para cada sócio encontrado:
  NVCHECKJson com CPF (contatos do sócio)
  ↓
Salvar contatos no Lead
  ↓
Registrar custo (R$ 0.06 × número de consultas)
```

### 2. Integração no Lead Orchestrator

O serviço já está integrado em `lib/services/lead-orchestrator.ts`:

```typescript
// Enriquecimento com Nova Vida TI
const novaVidaData = await novaVidaTIEnrichment.enrichCompanyContacts(
  company.cnpj!,
  company.name
)

// Criar contatos sugeridos com dados reais
if (novaVidaData && novaVidaData.socios.length > 0) {
  const decisionMaker = novaVidaData.socios[0] // Primeiro sócio

  suggestedContacts.push({
    name: decisionMaker.nome,
    role: decisionMaker.qualificacao,
    email: decisionMaker.emails[0] || null,
    linkedin: decisionMaker.linkedin || null,
    telefones: decisionMaker.telefones,
    emails: decisionMaker.emails
  })
}
```

### 3. Quando é Executado?

O enrichment NovaVida é executado:

1. **Scraping Manual**: Quando você clica em "Scrape Now" no dashboard
2. **Cron Job**: Diariamente às 6h (automático em produção)
3. **API**: Quando chama `POST /api/scrape`

---

## 💰 Controle de Custos

### Verificar Uso Mensal

```typescript
import { novaVidaTIEnrichment } from '@/lib/services/novavidati-enrichment'

const usage = await novaVidaTIEnrichment.getMonthlyUsage()
console.log(`Consultas: ${usage.queries}`)
console.log(`Custo: R$ ${usage.totalCost.toFixed(2)}`)
```

### Tabela de Custos no Banco

Todos os usos são registrados na tabela `novaVidaTIUsage`:

```sql
SELECT * FROM novaVidaTIUsage
ORDER BY createdAt DESC
LIMIT 10;
```

---

## 🔍 Estrutura de Dados

### Resposta Completa

```typescript
interface NovaVidaTICompanyData {
  cnpj: string                    // CNPJ da empresa
  razaoSocial: string             // Razão social oficial
  nomeFantasia?: string           // Nome fantasia
  telefones: string[]             // Telefones corporativos
  emails: string[]                // Emails corporativos
  whatsapp?: string[]             // WhatsApp (celulares)
  socios: NovaVidaTIPartner[]     // Sócios/administradores
  porte?: string                  // ME, EPP, DEMAIS
  capitalSocial?: number          // Capital social
  qtdeFuncionarios?: number       // Quantidade de funcionários
  dataAbertura?: string           // Data de abertura
}

interface NovaVidaTIPartner {
  nome: string                    // Nome completo
  qualificacao: string            // Cargo/função
  telefones: string[]             // Telefones do sócio
  emails: string[]                // Emails do sócio
  participacao?: string           // % de participação
  linkedin?: string               // LinkedIn (buscado depois)
}
```

---

## 🚨 Troubleshooting

### Erro: "Credenciais não configuradas"

```
⚠️  Nova Vida TI credenciais não configuradas - enrichment desabilitado
```

**Solução**: Verifique se as variáveis estão no `.env` e reinicie o servidor.

---

### Erro: "Token inválido"

```
❌ Erro ao gerar token: 401
```

**Solução**:
1. Verifique se as credenciais estão corretas
2. Entre em contato com a Nova Vida TI para validar acesso
3. Verifique se sua conta está ativa

---

### Erro: "Rate limit"

```
❌ Erro na consulta: 429
```

**Solução**: O sistema já tem delay de 1.5s entre consultas. Se persistir, aumente o delay em `novavidati-enrichment.ts:217`.

---

### Nenhum dado retornado

```
⚠️  Dados não encontrados
```

**Possíveis causas**:
1. CNPJ incorreto ou formatado errado (deve ter 14 dígitos)
2. Empresa não está na base de dados da Nova Vida TI
3. Empresa inativa/baixada na Receita Federal

---

## 📚 Documentação Técnica

### Arquivos Relacionados

- **Serviço**: `lib/services/novavidati-enrichment.ts`
- **Orchestrator**: `lib/services/lead-orchestrator.ts:655`
- **Schema**: `prisma/schema.prisma` (tabela `novaVidaTIUsage`)
- **Documentação**: `NOVAVIDATI_REFATORADO.md`

### Endpoints da API

1. **GerarTokenJson**: Gera token de autenticação (24h)
   - URL: `https://wsnv.novavidati.com.br/wslocalizador.asmx/GerarTokenJson`
   - Method: POST
   - Body: `{ credencial: { usuario, senha, cliente } }` (Base64)

2. **NVCHECKJson**: Consulta dados por CNPJ/CPF
   - URL: `https://wsnv.novavidati.com.br/wslocalizador.asmx/NVCHECKJson`
   - Method: POST
   - Headers: `{ Token: string }`
   - Body: `{ nvcheck: { Documento: string } }`

---

## ✅ Checklist de Configuração

- [ ] Entrar em contato com Nova Vida TI
- [ ] Receber credenciais (usuário, senha, cliente)
- [ ] Adicionar credenciais no `.env`
- [ ] Reiniciar servidor de desenvolvimento
- [ ] Executar `npx tsx scripts/test-novavidati-real.ts`
- [ ] Verificar sucesso na geração de token
- [ ] Verificar retorno de dados de empresas
- [ ] Verificar registro de custos no banco
- [ ] Testar scraping completo com nova empresa

---

## 💡 Dicas

1. **Comece com poucos leads**: Teste com 1-2 empresas primeiro
2. **Monitore os custos**: Cada lead com 5 sócios = R$ 0.36 (1 empresa + 5 sócios)
3. **Use cache**: O sistema já cacheia tokens por 24h
4. **Rate limiting**: Já está implementado (1.5s entre consultas)
5. **Fallback gracioso**: Se a API falhar, o sistema continua funcionando

---

## 🎯 Próximos Passos

Após configurar as credenciais:

1. Execute o teste: `npx tsx scripts/test-novavidati-real.ts`
2. Se funcionar, faça um scraping real: `POST /api/scrape`
3. Verifique o dashboard para ver os contatos enriquecidos
4. Monitore custos na tabela `novaVidaTIUsage`

---

**Dúvidas?** Consulte `NOVAVIDATI_REFATORADO.md` para detalhes técnicos da implementação.
