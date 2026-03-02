export interface PriceInfo {
  found: boolean;
  distributor_price: number | null;
  currency: string | null;
  markup_factor: number;
  sale_price_brl: number | null;
  source: string | null;
}

export interface ProductResult {
  id: string;
  ref_fornecedor: string;
  marca: string;
  cod_grupo: string;
  grupo_nome: string;
  nome_produto: string;
  descricao: string;
  descricao_importacao: string;
  temp_transporte: "Ambiente" | "Gelo reciclável" | "Gelo seco";
  temp_armazenagem: "Ambiente" | "Refrigerado" | "Congelado";
  ncm: string;
  ncm_descricao_siscomex: string;
  confianca: "alta" | "media" | "baixa";
  notas: string;
  preco: PriceInfo | null;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  created_at?: string;
}

// Produto importado do Sankhya (TODOSITENS.xlsx)
export interface SankhyaProduct {
  codprod: number | null;
  ref_fornecedor: string;
  marca: string;
  cod_grupo: number;
  grupo_nome: string;
  nome_produto: string;
  descricao: string;
  temp_transporte: string;
  temp_armazenagem: string;
  ncm: string;
}

// Auditoria de cadastros
export interface AuditIssue {
  codprod: number | null;
  ref_fornecedor: string;
  marca: string;
  nome_produto: string;
  issue_type: "wrong_group" | "wrong_ncm" | "unmapped_brand" | "unmapped_group";
  current_value: string;
  current_label: string;
  suggested_value: string;
  suggested_label: string;
  confidence: "alta" | "media" | "baixa";
  notes: string;
}

export interface AuditResult {
  total_audited: number;
  group_issues: AuditIssue[];
  ncm_issues: AuditIssue[];
  unmapped_brands: { brand: string; count: number }[];
}

// Relatório de qualidade dos dados
export interface DataReport {
  total: number;
  duplicates: { ref: string; count: number; products: { codprod: number | null; nome: string }[] }[];
  missing_ncm: SankhyaProduct[];
  missing_descricao: SankhyaProduct[];
  missing_temp_transporte: SankhyaProduct[];
  missing_temp_armazenagem: SankhyaProduct[];
  missing_ref: SankhyaProduct[];
  missing_grupo: SankhyaProduct[];
}
