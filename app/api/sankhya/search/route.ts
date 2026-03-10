import { NextRequest, NextResponse } from "next/server";
import { searchSankhyaProducts, loadSankhyaProducts } from "@/lib/sankhya-data";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 100;
  const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;

  if (!query.trim()) {
    const all = loadSankhyaProducts();
    return NextResponse.json({
      total: all.length,
      products: all.slice(offset, offset + limit),
    });
  }

  const results = searchSankhyaProducts(query, offset + limit);
  return NextResponse.json({
    total: results.length,
    products: results.slice(offset, offset + limit),
  });
}
