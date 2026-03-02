import { NextRequest, NextResponse } from "next/server";
import { lookupProduct } from "@/lib/ai";
import { lookupPrice } from "@/lib/price-lookup";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manufacturerCode, brand } = body;

    if (!manufacturerCode || !brand) {
      return NextResponse.json(
        { error: "Código do fabricante e marca são obrigatórios" },
        { status: 400 }
      );
    }

    const code = manufacturerCode.trim();
    const brandName = brand.trim();

    // Run product lookup and price lookup in parallel
    const [productResult, priceResult] = await Promise.all([
      lookupProduct(code, brandName),
      Promise.resolve(lookupPrice(code, brandName)),
    ]);

    return NextResponse.json({
      ...productResult,
      preco: priceResult,
    });
  } catch (error) {
    console.error("Error looking up product:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
