/**
 * Script para converter TODOSITENS.xlsx → data/sankhya-products.json
 * Rodar: node scripts/import-sankhya.js
 * Re-rodar sempre que atualizar a planilha
 */
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "..", "TODOSITENS.xlsx");
const OUTPUT = path.join(__dirname, "..", "data", "sankhya-products.json");

// Normalizar temperatura de transporte
function normalizeTransporte(val) {
  if (!val) return "";
  const v = String(val).trim().toLowerCase();
  if (v === "ambiente") return "Ambiente";
  if (["gelpack", "gel", "2 a 8 °c", "2 a 8 ¿c", "2 a 8°c"].includes(v))
    return "Gelo reciclável";
  if (["gelo seco", "dryice", "dry ice"].includes(v)) return "Gelo seco";
  return String(val).trim();
}

// Normalizar temperatura de armazenagem
function normalizeArmazenagem(val) {
  if (!val) return "";
  const v = String(val).trim().toLowerCase();
  if (v === "ambiente") return "Ambiente";
  if (["refri", "refrigerado", "2 a 8 °c", "2 a 8 ¿c", "2 a 8°c"].includes(v))
    return "Refrigerado";
  if (["cong", "congelado", "-20 °c", "-20 ¿c", "-20°c"].includes(v))
    return "Congelado";
  return String(val).trim();
}

async function main() {
  console.log("Reading", INPUT);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(INPUT);
  const ws = wb.worksheets[0];

  const products = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const refForn = String(row.getCell(1).value || "").trim(); // REFFORN
    const marca = String(row.getCell(2).value || "").trim(); // MARCA
    const codGrupo = row.getCell(3).value; // CODGRUPOPROD
    const descrProd = String(row.getCell(4).value || "").trim(); // DESCRPROD
    const obsEtiqueta = String(row.getCell(5).value || "").trim(); // OBSETIQUETA
    const condTransp = row.getCell(6).value; // AD_CONDTRANSP
    const tempArmaz = row.getCell(7).value; // AD_TEMPARMAZ
    const ncm = String(row.getCell(8).value || "").trim(); // NCM
    const codProd = row.getCell(11).value; // CODPROD

    products.push({
      codprod: codProd ? Number(codProd) : null,
      ref_fornecedor: refForn,
      marca,
      cod_grupo: codGrupo ? Number(codGrupo) : 0,
      nome_produto: descrProd,
      descricao: obsEtiqueta,
      temp_transporte: normalizeTransporte(condTransp),
      temp_armazenagem: normalizeArmazenagem(tempArmaz),
      ncm: ncm.replace(/\./g, ""),
    });
  }

  console.log(`Processed ${products.length} products`);

  // Stats
  const noRef = products.filter((p) => !p.ref_fornecedor).length;
  const noNcm = products.filter((p) => !p.ncm).length;
  const noDesc = products.filter((p) => !p.descricao).length;
  const noTemp = products.filter((p) => !p.temp_transporte).length;
  console.log(
    `Missing: ref=${noRef}, ncm=${noNcm}, descricao=${noDesc}, temp=${noTemp}`
  );

  fs.writeFileSync(OUTPUT, JSON.stringify(products, null, 0));
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`Written to ${OUTPUT} (${sizeMB} MB)`);
}

main().catch(console.error);
