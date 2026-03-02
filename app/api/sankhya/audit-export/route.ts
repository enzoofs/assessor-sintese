import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { AuditIssue } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { issues } = (await req.json()) as { issues: AuditIssue[] };

  if (!issues || issues.length === 0) {
    return NextResponse.json({ error: "Nenhuma issue para exportar" }, { status: 400 });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Auditoria");

  // Header
  const headers = [
    "CODPROD",
    "REF FORNECEDOR",
    "MARCA",
    "NOME DO PRODUTO",
    "TIPO DE ERRO",
    "VALOR ATUAL",
    "DESCRICAO ATUAL",
    "SUGESTAO",
    "DESCRICAO SUGESTAO",
    "CONFIANCA",
    "OBSERVACOES",
  ];

  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true, size: 10 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  // Column widths
  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 40;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 15;
  ws.getColumn(7).width = 30;
  ws.getColumn(8).width = 15;
  ws.getColumn(9).width = 30;
  ws.getColumn(10).width = 12;
  ws.getColumn(11).width = 50;

  const issueTypeLabels: Record<string, string> = {
    wrong_group: "Grupo errado",
    wrong_ncm: "NCM errado",
    unmapped_brand: "Marca sem mapeamento",
    unmapped_group: "Sem grupo",
  };

  for (const issue of issues) {
    const row = ws.addRow([
      issue.codprod,
      issue.ref_fornecedor,
      issue.marca,
      issue.nome_produto,
      issueTypeLabels[issue.issue_type] || issue.issue_type,
      issue.current_value,
      issue.current_label,
      issue.suggested_value,
      issue.suggested_label,
      issue.confidence,
      issue.notes,
    ]);
    row.font = { size: 9 };

    // Color code by issue type
    if (issue.issue_type === "wrong_group" || issue.issue_type === "wrong_ncm") {
      row.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" }, // yellow
      };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=AUDITORIA_SINTESE.xlsx",
    },
  });
}
