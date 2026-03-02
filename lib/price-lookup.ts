import priceIndex from "@/data/price-index.json";

interface PriceEntry {
  code: string;
  description: string;
  price: number;
  currency: "USD" | "EUR" | "BRL";
  brand: string;
  source: string;
}

const prices: PriceEntry[] = priceIndex as PriceEntry[];

// Build an index for fast lookups
const codeIndex = new Map<string, PriceEntry[]>();
for (const entry of prices) {
  const key = entry.code.toUpperCase().trim();
  if (!codeIndex.has(key)) {
    codeIndex.set(key, []);
  }
  codeIndex.get(key)!.push(entry);
}

// Markup factors per brand
const MARKUP_FACTORS: Record<string, number> = {
  HIMEDIA: 20,
  "BIOTECH RABBIT": 18,
  THISTLE: 18,
  BENCHMARK: 17,
  ACCURIS: 17,
  HERMLE: 17,
  "BIO-RAD": 1, // Already in BRL, no markup needed
  IDT: 17,
  ZYMO: 17,
  "PCR BIOSYSTEMS": 17,
  INVITEK: 17,
  INVIVOGEN: 17,
  MTC: 17,
  IMPLEN: 17,
};

export interface PriceLookupResult {
  found: boolean;
  distributor_price: number | null;
  currency: string | null;
  markup_factor: number;
  sale_price_brl: number | null;
  source: string | null;
}

export function lookupPrice(
  manufacturerCode: string,
  brand: string
): PriceLookupResult {
  const code = manufacturerCode.toUpperCase().trim();
  const normalizedBrand = brand.toUpperCase().trim();
  const factor = MARKUP_FACTORS[normalizedBrand] || 17;

  // Direct match
  const matches = codeIndex.get(code);
  if (matches) {
    // Prefer match with same brand
    const brandMatch = matches.find(
      (m) => m.brand.toUpperCase() === normalizedBrand
    );
    const entry = brandMatch || matches[0];

    let salePriceBrl: number | null = null;
    if (entry.currency === "BRL") {
      // Bio-Rad: already in BRL
      salePriceBrl = entry.price;
    } else {
      // USD/EUR: multiply by factor
      salePriceBrl = Math.round(entry.price * factor * 100) / 100;
    }

    return {
      found: true,
      distributor_price: entry.price,
      currency: entry.currency,
      markup_factor: entry.currency === "BRL" ? 1 : factor,
      sale_price_brl: salePriceBrl,
      source: entry.source,
    };
  }

  // Try removing trailing size suffixes for partial match
  // e.g., "M085I-100G" -> try "M085I"
  const withoutSize = code.replace(
    /[-_]?\d+[A-Z]*(ML|G|KG|L|NO|UG|MG|UL|RXN|RXNS|PREPS|UNITS)$/i,
    ""
  );
  if (withoutSize !== code && codeIndex.has(withoutSize)) {
    const matches2 = codeIndex.get(withoutSize)!;
    const entry = matches2.find(
      (m) => m.brand.toUpperCase() === normalizedBrand
    ) || matches2[0];

    let salePriceBrl: number | null = null;
    if (entry.currency === "BRL") {
      salePriceBrl = entry.price;
    } else {
      salePriceBrl = Math.round(entry.price * factor * 100) / 100;
    }

    return {
      found: true,
      distributor_price: entry.price,
      currency: entry.currency,
      markup_factor: entry.currency === "BRL" ? 1 : factor,
      sale_price_brl: salePriceBrl,
      source: entry.source + " (partial match)",
    };
  }

  return {
    found: false,
    distributor_price: null,
    currency: null,
    markup_factor: factor,
    sale_price_brl: null,
    source: null,
  };
}

export function getTotalIndexedProducts(): number {
  return prices.length;
}
