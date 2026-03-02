"use client";

import { useState, useCallback } from "react";
import { SankhyaProduct } from "@/lib/types";
import { Badge } from "./ui/badge";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
} from "lucide-react";

interface ProductSearchProps {}

function TempBadge({ value, type }: { value: string; type: "transporte" | "armazenagem" }) {
  if (!value) return <span className="text-muted-foreground text-xs italic">-</span>;

  const colors: Record<string, string> = {
    Ambiente: "bg-green-100 text-green-800",
    "Gelo reciclável": "bg-blue-100 text-blue-800",
    "Gelo seco": "bg-purple-100 text-purple-800",
    Refrigerado: "bg-cyan-100 text-cyan-800",
    Congelado: "bg-indigo-100 text-indigo-800",
  };

  return (
    <span
      className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded ${
        colors[value] || "bg-gray-100 text-gray-700"
      }`}
    >
      {value}
    </span>
  );
}

function SearchRow({ product }: { product: SankhyaProduct }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {product.codprod || "-"}
        </td>
        <td className="px-3 py-2 text-sm font-mono">
          {product.ref_fornecedor || (
            <span className="italic text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-3 py-2 text-sm">{product.marca}</td>
        <td className="px-3 py-2 text-sm max-w-xs truncate" title={product.nome_produto}>
          {product.nome_produto}
        </td>
        <td className="px-3 py-2">
          <span className="text-sm font-mono">{product.ncm || "-"}</span>
        </td>
        <td className="px-3 py-2">
          <TempBadge value={product.temp_transporte} type="transporte" />
        </td>
        <td className="px-3 py-2">
          <TempBadge value={product.temp_armazenagem} type="armazenagem" />
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {product.grupo_nome || (product.cod_grupo ? String(product.cod_grupo) : "-")}
        </td>
        <td className="px-3 py-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600"
            title="Ver descricao completa"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-gray-50">
          <td colSpan={9} className="px-3 py-3">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Descricao completa (OBSETIQUETA)
              </span>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {product.descricao || (
                  <span className="italic text-muted-foreground">
                    Sem descricao
                  </span>
                )}
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ProductSearch({}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SankhyaProduct[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);

  const doSearch = useCallback(
    async (searchQuery?: string) => {
      const q = (searchQuery ?? query).trim();
      setLoading(true);
      setSearched(true);
      setDisplayLimit(50);
      try {
        const res = await fetch(
          `/api/sankhya/search?q=${encodeURIComponent(q)}&limit=500`
        );
        const data = await res.json();
        setProducts(data.products);
        setTotal(data.total);
      } catch {
        setProducts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Database className="w-4 h-4" />
        <span>Base completa Sankhya - pesquise por codigo, nome, marca, NCM, grupo...</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar por codigo, nome, marca, NCM, grupo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doSearch();
            }}
          />
        </div>
        <button
          onClick={() => doSearch()}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Buscar
        </button>
      </div>

      {!searched ? (
        <div className="text-center py-12 text-muted-foreground">
          Digite uma busca e pressione Enter ou clique em Buscar.
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando...
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum produto encontrado para &quot;{query}&quot;.
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {total} resultado{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            {products.length < (total || 0) && ` (mostrando ${products.length})`}
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    COD
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    REF
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    MARCA
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    NOME
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    NCM
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    TRANSP.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    ARMAZ.
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    GRUPO
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10"></th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, displayLimit).map((p, i) => (
                  <SearchRow
                    key={`${p.codprod}-${p.ref_fornecedor}-${i}`}
                    product={p}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {products.length > displayLimit && (
            <div className="text-center">
              <button
                onClick={() => setDisplayLimit((prev) => prev + 50)}
                className="text-sm text-primary hover:underline"
              >
                Mostrar mais ({products.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
