import { ProductResult } from "./types";

// ============================================================
// Camada de abstração de storage de produtos
// Atualmente usa localStorage. Para migrar para SQLite:
//   1. Instalar: prisma, @prisma/client, better-sqlite3
//   2. Criar schema Prisma com tabela "products"
//   3. Implementar SqliteProductStore com a mesma interface
//   4. Trocar a instância exportada no final deste arquivo
// TODO: Migrar para SQLite quando deploy em servidor
// ============================================================

const STORAGE_KEY = "sintese_products_history";

export interface ProductStore {
  save(product: ProductResult): void;
  saveMany(products: ProductResult[]): void;
  getAll(): ProductResult[];
  search(query: string): ProductResult[];
  findByCode(refFornecedor: string): ProductResult | null;
  remove(id: string): void;
  count(): number;
}

class LocalStorageProductStore implements ProductStore {
  private cache: ProductResult[] | null = null;

  private load(): ProductResult[] {
    if (this.cache) return this.cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.cache = raw ? JSON.parse(raw) : [];
    } catch {
      this.cache = [];
    }
    return this.cache!;
  }

  private persist(products: ProductResult[]): void {
    this.cache = products;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error("[ProductStore] Failed to persist:", e);
    }
  }

  save(product: ProductResult): void {
    const products = this.load();
    const existing = products.findIndex((p) => p.id === product.id);
    if (existing >= 0) {
      products[existing] = product;
    } else {
      products.unshift({ ...product, created_at: product.created_at || new Date().toISOString() });
    }
    this.persist(products);
  }

  saveMany(newProducts: ProductResult[]): void {
    const products = this.load();
    const now = new Date().toISOString();
    for (const product of newProducts) {
      const existing = products.findIndex((p) => p.id === product.id);
      if (existing >= 0) {
        products[existing] = product;
      } else {
        products.unshift({ ...product, created_at: product.created_at || now });
      }
    }
    this.persist(products);
  }

  getAll(): ProductResult[] {
    return this.load();
  }

  search(query: string): ProductResult[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.load();
    return this.load().filter(
      (p) =>
        p.ref_fornecedor.toLowerCase().includes(q) ||
        p.nome_produto.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.ncm.includes(q) ||
        p.cod_grupo.includes(q)
    );
  }

  findByCode(refFornecedor: string): ProductResult | null {
    const code = refFornecedor.toUpperCase().trim();
    return this.load().find((p) => p.ref_fornecedor.toUpperCase().trim() === code) || null;
  }

  remove(id: string): void {
    const products = this.load().filter((p) => p.id !== id);
    this.persist(products);
  }

  count(): number {
    return this.load().length;
  }
}

// Instância única exportada - trocar por SqliteProductStore no futuro
export const productStore: ProductStore = new LocalStorageProductStore();
