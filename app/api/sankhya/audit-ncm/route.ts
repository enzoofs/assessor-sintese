import { NextRequest, NextResponse } from "next/server";
import { loadSankhyaProducts } from "@/lib/sankhya-data";
import { auditNcmBatch } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brand, limit, codprods } = body as {
    brand?: string;
    limit?: number;
    codprods?: number[];
  };

  let products = loadSankhyaProducts();

  // Filter by specific codprods
  if (codprods && codprods.length > 0) {
    const codSet = new Set(codprods);
    products = products.filter((p) => p.codprod !== null && codSet.has(p.codprod));
  }

  // Filter by brand
  if (brand) {
    products = products.filter((p) =>
      p.marca.toUpperCase().includes(brand.toUpperCase())
    );
  }

  // Only audit products that have NCM and description
  products = products.filter((p) => p.ncm && p.nome_produto);

  // Apply limit
  const maxProducts = limit || 50;
  products = products.slice(0, maxProducts);

  console.log(`[NCM Audit] Starting audit for ${products.length} products`);

  const issues = await auditNcmBatch(products, (done, total) => {
    console.log(`[NCM Audit] Progress: ${done}/${total}`);
  });

  console.log(`[NCM Audit] Found ${issues.length} issues`);

  return NextResponse.json({
    total_audited: products.length,
    ncm_issues: issues,
  });
}
