import { NextRequest, NextResponse } from "next/server";
import { loadSankhyaProducts } from "@/lib/sankhya-data";
import { auditGroups } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get("brand") || undefined;
  const products = loadSankhyaProducts();
  const result = auditGroups(products, brand);
  return NextResponse.json(result);
}
