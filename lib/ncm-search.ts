export interface NcmEntry {
  codigo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo_ato: string;
  numero_ato: string;
  ano_ato: string;
}

// Cache the full NCM table in memory for fast lookups
let ncmTableCache: NcmEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function loadNcmTable(): Promise<NcmEntry[]> {
  const now = Date.now();
  if (ncmTableCache && now - cacheTimestamp < CACHE_TTL) {
    return ncmTableCache;
  }

  try {
    const res = await fetch(
      "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json?perfil=PUBLICO",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) throw new Error(`SISCOMEX API returned ${res.status}`);

    const data: NcmEntry[] = await res.json();
    // Filter to only leaf-level codes (8 digits, actual product codes)
    ncmTableCache = data.filter(
      (entry) => entry.codigo.replace(/\./g, "").length === 8
    );
    cacheTimestamp = now;
    return ncmTableCache;
  } catch (error) {
    console.error("Failed to load NCM table from SISCOMEX:", error);
    // Fallback to BrasilAPI if SISCOMEX is down
    return [];
  }
}

/**
 * Search NCM codes using BrasilAPI (keyword-based server-side search)
 */
export async function searchNcmBrasilApi(
  keyword: string
): Promise<NcmEntry[]> {
  try {
    const encoded = encodeURIComponent(keyword);
    const res = await fetch(
      `https://brasilapi.com.br/api/ncm/v1?search=${encoded}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return [];

    const data: NcmEntry[] = await res.json();
    // Only return leaf-level codes (8 digits)
    return data.filter(
      (entry) => entry.codigo.replace(/\./g, "").length === 8
    );
  } catch (error) {
    console.error("BrasilAPI NCM search failed:", error);
    return [];
  }
}

/**
 * Search NCM in the local cached SISCOMEX table using multiple keywords
 */
async function searchNcmLocal(keywords: string[]): Promise<NcmEntry[]> {
  const table = await loadNcmTable();
  if (table.length === 0) return [];

  const results: Map<string, { entry: NcmEntry; score: number }> = new Map();

  for (const entry of table) {
    const desc = entry.descricao.toLowerCase();
    let score = 0;

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase().trim();
      if (kw.length < 3) continue;

      if (desc.includes(kw)) {
        // Longer keyword matches are worth more
        score += kw.length;
      }
    }

    if (score > 0) {
      const existing = results.get(entry.codigo);
      if (!existing || existing.score < score) {
        results.set(entry.codigo, { entry, score });
      }
    }
  }

  return Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map((r) => r.entry);
}

/**
 * Comprehensive NCM search combining BrasilAPI and local SISCOMEX table
 * Returns top NCM candidates for the AI to choose from
 */
export async function searchNcm(
  keywords: string[]
): Promise<NcmEntry[]> {
  // Run both searches in parallel
  const [brasilApiResults, localResults] = await Promise.all([
    // Search BrasilAPI with each keyword
    Promise.all(
      keywords.slice(0, 3).map((kw) => searchNcmBrasilApi(kw))
    ).then((results) => results.flat()),
    // Search local SISCOMEX table
    searchNcmLocal(keywords),
  ]);

  // Merge and deduplicate results, prioritizing by relevance
  const merged = new Map<string, NcmEntry>();
  const scores = new Map<string, number>();

  // BrasilAPI results first (server-side filtered, higher trust)
  for (const entry of brasilApiResults) {
    const code = entry.codigo.replace(/\./g, "");
    if (!merged.has(code)) {
      merged.set(code, entry);
      scores.set(code, (scores.get(code) || 0) + 10);
    } else {
      scores.set(code, (scores.get(code) || 0) + 5);
    }
  }

  // Local results
  for (const entry of localResults) {
    const code = entry.codigo.replace(/\./g, "");
    if (!merged.has(code)) {
      merged.set(code, entry);
      scores.set(code, (scores.get(code) || 0) + 5);
    } else {
      scores.set(code, (scores.get(code) || 0) + 3);
    }
  }

  // Sort by combined score and return top results
  return Array.from(merged.entries())
    .sort((a, b) => (scores.get(b[0]) || 0) - (scores.get(a[0]) || 0))
    .slice(0, 20)
    .map(([, entry]) => entry);
}
