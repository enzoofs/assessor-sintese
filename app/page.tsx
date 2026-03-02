"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ProductForm } from "@/components/product-form";
import { BatchInput } from "@/components/batch-input";
import { ProductTable } from "@/components/product-table";
import { ProductHistory } from "@/components/product-history";
import { ProductSearch } from "@/components/product-search";
import { DataReportView } from "@/components/data-report";
import { AuditView } from "@/components/audit-view";
import { ProductResult } from "@/lib/types";
import { productStore } from "@/lib/product-store";
import { FlaskConical } from "lucide-react";

type Tab = "individual" | "lote" | "historico" | "consulta" | "relatorios" | "auditoria";

export default function Home() {
  const [tab, setTab] = useState<Tab>("individual");
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [history, setHistory] = useState<ProductResult[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const historyLoaded = useRef(false);

  const isProcessing = products.some((p) => p.status === "processing");

  // Load history from localStorage on mount
  useEffect(() => {
    if (!historyLoaded.current) {
      setHistory(productStore.getAll());
      historyLoaded.current = true;
    }
  }, []);

  // Auto-save completed products to history
  useEffect(() => {
    const doneProducts = products.filter(
      (p) => p.status === "done" && !p.created_at
    );
    if (doneProducts.length > 0) {
      const now = new Date().toISOString();
      const withTimestamp = doneProducts.map((p) => ({
        ...p,
        created_at: now,
      }));
      productStore.saveMany(withTimestamp);

      // Update products state with created_at
      setProducts((prev) =>
        prev.map((p) => {
          if (p.status === "done" && !p.created_at) {
            return { ...p, created_at: now };
          }
          return p;
        })
      );

      // Refresh history
      setHistory(productStore.getAll());
    }
  }, [products]);

  // Sync edits to history when product is updated
  function saveProductToHistory(product: ProductResult) {
    if (product.status === "done" && product.created_at) {
      productStore.save(product);
      setHistory(productStore.getAll());
    }
  }

  function checkDuplicateLocal(code: string): ProductResult | null {
    return productStore.findByCode(code);
  }

  async function checkDuplicateSankhya(
    code: string
  ): Promise<{ found: boolean; nome?: string } | null> {
    try {
      const res = await fetch(
        `/api/sankhya/check-duplicate?code=${encodeURIComponent(code)}`
      );
      const data = await res.json();
      if (data.found) {
        return { found: true, nome: data.product.nome_produto };
      }
    } catch {}
    return null;
  }

  const processProduct = useCallback(
    async (id: string, code: string, brand: string) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "processing" as const } : p
        )
      );

      try {
        const res = await fetch("/api/product/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manufacturerCode: code, brand }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro ao processar produto");
        }

        const data = await res.json();

        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "done" as const,
                  nome_produto: data.nome_produto,
                  descricao: data.descricao,
                  descricao_importacao:
                    data.descricao_importacao || data.descricao,
                  temp_transporte: data.temp_transporte,
                  temp_armazenagem: data.temp_armazenagem,
                  ncm: data.ncm,
                  ncm_descricao_siscomex: data.ncm_descricao_siscomex || "",
                  cod_grupo: data.cod_grupo,
                  grupo_nome: data.grupo_nome,
                  confianca: data.confianca,
                  notas: data.notas || "",
                  preco: data.preco || null,
                }
              : p
          )
        );
      } catch (error) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "error" as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Erro desconhecido",
                }
              : p
          )
        );
      }
    },
    []
  );

  async function addProduct(code: string, brand: string) {
    // Check local history
    const existingLocal = checkDuplicateLocal(code);
    if (existingLocal) {
      const date = existingLocal.created_at
        ? new Date(existingLocal.created_at).toLocaleDateString("pt-BR")
        : "data desconhecida";
      const confirmed = window.confirm(
        `Produto "${code}" ja foi cadastrado pelo app em ${date} (${existingLocal.nome_produto}).\n\nDeseja cadastrar novamente?`
      );
      if (!confirmed) return;
    }

    // Check Sankhya base
    if (!existingLocal) {
      const existingSankhya = await checkDuplicateSankhya(code);
      if (existingSankhya?.found) {
        const confirmed = window.confirm(
          `Produto "${code}" ja existe na base Sankhya (${existingSankhya.nome}).\n\nDeseja cadastrar novamente?`
        );
        if (!confirmed) return;
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const product: ProductResult = {
      id,
      ref_fornecedor: code,
      marca: brand,
      cod_grupo: "",
      grupo_nome: "",
      nome_produto: "",
      descricao: "",
      descricao_importacao: "",
      temp_transporte: "Ambiente",
      temp_armazenagem: "Ambiente",
      ncm: "",
      ncm_descricao_siscomex: "",
      confianca: "media",
      notas: "",
      preco: null,
      status: "pending",
    };

    setProducts((prev) => [...prev, product]);
    processProduct(id, code, brand);
  }

  async function addBatch(items: { code: string; brand: string }[]) {
    // Check for duplicates in local history
    const duplicates: string[] = [];
    for (const item of items) {
      const existing = checkDuplicateLocal(item.code);
      if (existing) {
        duplicates.push(item.code);
      }
    }

    // Check Sankhya base (batch API call)
    const nonLocalCodes = items
      .filter((item) => !duplicates.includes(item.code))
      .map((item) => item.code);

    if (nonLocalCodes.length > 0) {
      try {
        const res = await fetch("/api/sankhya/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codes: nonLocalCodes }),
        });
        const data = await res.json();
        if (data.duplicates) {
          duplicates.push(...data.duplicates);
        }
      } catch {}
    }

    let filteredItems = items;
    if (duplicates.length > 0) {
      const confirmed = window.confirm(
        `${duplicates.length} produto(s) ja cadastrado(s):\n${duplicates.join(", ")}\n\nDeseja cadastrar todos mesmo assim?\n(Cancelar = pular os duplicados)`
      );
      if (!confirmed) {
        filteredItems = items.filter(
          (item) => !duplicates.includes(item.code)
        );
        if (filteredItems.length === 0) return;
      }
    }

    const newProducts: ProductResult[] = filteredItems.map((item) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ref_fornecedor: item.code,
      marca: item.brand,
      cod_grupo: "",
      grupo_nome: "",
      nome_produto: "",
      descricao: "",
      descricao_importacao: "",
      temp_transporte: "Ambiente" as const,
      temp_armazenagem: "Ambiente" as const,
      ncm: "",
      ncm_descricao_siscomex: "",
      confianca: "media" as const,
      notas: "",
      status: "pending" as const,
      preco: null,
    }));

    setProducts((prev) => [...prev, ...newProducts]);

    newProducts.forEach((p, i) => {
      setTimeout(() => {
        processProduct(p.id, p.ref_fornecedor, p.marca);
      }, i * 3000);
    });
  }

  function updateProduct(
    id: string,
    field: keyof ProductResult,
    value: string
  ) {
    setProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      );
      const product = updated.find((p) => p.id === id);
      if (product) saveProductToHistory(product);
      return updated;
    });
  }

  function updateProductPrice(
    id: string,
    distributorPrice: number,
    currency: string
  ) {
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        const markupFactor = p.preco?.markup_factor ?? 17;
        const salePriceBrl =
          currency === "BRL"
            ? distributorPrice
            : Math.round(distributorPrice * markupFactor * 100) / 100;
        return {
          ...p,
          preco: {
            found: true,
            distributor_price: distributorPrice,
            currency,
            markup_factor: currency === "BRL" ? 1 : markupFactor,
            sale_price_brl: salePriceBrl,
            source: p.preco?.source || "Manual",
          },
        };
      });
      const product = updated.find((p) => p.id === id);
      if (product) saveProductToHistory(product);
      return updated;
    });
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function removeFromHistory(id: string) {
    productStore.remove(id);
    setHistory(productStore.getAll());
  }

  async function exportToExcel() {
    const doneProducts = products.filter((p) => p.status === "done");
    if (doneProducts.length === 0) return;

    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: doneProducts.map((p) => ({
            preco_venda: p.preco?.sale_price_brl || null,
            ref_fornecedor: p.ref_fornecedor,
            marca: p.marca,
            cod_grupo: p.cod_grupo,
            nome_produto: p.nome_produto,
            descricao: p.descricao,
            temp_transporte: p.temp_transporte,
            temp_armazenagem: p.temp_armazenagem,
            ncm: p.ncm,
          })),
        }),
      });

      if (!res.ok) throw new Error("Erro ao gerar planilha");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CADASTRO_PRODUTOS_SINTESE.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Erro ao exportar planilha"
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Gestao de Produtos
              </h1>
              <p className="text-sm text-muted-foreground">
                Sintese Assessoria Cientifica
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Input Section */}
        <div className="bg-white rounded-lg border p-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "individual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setTab("individual")}
            >
              Individual
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "lote"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setTab("lote")}
            >
              Em lote
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "historico"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setTab("historico")}
            >
              Historico
              {history.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-200 text-gray-700 rounded-full px-1.5 py-0.5">
                  {history.length}
                </span>
              )}
            </button>
            <div className="w-px bg-gray-200 mx-1" />
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "consulta"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setTab("consulta")}
            >
              Consulta
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "relatorios"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setTab("relatorios")}
            >
              Relatorios
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "auditoria"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
              }`}
              onClick={() => setTab("auditoria")}
            >
              Auditoria
            </button>
          </div>

          {tab === "individual" ? (
            <ProductForm onSubmit={addProduct} isProcessing={isProcessing} />
          ) : tab === "lote" ? (
            <BatchInput onSubmitBatch={addBatch} isProcessing={isProcessing} />
          ) : tab === "historico" ? (
            <ProductHistory
              products={history}
              onRemove={removeFromHistory}
            />
          ) : tab === "consulta" ? (
            <ProductSearch />
          ) : tab === "relatorios" ? (
            <DataReportView />
          ) : (
            <AuditView />
          )}
        </div>

        {/* Results Section - only show on cadastro tabs */}
        {(tab === "individual" || tab === "lote") && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Produtos</h2>
            <ProductTable
              products={products}
              onUpdate={updateProduct}
              onUpdatePrice={updateProductPrice}
              onRemove={removeProduct}
              onExport={exportToExcel}
              isExporting={isExporting}
            />
          </div>
        )}
      </main>
    </div>
  );
}
