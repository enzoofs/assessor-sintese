import ExcelJS from "exceljs";

export interface ProductRow {
  preco_venda: number | null;
  ref_fornecedor: string;
  marca: string;
  cod_grupo: string;
  nome_produto: string;
  descricao: string;
  temp_transporte: string;
  temp_armazenagem: string;
  ncm: string;
}

// Default values for Sankhya columns J-AG (as seen in the template)
const DEFAULTS = {
  cod_vol: "",         // J - Código da unidade de venda (user fills)
  origem_prod: "",     // K - Origem do produto (user fills)
  cod_produto: "",     // L - Código do produto (TI fills)
  id_externo: "",      // M - Identificador externo
  uso_produto: "",     // N - Uso do produto
  desc_max: "S",       // O - Desconto máximo permitido
  controle_local: "S", // P - Usa controle por local de estoque
  tipo_controle: "S",  // Q - Tipo de controle de estoque
  ipi_compra: "S",     // R - Tem IPI na compra
  ipi_venda: "S",      // S - Tem IPI na venda
  cst_ipi_entrada: "S",// T - CST de IPI na entrada
  cst_ipi_saida: "S",  // U - CST de IPI na saída
  icms: "S",           // V - Produto tem ICMS?
  grupo_icms: "S",     // W - Grupo/parametrização de ICMS
  difal: "S",          // X - Calcula DIFAL
  cod_barras_qtd: "S", // Y - Usa código de barras por quantidade
  permite_compra: "S", // Z - Permite compra do produto
  local_estoque: "S",  // AA - Código do local padrão de estoque
  gera_comissao: "S",  // AB - Produto gera comissão?
  moeda: "S",          // AC - Moeda
  grupo_pis: "S",      // AE - Grupos de tributos PIS/COFINS/CSLL
};

export async function generateSankhyaExcel(
  products: ProductRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("PLANILHA_MODELO_TGFPRO_SINTESE_");

  // Row 1: "Quem preenche" headers
  const headerRow1 = sheet.getRow(1);
  headerRow1.getCell("A").value = "ASSESSORIA";
  headerRow1.getCell("B").value = "Quem preenche";
  headerRow1.getCell("C").value = "VENDEDOR (SOLICITANTE)";
  ["D", "E", "F", "G", "H", "I"].forEach((col) => {
    headerRow1.getCell(col).value = "ASSESSORIA";
  });
  ["J", "K"].forEach((col) => {
    headerRow1.getCell(col).value = "ADMINISTRATIVO";
  });
  [
    "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y",
    "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG",
  ].forEach((col) => {
    headerRow1.getCell(col).value = "T.I.";
  });

  // Row 2: "Valor padrão" (N/S indicators)
  const headerRow2 = sheet.getRow(2);
  headerRow2.getCell("A").value = "N";
  ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"].forEach(
    (col) => {
      headerRow2.getCell(col).value = "N";
    }
  );
  [
    "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB",
    "AC", "AD", "AE", "AF", "AG",
  ].forEach((col) => {
    headerRow2.getCell(col).value = "S";
  });

  // Row 3: Field descriptions
  const headerRow3 = sheet.getRow(3);
  const fieldNames: Record<string, string> = {
    A: "Preço de venda (R$)",
    B: "Referência do fornecedor",
    C: "Marca do produto",
    D: "Codigo do grupo de produtos",
    E: "Nome produto",
    F: "Descricao do produto",
    G: "Temperatura Transporte",
    H: "Temperatura Armazenagem",
    I: "Classificação Fiscal",
    J: "Código da unidade de venda",
    K: "Origem do produto",
    L: "Código do produto",
    M: "Identificador externo",
    N: "Uso do produto",
    O: "Desconto máximo permitido",
    P: "Usa controle por local de estoque",
    Q: "Tipo de controle de estoque",
    R: "Tem IPI na compra? (S/N)",
    S: "Tem IPI na venda? (S/N)",
    T: "CST de IPI na entrada",
    U: "CST de IPI na saída",
    V: "Produto tem ICMS?",
    W: "Grupo/parametrização de ICMS",
    X: "Calcula DIFAL",
    Y: "Usa código de barras por quantidade",
    Z: "Permite compra do produto",
    AA: "Código do local padrão de estoque",
    AB: "Produto gera comissão?",
    AC: "Moeda",
    AE: "Grupos de tributos PIS/COFINS/CSLL",
  };

  for (const [col, name] of Object.entries(fieldNames)) {
    headerRow3.getCell(col).value = name;
  }

  // Style headers
  for (let row = 1; row <= 3; row++) {
    const r = sheet.getRow(row);
    r.font = { bold: true, size: 10 };
    r.alignment = { wrapText: true, vertical: "middle" };
  }

  // Add product data starting at row 4
  products.forEach((product, index) => {
    const row = sheet.getRow(4 + index);
    if (product.preco_venda) {
      row.getCell("A").value = product.preco_venda;
      row.getCell("A").numFmt = '#,##0.00';
    }
    row.getCell("B").value = product.ref_fornecedor;
    row.getCell("C").value = product.marca;
    row.getCell("D").value = product.cod_grupo;
    row.getCell("E").value = product.nome_produto;
    row.getCell("F").value = product.descricao;
    row.getCell("G").value = product.temp_transporte;
    row.getCell("H").value = product.temp_armazenagem;

    // NCM as number if it's all digits
    const ncmNum = parseInt(product.ncm, 10);
    row.getCell("I").value = isNaN(ncmNum) ? product.ncm : ncmNum;
  });

  // Set column widths
  sheet.getColumn("A").width = 18;
  sheet.getColumn("B").width = 20;
  sheet.getColumn("C").width = 18;
  sheet.getColumn("D").width = 30;
  sheet.getColumn("E").width = 50;
  sheet.getColumn("F").width = 80;
  sheet.getColumn("G").width = 18;
  sheet.getColumn("H").width = 18;
  sheet.getColumn("I").width = 15;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
