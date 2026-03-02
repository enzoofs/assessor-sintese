"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ProductResult, PriceInfo } from "@/lib/types";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  DollarSign,
} from "lucide-react";

interface ProductTableProps {
  products: ProductResult[];
  onUpdate: (id: string, field: keyof ProductResult, value: string) => void;
  onUpdatePrice: (id: string, distributorPrice: number, currency: string) => void;
  onRemove: (id: string) => void;
  onExport: () => void;
  isExporting: boolean;
}

const TEMP_TRANSPORTE_OPTIONS = ["Ambiente", "Gelo reciclável", "Gelo seco"];
const TEMP_ARMAZENAGEM_OPTIONS = ["Ambiente", "Refrigerado", "Congelado"];

function ConfidenceBadge({
  level,
}: {
  level: "alta" | "media" | "baixa";
}) {
  const variants: Record<string, "success" | "warning" | "destructive"> = {
    alta: "success",
    media: "warning",
    baixa: "destructive",
  };
  return <Badge variant={variants[level]}>{level}</Badge>;
}

function StatusIcon({ status }: { status: ProductResult["status"] }) {
  switch (status) {
    case "processing":
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <div className="w-4 h-4 rounded-full bg-gray-200" />;
  }
}

function EditableCell({
  value,
  onSave,
  type = "text",
  options,
}: {
  value: string;
  onSave: (val: string) => void;
  type?: "text" | "textarea" | "select";
  options?: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function save() {
    onSave(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div
        className="group cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 -mx-1"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        <span className="text-sm">{value || <span className="text-muted-foreground italic">vazio</span>}</span>
        <Pencil className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-50" />
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <div className="flex items-center gap-1">
        <select
          className="text-sm border rounded px-1 py-0.5 flex-1"
          value={draft}
          onChange={(e) => {
            onSave(e.target.value);
            setEditing(false);
          }}
          autoFocus
          onBlur={() => setEditing(false)}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className="space-y-1">
        <textarea
          className="text-sm border rounded px-2 py-1 w-full min-h-[60px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <div className="flex gap-1">
          <button onClick={save} className="text-green-600 hover:text-green-800">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={cancel} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        className="text-sm border rounded px-1 py-0.5 flex-1 min-w-0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        onBlur={save}
      />
    </div>
  );
}

function EditablePriceCell({
  preco,
  onSave,
}: {
  preco: PriceInfo | null;
  onSave: (distributorPrice: number, currency: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [currency, setCurrency] = useState("USD");

  function startEdit() {
    if (preco?.found) {
      setDraft(preco.distributor_price?.toString() || "");
      setCurrency(preco.currency || "USD");
    } else {
      setDraft("");
      setCurrency("USD");
    }
    setEditing(true);
  }

  function save() {
    const val = parseFloat(draft.replace(",", "."));
    if (!isNaN(val) && val > 0) {
      onSave(val, currency);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <select
            className="text-xs border rounded px-1 py-0.5 w-14"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="BRL">BRL</option>
          </select>
          <input
            className="text-sm border rounded px-1 py-0.5 w-20 text-right"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            placeholder="0.00"
          />
        </div>
        <div className="flex justify-end gap-1">
          <button onClick={save} className="text-green-600 hover:text-green-800">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={() => setEditing(false)} className="text-red-600 hover:text-red-800">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  if (preco?.found && preco.sale_price_brl) {
    return (
      <div
        className="group cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5"
        onClick={startEdit}
      >
        <span className="text-sm font-medium">
          R$ {preco.sale_price_brl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
        <Pencil className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-50" />
        <p className="text-xs text-muted-foreground">
          {preco.currency} {preco.distributor_price?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} x{preco.markup_factor}
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
    >
      + Adicionar preço
    </button>
  );
}

function ProductRow({
  product,
  onUpdate,
  onUpdatePrice,
  onRemove,
}: {
  product: ProductResult;
  onUpdate: (field: keyof ProductResult, value: string) => void;
  onUpdatePrice: (distributorPrice: number, currency: string) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b hover:bg-gray-50">
        <td className="px-3 py-2">
          <StatusIcon status={product.status} />
        </td>
        <td className="px-3 py-2 text-sm font-mono">
          {product.ref_fornecedor}
        </td>
        <td className="px-3 py-2 text-sm">{product.marca}</td>
        <td className="px-3 py-2">
          {product.status === "done" ? (
            <EditableCell
              value={product.nome_produto}
              onSave={(v) => onUpdate("nome_produto", v)}
            />
          ) : product.status === "error" ? (
            <span className="text-sm text-red-500">{product.error}</span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {product.status === "processing" ? "Processando..." : "Aguardando..."}
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          {product.status === "done" && (
            <div>
              <EditableCell
                value={product.ncm}
                onSave={(v) => onUpdate("ncm", v)}
              />
              {product.ncm_descricao_siscomex && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {product.ncm_descricao_siscomex}
                </p>
              )}
            </div>
          )}
        </td>
        <td className="px-3 py-2">
          {product.status === "done" && (
            <EditableCell
              value={product.temp_transporte}
              onSave={(v) => onUpdate("temp_transporte", v)}
              type="select"
              options={TEMP_TRANSPORTE_OPTIONS}
            />
          )}
        </td>
        <td className="px-3 py-2">
          {product.status === "done" && (
            <EditableCell
              value={product.temp_armazenagem}
              onSave={(v) => onUpdate("temp_armazenagem", v)}
              type="select"
              options={TEMP_ARMAZENAGEM_OPTIONS}
            />
          )}
        </td>
        <td className="px-3 py-2">
          {product.status === "done" && (
            <ConfidenceBadge level={product.confianca} />
          )}
        </td>
        <td className="px-3 py-2 text-right">
          {product.status === "done" && (
            <EditablePriceCell
              preco={product.preco}
              onSave={onUpdatePrice}
            />
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            {product.status === "done" && (
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
            )}
            <button
              onClick={onRemove}
              className="text-gray-400 hover:text-red-500"
              title="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && product.status === "done" && (
        <tr className="border-b bg-gray-50">
          <td colSpan={10} className="px-3 py-3">
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Descricao (Sankhya)
                </span>
                <EditableCell
                  value={product.descricao}
                  onSave={(v) => onUpdate("descricao", v)}
                  type="textarea"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Descricao de importacao
                </span>
                <EditableCell
                  value={product.descricao_importacao}
                  onSave={(v) => onUpdate("descricao_importacao", v)}
                  type="textarea"
                />
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Grupo
                  </span>
                  <EditableCell
                    value={product.cod_grupo}
                    onSave={(v) => onUpdate("cod_grupo", v)}
                  />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Nome do grupo
                  </span>
                  <p className="text-sm">{product.grupo_nome}</p>
                </div>
                {product.preco?.found && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      Fonte do preço
                    </span>
                    <p className="text-sm">{product.preco.source}</p>
                  </div>
                )}
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

export function ProductTable({
  products,
  onUpdate,
  onUpdatePrice,
  onRemove,
  onExport,
  isExporting,
}: ProductTableProps) {
  const doneCount = products.filter((p) => p.status === "done").length;
  const processingCount = products.filter(
    (p) => p.status === "processing"
  ).length;
  const errorCount = products.filter((p) => p.status === "error").length;

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum produto adicionado. Use o formulario acima para buscar produtos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          <span>
            Total: <strong>{products.length}</strong>
          </span>
          {doneCount > 0 && (
            <span className="text-green-600">
              Prontos: <strong>{doneCount}</strong>
            </span>
          )}
          {processingCount > 0 && (
            <span className="text-blue-600">
              Processando: <strong>{processingCount}</strong>
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-red-600">
              Erros: <strong>{errorCount}</strong>
            </span>
          )}
        </div>
        <Button
          onClick={onExport}
          disabled={doneCount === 0 || isExporting}
          variant="default"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1.5" />
          )}
          Exportar para Sankhya ({doneCount})
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10"></th>
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
                TEMP. TRANSP.
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                TEMP. ARMAZ.
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                CONF.
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                PREÇO VENDA
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onUpdate={(field, value) => onUpdate(p.id, field, value)}
                onUpdatePrice={(price, currency) => onUpdatePrice(p.id, price, currency)}
                onRemove={() => onRemove(p.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
