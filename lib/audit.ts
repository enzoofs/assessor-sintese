import OpenAI from "openai";
import { SankhyaProduct, AuditIssue, AuditResult } from "./types";
import brandGroupsData from "@/data/brand-groups.json";
import productGroupsData from "@/data/product-groups.json";

const brandGroups = brandGroupsData as Record<
  string,
  { code: string; name: string; category: string }[]
>;
const productGroups = productGroupsData as Record<string, string>;

// ============================================================
// Aliases de marca para normalização
// ============================================================
const BRAND_ALIASES: Record<string, string> = {
  "BIORAD BRASIL": "BIORAD",
  "BIO-RAD": "BIORAD",
  BIOTECHRABBIT: "BIOTECH RABBIT",
  "INVITEK MOLECULAR": "INVITEK",
  "THISTLE SCIENTIFIC": "THISTLE",
  "ZYMO RESEARCH": "ZYMO",
  "BIOCARE MEDICAL": "BIOCARE",
  "IMPLEN INC": "IMPLEN",
  "PCR BIOSYSTEMS": "PCR BIOSYSTEMS",
  "ADS ADVANCEDSEQ": "ADS",
};

function normalizeBrand(marca: string): string {
  const upper = marca.toUpperCase().trim();
  return BRAND_ALIASES[upper] || upper;
}

function findBrandGroups(
  marca: string
): { code: string; name: string; category: string }[] | null {
  const normalized = normalizeBrand(marca);
  if (!normalized || normalized.length < 2) return null;

  // Direct match
  const bgKeys = Object.keys(brandGroups);
  const match = bgKeys.find((k) => k.toUpperCase() === normalized);
  if (match) return brandGroups[match];
  // Partial match (only if both sides have meaningful length)
  const partial = bgKeys.find((k) => {
    const keyUpper = k.toUpperCase();
    if (keyUpper.length < 3 || normalized.length < 3) return false;
    return normalized.includes(keyUpper) || keyUpper.includes(normalized);
  });
  if (partial) return brandGroups[partial];
  return null;
}

// ============================================================
// Auditoria de Grupo (instantânea, sem IA)
// ============================================================
export function auditGroups(
  products: SankhyaProduct[],
  brandFilter?: string
): AuditResult {
  const filtered = brandFilter
    ? products.filter(
        (p) => p.marca.toUpperCase().includes(brandFilter.toUpperCase())
      )
    : products;

  const groupIssues: AuditIssue[] = [];
  const unmappedBrandsMap = new Map<string, number>();

  for (const p of filtered) {
    const validGroups = findBrandGroups(p.marca);

    if (!validGroups) {
      // Marca sem mapeamento
      if (p.marca.trim()) {
        const brand = p.marca.toUpperCase().trim();
        unmappedBrandsMap.set(brand, (unmappedBrandsMap.get(brand) || 0) + 1);
      }
      continue;
    }

    const validCodes = validGroups.map((g) => g.code);
    const currentCode = String(p.cod_grupo);

    if (!p.cod_grupo || p.cod_grupo === 0) {
      groupIssues.push({
        codprod: p.codprod,
        ref_fornecedor: p.ref_fornecedor,
        marca: p.marca,
        nome_produto: p.nome_produto,
        issue_type: "unmapped_group",
        current_value: currentCode,
        current_label: productGroups[currentCode] || "(sem grupo)",
        suggested_value: validGroups[0].code,
        suggested_label: validGroups.map((g) => g.name).join(", "),
        confidence: "alta",
        notes: `Produto sem grupo. Grupos validos para ${normalizeBrand(p.marca)}: ${validGroups.map((g) => g.name).join(", ")}`,
      });
    } else if (!validCodes.includes(currentCode)) {
      // Grupo errado
      const currentGroupName = productGroups[currentCode] || `(codigo ${currentCode})`;
      groupIssues.push({
        codprod: p.codprod,
        ref_fornecedor: p.ref_fornecedor,
        marca: p.marca,
        nome_produto: p.nome_produto,
        issue_type: "wrong_group",
        current_value: currentCode,
        current_label: currentGroupName,
        suggested_value: validGroups.length === 1 ? validGroups[0].code : "",
        suggested_label: validGroups.map((g) => `${g.code} (${g.name})`).join(" | "),
        confidence: validGroups.length === 1 ? "alta" : "media",
        notes:
          validGroups.length === 1
            ? `Grupo unico para ${normalizeBrand(p.marca)}: ${validGroups[0].name}`
            : `Grupos validos: ${validGroups.map((g) => g.name).join(", ")}. Verificar manualmente qual se aplica.`,
      });
    }
  }

  const unmappedBrands = Array.from(unmappedBrandsMap.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total_audited: filtered.length,
    group_issues: groupIssues,
    ncm_issues: [],
    unmapped_brands: unmappedBrands,
  };
}

