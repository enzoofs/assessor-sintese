"use client";

import { useState, useEffect, useMemo } from "react";
import { AuditIssue, AuditResult } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import {
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Download,
  Play,
  Filter,
  ArrowRight,
} from "lucide-react";

// ============================================================
// Subcomponents
// ============================================================

function IssueTypeLabel({ type }: { type: AuditIssue["issue_type"] }) {
  const config: Record<string, { label: string; color: string }> = {
    wrong_group: {
      label: "Grupo errado",
      color: "bg-yellow-100 text-yellow-800",
    },
    wrong_ncm: { label: "NCM errado", color: "bg-red-100 text-red-800" },
    unmapped_brand: {
      label: "Marca sem mapeamento",
      color: "bg-gray-100 text-gray-700",
    },
    unmapped_group: { label: "Sem grupo", color: "bg-orange-100 text-orange-800" },
  };
  const c = config[type] || { label: type, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${c.color}`}>
      {c.label}
    </span>
  );
}

function ConfidenceLabel({ level }: { level: string }) {
  const colors: Record<string, string> = {
    alta: "text-green-700",
    media: "text-yellow-700",
    baixa: "text-red-700",
  };
  return (
    <span className={`text-xs font-medium ${colors[level] || "text-gray-500"}`}>
      {level}
    </span>
  );
}

function AuditSection({
  title,
  count,
  variant,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  variant: "warning" | "error" | "info";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen || false);

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
          <AlertTriangle className={`w-4 h-4 ${iconColors[variant]}`} />
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
          <div className="mt-3 max-h-[500px] overflow-y-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

function IssueTable({ issues }: { issues: AuditIssue[] }) {
  const [displayLimit, setDisplayLimit] = useState(50);

  return (
    <>
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
              MARCA
            </th>
            <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
              NOME
            </th>
            <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
              ATUAL
            </th>
            <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground"></th>
            <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
              SUGESTAO
            </th>
            <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
              CONF.
            </th>
          </tr>
        </thead>
        <tbody>
          {issues.slice(0, displayLimit).map((issue, i) => (
            <tr key={`${issue.codprod}-${i}`} className="border-b hover:bg-white/50" title={issue.notes}>
              <td className="py-1.5 px-2 text-xs">{issue.codprod}</td>
              <td className="py-1.5 px-2 text-xs font-mono">
                {issue.ref_fornecedor || "-"}
              </td>
              <td className="py-1.5 px-2 text-xs">{issue.marca}</td>
              <td className="py-1.5 px-2 text-xs max-w-[200px] truncate">
                {issue.nome_produto}
              </td>
              <td className="py-1.5 px-2">
                <div>
                  <span className="text-xs font-mono text-red-700">
                    {issue.current_value}
                  </span>
                  {issue.current_label && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {issue.current_label}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-1.5 px-1">
                <ArrowRight className="w-3 h-3 text-gray-400" />
              </td>
              <td className="py-1.5 px-2">
                <div>
                  <span className="text-xs font-mono text-green-700">
                    {issue.suggested_value || "?"}
                  </span>
                  {issue.suggested_label && (
                    <p className="text-[10px] text-muted-foreground leading-tight max-w-[200px] truncate">
                      {issue.suggested_label}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-1.5 px-2">
                <ConfidenceLabel level={issue.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {issues.length > displayLimit && (
        <div className="text-center mt-2">
          <button
            onClick={() => setDisplayLimit((prev) => prev + 50)}
            className="text-xs text-primary hover:underline"
          >
            Mostrar mais ({issues.length - displayLimit} restantes)
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================
// Main Component
// ============================================================

export function AuditView() {
  const [groupResult, setGroupResult] = useState<AuditResult | null>(null);
  const [ncmIssues, setNcmIssues] = useState<AuditIssue[]>([]);
  const [ncmAudited, setNcmAudited] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ncmRunning, setNcmRunning] = useState(false);
  const [ncmBrand, setNcmBrand] = useState("");
  const [ncmLimit, setNcmLimit] = useState(50);
  const [brandFilter, setBrandFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Load group audit on mount
  useEffect(() => {
    apiFetch("/api/sankhya/audit")
      .then((r) => r.json())
      .then(setGroupResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Available brands from group issues
  const brands = useMemo(() => {
    if (!groupResult) return [];
    const brandCounts = new Map<string, number>();
    for (const issue of groupResult.group_issues) {
      const b = issue.marca.toUpperCase().trim();
      brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
    }
    return Array.from(brandCounts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  }, [groupResult]);

  // Filtered issues
  const filteredGroupIssues = useMemo(() => {
    if (!groupResult) return [];
    if (!brandFilter) return groupResult.group_issues;
    return groupResult.group_issues.filter(
      (i) => i.marca.toUpperCase().trim() === brandFilter
    );
  }, [groupResult, brandFilter]);

  const filteredNcmIssues = useMemo(() => {
    if (!brandFilter) return ncmIssues;
    return ncmIssues.filter(
      (i) => i.marca.toUpperCase().trim() === brandFilter
    );
  }, [ncmIssues, brandFilter]);

  // Run NCM audit
  async function runNcmAudit() {
    setNcmRunning(true);
    setNcmIssues([]);
    setNcmAudited(0);
    try {
      const res = await apiFetch("/api/sankhya/audit-ncm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: ncmBrand || undefined,
          limit: ncmLimit,
        }),
      });
      const data = await res.json();
      setNcmIssues(data.ncm_issues || []);
      setNcmAudited(data.total_audited || 0);
    } catch (error) {
      console.error("NCM audit failed:", error);
    } finally {
      setNcmRunning(false);
    }
  }

  // Export to Excel
  async function exportIssues() {
    const allIssues = [...filteredGroupIssues, ...filteredNcmIssues];
    if (allIssues.length === 0) return;

    setIsExporting(true);
    try {
      const res = await apiFetch("/api/sankhya/audit-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: allIssues }),
      });
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AUDITORIA_SINTESE.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao exportar auditoria"
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando auditoria...
      </div>
    );
  }

  if (!groupResult) {
    return (
      <div className="text-center py-12 text-red-500">
        Erro ao carregar auditoria.
      </div>
    );
  }

  const totalIssues = filteredGroupIssues.length + filteredNcmIssues.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Auditoria de cadastros -{" "}
              {groupResult.total_audited.toLocaleString("pt-BR")} produtos
              analisados
            </p>
            <p className="text-xs text-muted-foreground">
              {totalIssues > 0
                ? `${totalIssues} problema${totalIssues !== 1 ? "s" : ""} encontrado${totalIssues !== 1 ? "s" : ""}`
                : "Nenhum problema encontrado"}
            </p>
          </div>
        </div>
        <button
          onClick={exportIssues}
          disabled={totalIssues === 0 || isExporting}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          Exportar Excel
        </button>
      </div>

      {/* Brand filter */}
      {brands.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas as marcas</option>
            {brands.map(({ brand, count }) => (
              <option key={brand} value={brand}>
                {brand} ({count})
              </option>
            ))}
          </select>
          {brandFilter && (
            <button
              onClick={() => setBrandFilter("")}
              className="text-xs text-primary hover:underline"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {/* Group Issues */}
      <AuditSection
        title="Grupo de produto incorreto"
        count={filteredGroupIssues.length}
        variant="warning"
        defaultOpen={filteredGroupIssues.length > 0 && filteredGroupIssues.length <= 100}
      >
        <IssueTable issues={filteredGroupIssues} />
      </AuditSection>

      {/* NCM Audit */}
      <div className="border rounded-lg border-blue-200 bg-blue-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm">NCM incorreto</span>
              {ncmAudited > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {filteredNcmIssues.length} de {ncmAudited} auditados
                </span>
              )}
            </div>
          </div>

          {/* NCM audit controls */}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Marca (opcional)
              </label>
              <input
                type="text"
                className="text-sm border rounded-md px-2 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: HIMEDIA"
                value={ncmBrand}
                onChange={(e) => setNcmBrand(e.target.value)}
                disabled={ncmRunning}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Limite de produtos
              </label>
              <select
                className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                value={ncmLimit}
                onChange={(e) => setNcmLimit(Number(e.target.value))}
                disabled={ncmRunning}
              >
                <option value={20}>20 produtos</option>
                <option value={50}>50 produtos</option>
                <option value={100}>100 produtos</option>
                <option value={200}>200 produtos</option>
                <option value={500}>500 produtos</option>
                <option value={8000}>Todos (~$8)</option>
              </select>
            </div>
            <button
              onClick={runNcmAudit}
              disabled={ncmRunning}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {ncmRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {ncmRunning ? "Auditando..." : "Executar auditoria NCM"}
            </button>
          </div>

          {ncmRunning && (
            <div className="mt-3">
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-1/3" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Processando com gpt-4o-mini... isso pode levar alguns minutos.
              </p>
            </div>
          )}
        </div>

        {filteredNcmIssues.length > 0 && (
          <div className="px-4 pb-3 border-t border-blue-200">
            <div className="mt-3 max-h-[500px] overflow-y-auto">
              <IssueTable issues={filteredNcmIssues} />
            </div>
          </div>
        )}

        {ncmAudited > 0 && filteredNcmIssues.length === 0 && !ncmRunning && (
          <div className="px-4 pb-3 border-t border-blue-200">
            <p className="mt-3 text-sm text-green-700">
              Nenhum problema de NCM encontrado nos {ncmAudited} produtos
              auditados.
            </p>
          </div>
        )}
      </div>

      {/* Unmapped brands */}
      {groupResult.unmapped_brands.length > 0 && (
        <AuditSection
          title="Marcas sem mapeamento de grupo"
          count={groupResult.unmapped_brands.length}
          variant="info"
        >
          <p className="text-xs text-muted-foreground mb-2">
            Estas marcas nao possuem mapeamento em brand-groups.json. Os
            grupos nao puderam ser validados.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  MARCA
                </th>
                <th className="text-left py-1 px-2 text-xs font-medium text-muted-foreground">
                  PRODUTOS
                </th>
              </tr>
            </thead>
            <tbody>
              {groupResult.unmapped_brands.map((b) => (
                <tr key={b.brand} className="border-b">
                  <td className="py-1 px-2 text-xs">{b.brand}</td>
                  <td className="py-1 px-2 text-xs">{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AuditSection>
      )}
    </div>
  );
}
