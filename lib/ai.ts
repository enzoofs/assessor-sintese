import OpenAI from "openai";
import { buildFewShotExamples, getNcmRules } from "./knowledge-base";
import { searchNcm, type NcmEntry } from "./ncm-search";
import brandGroupsData from "@/data/brand-groups.json";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry helper for rate limit errors (429)
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes("429") ||
          error.message.includes("Rate limit") ||
          (error as { status?: number }).status === 429);

      if (!isRateLimit || attempt === maxRetries) {
        throw error;
      }

      const waitMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(
        `[Rate limit] Attempt ${attempt + 1}/${maxRetries}, waiting ${waitMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw new Error("Unreachable");
}

export interface ProductLookupResult {
  nome_produto: string;
  descricao: string;
  descricao_importacao: string;
  temp_transporte: "Ambiente" | "Gelo reciclável" | "Gelo seco";
  temp_armazenagem: "Ambiente" | "Refrigerado" | "Congelado";
  ncm: string;
  ncm_descricao_siscomex: string;
  cod_grupo: string;
  grupo_nome: string;
  confianca: "alta" | "media" | "baixa";
  notas: string;
}

function buildBrandGroupsContext(brand: string): string {
  const normalized = brand.toUpperCase().trim();
  const groups =
    brandGroupsData[normalized as keyof typeof brandGroupsData] || [];
  if (groups.length === 0)
    return "Grupos de produto não encontrados para esta marca.";

  return groups
    .map(
      (g: { code: string; name: string; category: string }) =>
        `Código ${g.code}: ${g.name} (${g.category})`
    )
    .join("\n");
}

// ===== PASSO 1: Buscar produto na web e identificar =====

interface Step1Result {
  nome_produto: string;
  descricao: string;
  descricao_importacao: string;
  temp_transporte: "Ambiente" | "Gelo reciclável" | "Gelo seco";
  temp_armazenagem: "Ambiente" | "Refrigerado" | "Congelado";
  cod_grupo: string;
  grupo_nome: string;
  tipo_produto: string;
  keywords_ncm: string[];
}

// Brand-specific website mapping for product lookup
const BRAND_WEBSITES: Record<string, string> = {
  HIMEDIA: "himedialabs.com",
  IDT: "idtdna.com",
  BIORAD: "bio-rad.com",
  ZYMO: "zymoresearch.com",
  INVITEK: "invitek-molecular.com",
  THISTLE: "thistlescientific.co.uk",
  "BIOTECH RABBIT": "biotechrabbit.com",
  INVIVOGEN: "invivogen.com",
  "PCR BIOSYSTEMS": "pcrbio.com",
  BENCHMARK: "benchmarkscientific.com",
};

function getBrandWebsite(brand: string): string | null {
  const normalized = brand.toUpperCase().trim();
  for (const [key, site] of Object.entries(BRAND_WEBSITES)) {
    if (normalized.includes(key)) return site;
  }
  return null;
}

function buildBrandSpecificInstructions(brand: string): string {
  const site = getBrandWebsite(brand);
  const normalized = brand.toUpperCase().trim();

  if (normalized.includes("HIMEDIA")) {
    return `## INSTRUCOES ESPECIFICAS PARA HIMEDIA:
OBRIGATORIO: Busque o produto EXCLUSIVAMENTE no site oficial ${site}
- URL padrao: https://www.himedialabs.com/intl/en/products/ ou https://www.himedialabs.com/us/
- Use o CODIGO DO PRODUTO (ex: MB003, MH081, MBT060A) para buscar no site
- O nome_produto DEVE ser o nome EXATO que aparece no site da HiMedia, convertido para MAIUSCULAS
- Adicione a quantidade/tamanho apos uma VIRGULA (extraia do sufixo do codigo, ex: -500G, -100ML, -20PR)
- NUNCA traduza o nome para portugues - mantenha em INGLES como esta no site

EXEMPLOS DE PRODUTOS HIMEDIA JA CADASTRADOS:
- MB003-500G → "AMMONIUM PERSULPHATE, 500G"
- MH081-500G → "AGAR MACCONKEY, 500G"
- MBT060A-500U → "TAQ POLYMERASE (5 UNITS/UL), 500U"
- MB575-20PR → "HIPURA VIRAL DNA PURIFICATION KIT, 20 PREPARACOES"
- AL007A-500ML → "DMEM, HIGH GLUCOSE W/ 4.5GMS, 500ML"
- TC194-5G → "BOVINE SERUM ALBUMIN FRACTION-V, 5G"
- M393-500G → "DECARBOXYLASE BROTH BASE MOELLER, 500G"
- MB583-50PR → "HIPURA DNA/RNA PURIFICATION KIT 50PR"
- MB087-100MG → "RNASE A, 100MG"
- MBT072-1000U → "HI-MMLV REVERSE TRANSCRIPTASE 1000U"
- M118-100G → "MANNITOL SALT AGAR BASE, 100G"
- S016-500ML → "LACTOPHENOL COTTON BLUE, 500ML"`;
  }

  if (site) {
    return `## INSTRUCOES ESPECIFICAS PARA ${normalized}:
Busque o produto preferencialmente no site oficial ${site}
Use o nome EXATO que aparece no site do fabricante, convertido para MAIUSCULAS.`;
  }

  return "";
}

const STEP1_INSTRUCTIONS = `Voce e um especialista em produtos para laboratorio cientifico da empresa Sintese Assessoria Cientifica, distribuidora de produtos para laboratorio no Brasil.

VOCE DEVE buscar na web informacoes sobre o produto usando o codigo do fabricante e a marca fornecidos. Isso e OBRIGATORIO - nao invente informacoes sem buscar primeiro.

Apos encontrar as informacoes do produto, preencha os campos de cadastro.

## REGRA CRITICA PARA nome_produto:
- O nome_produto DEVE ser o nome EXATO do produto como aparece no site oficial do fabricante
- Convertido para MAIUSCULAS
- Em INGLES (como aparece no site do fabricante)
- Se o codigo incluir o tamanho (ex: -500G, -100ML), adicione apos uma VIRGULA
- NUNCA invente ou traduza nomes - use EXATAMENTE o que esta no site do fabricante
- Exemplo: se o site diz "MacConkey Agar" e o codigo e MH081-500G, o nome_produto deve ser "MACCONKEY AGAR, 500G"

## REGRAS DE TEMPERATURA:

TRANSPORTE:
- "Ambiente" → produtos secos, equipamentos, consumiveis estaveis
- "Gelo reciclavel" → produtos que precisam de refrigeracao (2-8°C), como anticorpos, enzimas sensiveis, meios de cultura liquidos
- "Gelo seco" → produtos congelados (-20°C ou menos), como celulas, reagentes ultrassensiveis, meios com componentes instaveis

ARMAZENAGEM:
- "Ambiente" → produtos estaveis a temperatura ambiente (meios de cultura em po, equipamentos, plasticos)
- "Refrigerado" → 2 a 8°C (enzimas, anticorpos, master mixes, meios liquidos)
- "Congelado" → -20°C (kits sensiveis, reagentes de biologia molecular ultrassensiveis)

## FORMATO DAS DESCRICOES:
Voce deve gerar DUAS descricoes diferentes:

### descricao (Descricao simplificada para o sistema Sankhya):
- Descricao CURTA e DIRETA do produto (1-2 frases)
- Em MAIUSCULAS, em PORTUGUES, SEM ACENTOS
- Comece com o NOME DO PRODUTO EM INGLES (mesmo nome usado em nome_produto), seguido de ponto
- Depois descreva em portugues o que o produto e e para que serve
- Exemplo: "MANNITOL SALT AGAR BASE. MEIO DE CULTURA MANITOL SALT AGAR BASE PARA ISOLAMENTO DE STAPHYLOCOCCUS PATOGENICOS EM AMOSTRAS CLINICAS E NAO CLINICAS, FRASCO DE 100G."

### descricao_importacao (Descricao tecnica completa para importacao):
- Descricao DETALHADA e TECNICA para fins de importacao e classificacao fiscal
- Em MAIUSCULAS, em PORTUGUES, SEM ACENTOS
- Comecar com o NOME DO PRODUTO EM INGLES seguido de ponto
- Incluir: composicao, uso, forma fisica, quantidade/volume, especificacoes tecnicas
- NAO usar caracteres especiais como (R), (TM), (C)

## EXEMPLOS DE CADASTROS ANTERIORES:

${buildFewShotExamples()}

## FORMATO DE SAIDA:
Responda EXCLUSIVAMENTE com um JSON valido. NUNCA escreva texto explicativo, desculpas ou comentarios - APENAS o JSON.
Mesmo que nao encontre informacoes completas, SEMPRE retorne o JSON com os melhores dados disponiveis.
O JSON deve ter exatamente estes campos:
{
  "nome_produto": "NOME EXATO DO SITE DO FABRICANTE EM MAIUSCULAS, TAMANHO",
  "descricao": "NOME EM INGLES. DESCRICAO SIMPLIFICADA EM PORTUGUES SEM ACENTOS",
  "descricao_importacao": "NOME EM INGLES. DESCRICAO TECNICA COMPLETA PARA IMPORTACAO EM MAIUSCULAS SEM ACENTOS",
  "temp_transporte": "Ambiente|Gelo reciclavel|Gelo seco",
  "temp_armazenagem": "Ambiente|Refrigerado|Congelado",
  "cod_grupo": "CODIGO DO GRUPO DE PRODUTO",
  "grupo_nome": "NOME DO GRUPO",
  "tipo_produto": "reagente|enzima|equipamento|consumivel|oligonucleotideo|kit|meio_de_cultura|anticorpo",
  "keywords_ncm": ["palavra1", "palavra2", "palavra3"]
}
REGRA ABSOLUTA: Sua resposta deve comecar com { e terminar com }. Nenhum texto antes ou depois.

IMPORTANTE sobre keywords_ncm: Estas palavras serao usadas para buscar a NCM correta no sistema SISCOMEX.
- Use palavras em PORTUGUES que descrevam a NATUREZA do produto para classificacao fiscal
- Para reagentes de laboratorio: ["reagente", "diagnostico", "laboratorio"]
- Para enzimas: ["enzima", "preparada"]
- Para equipamentos de PCR/lab: ["instrumento", "laboratorio", "analise"]
- Para meios de cultura: ["meio", "cultura", "preparacao", "microbiologia"]
- Para oligonucleotideos: ["acido", "nucleico", "oligonucleotideo"]
- Para anticorpos: ["reagente", "diagnostico", "anticorpo"]
- Para equipamentos de imagem: ["instrumento", "aparelho", "analise", "fisico", "quimico"]
- Para cabines, workstations, estufas: ["instrumento", "aparelho", "laboratorio"]
- Inclua de 3 a 5 keywords relevantes`;

async function step1_identifyProduct(
  manufacturerCode: string,
  brand: string
): Promise<Step1Result> {
  const brandGroups = buildBrandGroupsContext(brand);
  const brandInstructions = buildBrandSpecificInstructions(brand);
  const website = getBrandWebsite(brand);

  // Extract base code (without size suffix) for searching
  const baseCode = manufacturerCode.replace(/-\d+.*$/, "");
  const sizeMatch = manufacturerCode.match(/-(\d+\w+)$/);
  const sizeFromCode = sizeMatch ? sizeMatch[1] : "";

  // Build search instruction based on brand
  let searchInstruction: string;
  if (website) {
    searchInstruction = `OBRIGATORIO: Busque o produto no site oficial do fabricante: ${website}
Busque "site:${website} ${baseCode}" para encontrar a pagina exata do produto.
Se nao encontrar com site:, busque "${baseCode} ${brand}" na web.
Use o nome EXATO que aparece no site do fabricante.`;
  } else {
    searchInstruction = `Busque "${manufacturerCode} ${brand}" na web para encontrar as especificacoes reais do produto. NAO invente informacoes.`;
  }

  // Use OpenAI Responses API with web_search_preview tool
  const response = await withRetry(() => client.responses.create({
    model: "gpt-4o",
    tools: [{ type: "web_search_preview" as const }],
    instructions: STEP1_INSTRUCTIONS,
    input: `Busque na web informacoes sobre este produto e preencha os campos de cadastro:

CODIGO DO FABRICANTE: ${manufacturerCode}
CODIGO BASE (sem tamanho): ${baseCode}
TAMANHO EXTRAIDO DO CODIGO: ${sizeFromCode || "nao especificado no codigo"}
MARCA: ${brand}

${searchInstruction}

${brandInstructions}

GRUPOS DE PRODUTO DISPONIVEIS PARA ESTA MARCA:
${brandGroups}

IMPORTANTE: O nome_produto deve ser o nome EXATO do site do fabricante em MAIUSCULAS${sizeFromCode ? `, seguido de ", ${sizeFromCode.toUpperCase()}"` : ""}.

Apos buscar, responda APENAS com o JSON no formato especificado.`,
  }));

  // Extract text from response output
  let text = "";
  for (const item of response.output) {
    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type === "output_text") {
          text = content.text;
        }
      }
    }
  }

  if (!text) {
    throw new Error("No response from AI");
  }

  // Parse JSON from response
  let jsonStr = text.trim();
  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  // Try to find JSON in the text if it's not pure JSON
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    // AI returned text instead of JSON - retry with a stricter prompt
    console.log("[Step 1] JSON parse failed, retrying with correction prompt...");
    console.log("[Step 1] Original response:", text.substring(0, 200));

    const correction = await withRetry(() => client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: "Converta a informação abaixo em um JSON válido com estes campos exatos: nome_produto, descricao (curta, simplificada), descricao_importacao (técnica completa para importação), temp_transporte, temp_armazenagem, cod_grupo, grupo_nome, tipo_produto, keywords_ncm. Responda APENAS com o JSON.",
        },
        {
          role: "user",
          content: `Produto: ${manufacturerCode} da marca ${brand}\n\nInformação da IA:\n${text}\n\nGrupos disponíveis:\n${brandGroups}\n\nRetorne APENAS o JSON.`,
        },
      ],
      response_format: { type: "json_object" },
    }));

    const correctionText = correction.choices[0]?.message?.content || "{}";
    return JSON.parse(correctionText);
  }
}

// ===== PASSO 2: Buscar NCM no SISCOMEX e escolher o melhor =====

const STEP2_SYSTEM_PROMPT = `Você é um especialista em classificação fiscal de mercadorias para importação no Brasil (NCM - Nomenclatura Comum do Mercosul).

Você receberá:
1. Informações sobre um produto para laboratório
2. Uma lista de NCMs candidatas encontradas no SISCOMEX

Sua tarefa é escolher a NCM MAIS ADEQUADA da lista fornecida.

## REFERÊNCIA DE NCMs COMUNS EM LABORATÓRIO:

${getNcmRules()}

## REGRAS IMPORTANTES:
- PRIORIZE as NCMs da seção "REFERÊNCIA DE NCMs COMUNS EM LABORATÓRIO" acima - essas são as NCMs já usadas nos cadastros anteriores da empresa
- Se o produto for um EQUIPAMENTO de laboratório (cabine, workstation, sistema de imagem, módulo), a NCM provavelmente é 90279099
- Se nenhuma NCM da referência for adequada, escolha da lista de candidatas do SISCOMEX
- A NCM deve ter EXATAMENTE 8 dígitos
- Considere a FUNÇÃO do produto, não apenas seu nome

## FORMATO DE SAÍDA:
Responda EXCLUSIVAMENTE com um JSON válido:
{
  "ncm": "CÓDIGO NCM 8 DÍGITOS (sem pontos)",
  "ncm_descricao_siscomex": "DESCRIÇÃO OFICIAL DA NCM NO SISCOMEX",
  "confianca": "alta|media|baixa",
  "notas": "justificativa da escolha e observações"
}`;

interface Step2Result {
  ncm: string;
  ncm_descricao_siscomex: string;
  confianca: "alta" | "media" | "baixa";
  notas: string;
}

async function step2_classifyNcm(
  productInfo: Step1Result,
  ncmCandidates: NcmEntry[]
): Promise<Step2Result> {
  const candidatesText =
    ncmCandidates.length > 0
      ? ncmCandidates
          .map((c) => `${c.codigo.replace(/\./g, "")} - ${c.descricao}`)
          .join("\n")
      : "Nenhuma candidata encontrada no SISCOMEX. Use seu conhecimento para classificar.";

  const response = await withRetry(() => client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1000,
    messages: [
      { role: "system", content: STEP2_SYSTEM_PROMPT },
      {
        role: "user",
        content: `PRODUTO: ${productInfo.nome_produto}
TIPO: ${productInfo.tipo_produto}
DESCRIÇÃO: ${productInfo.descricao}

NCMs CANDIDATAS ENCONTRADAS NO SISCOMEX:
${candidatesText}

Escolha a NCM mais adequada para este produto.`,
      },
    ],
    response_format: { type: "json_object" },
  }));

  const text = response.choices[0]?.message?.content || "{}";
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr);
}

// ===== FUNÇÃO PRINCIPAL: Combina os passos =====

export async function lookupProduct(
  manufacturerCode: string,
  brand: string
): Promise<ProductLookupResult> {
  // PASSO 1: Buscar produto na web e identificar
  console.log(`[Step 1] Searching web for product: ${manufacturerCode} (${brand})`);
  const productInfo = await step1_identifyProduct(manufacturerCode, brand);
  console.log(
    `[Step 1] Product identified: ${productInfo.nome_produto}, type: ${productInfo.tipo_produto}`
  );
  console.log(`[Step 1] NCM keywords: ${productInfo.keywords_ncm.join(", ")}`);

  // PASSO 2: Buscar NCM no SISCOMEX usando as keywords
  console.log(`[Step 2] Searching NCM in SISCOMEX...`);
  const ncmCandidates = await searchNcm(productInfo.keywords_ncm);
  console.log(`[Step 2] Found ${ncmCandidates.length} NCM candidates`);

  if (ncmCandidates.length > 0) {
    console.log(
      `[Step 2] Top candidates:\n${ncmCandidates
        .slice(0, 5)
        .map((c) => `  ${c.codigo} - ${c.descricao}`)
        .join("\n")}`
    );
  }

  // PASSO 3: IA escolhe a melhor NCM
  console.log(`[Step 3] AI classifying NCM from candidates...`);
  const ncmResult = await step2_classifyNcm(productInfo, ncmCandidates);
  console.log(
    `[Step 3] Selected NCM: ${ncmResult.ncm} - ${ncmResult.ncm_descricao_siscomex} (${ncmResult.confianca})`
  );

  return {
    nome_produto: productInfo.nome_produto,
    descricao: productInfo.descricao,
    descricao_importacao: productInfo.descricao_importacao || productInfo.descricao,
    temp_transporte: productInfo.temp_transporte,
    temp_armazenagem: productInfo.temp_armazenagem,
    ncm: ncmResult.ncm,
    ncm_descricao_siscomex: ncmResult.ncm_descricao_siscomex,
    cod_grupo: productInfo.cod_grupo,
    grupo_nome: productInfo.grupo_nome,
    confianca: ncmResult.confianca,
    notas: ncmResult.notas,
  };
}
