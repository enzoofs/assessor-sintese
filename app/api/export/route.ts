import { NextRequest, NextResponse } from "next/server";
import { generateSankhyaExcel, type ProductRow } from "@/lib/excel-export";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products } = body as { products: ProductRow[] };

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "Nenhum produto para exportar" },
        { status: 400 }
      );
    }

    const buffer = await generateSankhyaExcel(products);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="CADASTRO_PRODUTOS_SINTESE.xlsx"',
      },
    });
  } catch (error) {
    console.error("Error generating Excel:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao gerar planilha";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
