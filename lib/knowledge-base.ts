import knowledgeBase from "@/data/knowledge-base.json";
import ncmPatterns from "@/data/ncm-patterns.json";

export interface KnowledgeProduct {
  nome: string;
  descricao: string;
  ncm: string | null;
}

const products: KnowledgeProduct[] = knowledgeBase;

export function getExamplesByNcm(ncm: string, limit = 3): KnowledgeProduct[] {
  return products.filter((p) => p.ncm === ncm).slice(0, limit);
}

export function getRandomExamples(limit = 10): KnowledgeProduct[] {
  const shuffled = [...products]
    .filter((p) => p.ncm)
    .sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

export function buildFewShotExamples(): string {
  // Pick diverse examples from different NCM categories
  const examples: KnowledgeProduct[] = [];
  const ncms = ["38221990", "35079039", "29349934", "90279099"];

  for (const ncm of ncms) {
    const ncmProducts = products.filter((p) => p.ncm === ncm);
    if (ncmProducts.length > 0) {
      examples.push(ncmProducts[0]);
      if (ncmProducts.length > 5) {
        examples.push(ncmProducts[Math.floor(ncmProducts.length / 2)]);
      }
    }
  }

  return examples
    .map(
      (p) =>
        `PRODUTO: ${p.nome}\nDESCRIÇÃO: ${p.descricao}\nNCM: ${p.ncm}`
    )
    .join("\n\n---\n\n");
}

export function getNcmRules(): string {
  return ncmPatterns.rules
    .map(
      (rule) =>
        `NCM ${rule.ncm}: ${rule.description} (${rule.count} produtos cadastrados)`
    )
    .join("\n");
}

export { ncmPatterns };
