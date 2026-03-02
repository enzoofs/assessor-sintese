import { NextRequest, NextResponse } from "next/server";
import { findInSankhya } from "@/lib/sankhya-data";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  if (!code.trim()) {
    return NextResponse.json({ found: false });
  }

  const product = findInSankhya(code);
  if (product) {
    return NextResponse.json({
      found: true,
      product: {
        codprod: product.codprod,
        nome_produto: product.nome_produto,
        marca: product.marca,
      },
    });
  }

  return NextResponse.json({ found: false });
}
