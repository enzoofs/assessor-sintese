import { NextRequest, NextResponse } from "next/server";
import { loadSankhyaProducts } from "@/lib/sankhya-data";

// Batch duplicate check - receives array of codes, returns which ones exist
export async function POST(req: NextRequest) {
  const { codes } = await req.json();
  if (!Array.isArray(codes)) {
    return NextResponse.json({ duplicates: [] });
  }

  const products = loadSankhyaProducts();

  // Build a set of uppercase codes for fast lookup
  const sankhyaCodes = new Set(
    products.map((p) => p.ref_fornecedor.toUpperCase().trim())
  );

  const duplicates = codes.filter((code: string) =>
    sankhyaCodes.has(String(code).toUpperCase().trim())
  );

  return NextResponse.json({ duplicates });
}
