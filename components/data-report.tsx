"use client";

import { useState, useEffect } from "react";
import { DataReport } from "@/lib/types";
import {
  FileWarning,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

function ReportSection({
  title,
  count,
  icon: Icon,
  variant,
  children,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  variant: "warning" | "error" | "info";
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  const colors = {
    warning: "border-yellow-200 bg-yellow-50",
    error: "border-red-200 bg-red-50",
    info: "border-blue-200 bg-blue-50",
  };

  const iconColors = {
    warning: "text-yellow-600",
    error: "text-red-600",
    info: "text-blue-600",
  };

  return (
    <div className={`border rounded-lg ${colors[variant]}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColors[variant]}`} />
          <span className="font-medium text-sm">{title}</span>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full ${
              count === 0
                ? "bg-green-100 text-green-700"
                : variant === "error"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {count}
          </span>
        </div>
        {count > 0 &&
          (expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ))}
      </button>
      {expanded && count > 0 && (
        <div className="px-4 pb-3 border-t border-inherit">
          <div className="mt-3 max-h-80 overflow-y-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

export function DataReportView() {
  const [report, setReport] = useState<DataReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sankhya/report")
      .then((r) => r.json())
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Gerando relatorio...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12 text-red-500">
        Erro ao gerar relatorio.
      </div>
    );
  }

  const issues =
    report.duplicates.length +
    report.missing_ncm.length +
    report.missing_descricao.length +
    report.missing_ref.length +
    report.missing_grupo.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileWarning className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Relatorio de qualidade - {report.total.toLocaleString("pt-BR")}{" "}
              produtos
            </p>
            <p className="text-xs text-muted-foreground">
              {issues > 0
                ? `${issues} categorias com itens para revisar`
                : "Todos os dados estao completos"}
            </p>
          </div>
        </div>
        {issues === 0 && (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        )}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <ReportSection
          title="Codigos de referencia duplicados"
          count={report.duplicates.length}
          icon={Copy}
          variant="warning"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  REF
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  QTD
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  PRODUTOS
                </th>
              </tr>
            </thead>
            <tbody>
              {report.duplicates.map((d) => (
                <tr key={d.ref} className="border-b">
                  <td className="py-1 px-2 font-mono text-xs">{d.ref}</td>
                  <td className="py-1 px-2 text-xs">{d.count}x</td>
                  <td className="py-1 px-2 text-xs">
                    {d.products
                      .map(
                        (p) =>
                          `${p.nome.substring(0, 40)}${
                            p.nome.length > 40 ? "..." : ""
                          } (${p.codprod})`
                      )
                      .join(" | ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection
          title="Produtos sem NCM"
          count={report.missing_ncm.length}
          icon={AlertTriangle}
          variant="error"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  COD
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  REF
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  NOME
                </th>
              </tr>
            </thead>
            <tbody>
              {report.missing_ncm.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 px-2 text-xs">{p.codprod}</td>
                  <td className="py-1 px-2 font-mono text-xs">
                    {p.ref_fornecedor || "-"}
                  </td>
                  <td className="py-1 px-2 text-xs">{p.nome_produto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection
          title="Produtos sem descricao (OBSETIQUETA)"
          count={report.missing_descricao.length}
          icon={AlertTriangle}
          variant="warning"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  COD
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  REF
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  NOME
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  MARCA
                </th>
              </tr>
            </thead>
            <tbody>
              {report.missing_descricao.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 px-2 text-xs">{p.codprod}</td>
                  <td className="py-1 px-2 font-mono text-xs">
                    {p.ref_fornecedor || "-"}
                  </td>
                  <td className="py-1 px-2 text-xs">{p.nome_produto}</td>
                  <td className="py-1 px-2 text-xs">{p.marca}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection
          title="Produtos sem referencia do fornecedor"
          count={report.missing_ref.length}
          icon={AlertTriangle}
          variant="error"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  COD
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  NOME
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  MARCA
                </th>
              </tr>
            </thead>
            <tbody>
              {report.missing_ref.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 px-2 text-xs">{p.codprod}</td>
                  <td className="py-1 px-2 text-xs">{p.nome_produto}</td>
                  <td className="py-1 px-2 text-xs">{p.marca}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection
          title="Produtos sem grupo de produto"
          count={report.missing_grupo.length}
          icon={AlertTriangle}
          variant="warning"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  COD
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  REF
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  NOME
                </th>
              </tr>
            </thead>
            <tbody>
              {report.missing_grupo.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 px-2 text-xs">{p.codprod}</td>
                  <td className="py-1 px-2 font-mono text-xs">
                    {p.ref_fornecedor || "-"}
                  </td>
                  <td className="py-1 px-2 text-xs">{p.nome_produto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        <ReportSection
          title="Produtos sem temperatura de transporte"
          count={report.missing_temp_transporte.length}
          icon={AlertTriangle}
          variant="info"
        >
          <p className="text-xs text-muted-foreground mb-2">
            {report.missing_temp_transporte.length} produtos sem info de
            temperatura de transporte. Muitos sao produtos nacionais ou de
            categorias sem exigencia.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  COD
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  REF
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  NOME
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  MARCA
                </th>
              </tr>
            </thead>
            <tbody>
              {report.missing_temp_transporte.slice(0, 100).map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 px-2 text-xs">{p.codprod}</td>
                  <td className="py-1 px-2 font-mono text-xs">
                    {p.ref_fornecedor || "-"}
                  </td>
                  <td className="py-1 px-2 text-xs">{p.nome_produto}</td>
                  <td className="py-1 px-2 text-xs">{p.marca}</td>
                </tr>
              ))}
              {report.missing_temp_transporte.length > 100 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-2 px-2 text-xs text-muted-foreground text-center"
                  >
                    ... e mais{" "}
                    {report.missing_temp_transporte.length - 100} produtos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ReportSection>
      </div>
    </div>
  );
}