// ============================================================
// Auditoria de NCM (IA - gpt-4o-mini em batch)
// ============================================================
const NCM_AUDIT_PROMPT = `Voce e um especialista em classificacao fiscal NCM brasileira para produtos de laboratorio e biotecnologia.

Para cada produto abaixo, avalie se o NCM informado esta correto com base no nome e descricao do produto.

Responda APENAS em JSON array. Para cada produto:
- Se o NCM esta CORRETO: omita do resultado
- Se o NCM esta INCORRETO ou DUVIDOSO: inclua no resultado com a sugestao

Formato de resposta (JSON array):
[
  {
    "index": 0,
    "ncm_sugerido": "38221990",
    "descricao_ncm": "Reagentes de diagnostico ou de laboratorio",
    "confianca": "alta",
    "motivo": "Produto e um reagente, nao um equipamento"
  }
]

Se todos estiverem corretos, responda: []`;

interface NcmAuditItem {
  index: number;
  ncm_sugerido: string;
  descricao_ncm: string;
  confianca: "alta" | "media" | "baixa";
  motivo: string;
}

export async function auditNcmBatch(
  products: SankhyaProduct[],
  onProgress?: (done: number, total: number) => void
): Promise<AuditIssue[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const BATCH_SIZE = 10;
  const issues: AuditIssue[] = [];

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    const productsText = batch
      .map(
        (p, idx) =>
          `[${idx}] NCM: ${p.ncm || "VAZIO"} | Nome: ${p.nome_produto} | Desc: ${(p.descricao || "").substring(0, 200)} | Marca: ${p.marca}`
      )
      .join("\n");

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          { role: "system", content: NCM_AUDIT_PROMPT },
          { role: "user", content: productsText },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      let parsed: NcmAuditItem[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error("[NCM Audit] Failed to parse batch response:", content);
      }

      for (const item of parsed) {
        const product = batch[item.index];
        if (!product) continue;

        // Skip if suggested same as current
        const currentNcm = (product.ncm || "").replace(/\./g, "");
        const suggestedNcm = (item.ncm_sugerido || "").replace(/\./g, "");
        if (currentNcm === suggestedNcm) continue;

        issues.push({
          codprod: product.codprod,
          ref_fornecedor: product.ref_fornecedor,
          marca: product.marca,
          nome_produto: product.nome_produto,
          issue_type: "wrong_ncm",
          current_value: product.ncm,
          current_label: "",
          suggested_value: suggestedNcm,
          suggested_label: item.descricao_ncm || "",
          confidence: item.confianca || "media",
          notes: item.motivo || "",
        });
      }
    } catch (error) {
      console.error(
        `[NCM Audit] Batch ${i / BATCH_SIZE + 1} failed:`,
        error instanceof Error ? error.message : error
      );
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, products.length), products.length);
    }

    // Rate limit pause between batches
    if (i + BATCH_SIZE < products.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return issues;
}
