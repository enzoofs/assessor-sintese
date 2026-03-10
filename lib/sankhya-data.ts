import { SankhyaProduct, DataReport } from "./types";
import fs from "fs";
import path from "path";

// Cache em memória - carregado uma vez
let cachedProducts: SankhyaProduct[] | null = null;
let groupNames: Record<string, string> | null = null;

function loadGroupNames(): Record<string, string> {
  if (groupNames) return groupNames;
  const filePath = path.join(process.cwd(), "data", "product-groups.json");
  groupNames = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return groupNames!;
}

export function loadSankhyaProducts(): SankhyaProduct[] {
  if (cachedProducts) return cachedProducts;

  const filePath = path.join(process.cwd(), "data", "sankhya-products.json");
  const raw: {
    codprod: number | null;
    ref_fornecedor: string;
    marca: string;
    cod_grupo: number;
    nome_produto: string;
    descricao: string;
    temp_transporte: string;
    temp_armazenagem: string;
    ncm: string;
  }[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const groups = loadGroupNames();

  cachedProducts = raw.map((p) => ({
    ...p,
    grupo_nome: groups[String(p.cod_grupo)] || "",
  }));

  return cachedProducts;
}

export function searchSankhyaProducts(
  query: string,
  limit: number = 100
): SankhyaProduct[] {
  const products = loadSankhyaProducts();
  const q = query.toLowerCase().trim();

  if (!q) return products.slice(0, limit);

  const terms = q.split(/\s+/);

  const results = products.filter((p) => {
    const searchable = [
      p.ref_fornecedor,
      p.marca,
      p.nome_produto,
      p.descricao,
      p.ncm,
      String(p.cod_grupo),
      p.grupo_nome,
      p.codprod ? String(p.codprod) : "",
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => searchable.includes(term));
  });

  return results.slice(0, limit);
}

export function generateReport(): DataReport {
  const products = loadSankhyaProducts();

  // Duplicatas por ref_fornecedor
  const refMap = new Map<
    string,
    { codprod: number | null; nome: string }[]
  >();
  for (const p of products) {
    const ref = p.ref_fornecedor.toUpperCase().trim();
    if (!ref) continue;
    if (!refMap.has(ref)) refMap.set(ref, []);
    refMap.get(ref)!.push({ codprod: p.codprod, nome: p.nome_produto });
  }

  const duplicates = Array.from(refMap.entries())
    .filter(([, items]) => items.length > 1)
    .map(([ref, products]) => ({
      ref,
      count: products.length,
      products,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total: products.length,
    duplicates,
    missing_ncm: products.filter((p) => !p.ncm),
    missing_descricao: products.filter((p) => !p.descricao),
    missing_temp_transporte: products.filter((p) => !p.temp_transporte),
    missing_temp_armazenagem: products.filter((p) => !p.temp_armazenagem),
    missing_ref: products.filter((p) => !p.ref_fornecedor),
    missing_grupo: products.filter((p) => !p.cod_grupo || p.cod_grupo === 0),
  };
}

// Verificar se um código já existe na base Sankhya
export function findInSankhya(refFornecedor: string): SankhyaProduct | null {
  const products = loadSankhyaProducts();
  const code = refFornecedor.toUpperCase().trim();
  return (
    products.find((p) => p.ref_fornecedor.toUpperCase().trim() === code) || null
  );
}
