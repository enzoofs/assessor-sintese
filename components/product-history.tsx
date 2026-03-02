"use client";

import { useState, useMemo } from "react";
import { ProductResult } from "@/lib/types";
import { Badge } from "./ui/badge";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Database,
} from "lucide-react";

interface ProductHistoryProps {
  products: ProductResult[];
  onRemove: (id: string) => void;
}

function ConfidenceBadge({ level }: { level: "alta" | "media" | "baixa" }) {
  const variants: Record<string, "success" | "warning" | "destructive"> = {
    alta: "success",
    media: "warning",
    baixa: "destructive",
  };
  return <Badge variant={variants[level]}>{level}</Badge>;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryRow({
  product,
  onRemove,
}: {
  product: ProductResult;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(product.created_at)}
        </td>
        <td className="px-3 py-2 text-sm font-mono">
          {product.ref_fornecedor}
        </td>
        <td className="px-3 py-2 text-sm">{product.marca}</td>
        <td className="px-3 py-2 text-sm">{product.nome_produto}</td>
        <td className="px-3 py-2">
          <span className="text-sm">{product.ncm}</span>
          {product.ncm_descricao_siscomex && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
              {product.ncm_descricao_siscomex}
            </p>
          )}
        </td>
        <td className="px-3 py-2">
          <ConfidenceBadge level={product.confianca} />
        </td>
        <td className="px-3 py-2 text-right text-sm">
          {product.preco?.sale_price_brl
            ? `R$ ${product.preco.sale_price_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            : "-"}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600"
              title="Ver detalhes"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-500"
              title="Remover do historico"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-gray-50">
          <td colSpan={8} className="px-3 py-3">
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Descricao (Sankhya)
                </span>
                <p className="text-sm">{product.descricao || <span className="italic text-muted-foreground">vazio</span>}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Descricao de importacao
                </span>
                <p className="text-sm">{product.descricao_importacao || <span className="italic text-muted-foreground">vazio</span>}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Grupo
                  </span>
                  <p className="text-sm">{product.cod_grupo}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Nome do grupo
                  </span>
                  <p className="text-sm">{product.grupo_nome}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Temp. Transporte
                  </span>
                  <p className="text-sm">{product.temp_transporte}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Temp. Armazenagem
                  </span>
                  <p className="text-sm">{product.temp_armazenagem}</p>
                </div>
              </div>
              {product.notas && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Notas da IA
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {product.notas}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ProductHistory({ products, onRemove }: ProductHistoryProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.ref_fornecedor.toLowerCase().includes(q) ||
        p.nome_produto.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.ncm.includes(q) ||
        p.cod_grupo.includes(q)
    );
  }, [products, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="w-4 h-4" />
          <span>
            {products.length} produto{products.length !== 1 ? "s" : ""} no
            historico
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Buscar por codigo, nome, marca, NCM..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {products.length === 0
            ? "Nenhum produto no historico ainda. Produtos cadastrados aparecerao aqui automaticamente."
            : "Nenhum produto encontrado para esta busca."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  DATA
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  REF
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  MARCA
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  NOME DO PRODUTO
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  NCM
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  CONF.
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  PRECO
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <HistoryRow
                  key={p.id}
                  product={p}
                  onRemove={() => onRemove(p.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {query && filtered.length > 0 && filtered.length !== products.length && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando {filtered.length} de {products.length} produtos
        </p>
      )}
    </div>
  );
}
