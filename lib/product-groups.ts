import brandGroupsData from "@/data/brand-groups.json";

export interface ProductGroup {
  code: string;
  name: string;
  category: string;
}

const brandGroups: Record<string, ProductGroup[]> = brandGroupsData;

export const BRANDS = Object.keys(brandGroups).filter(
  (b) => b !== "NGS ARCHER"
);

export function getGroupsForBrand(brand: string): ProductGroup[] {
  // Normalize brand name for lookup (handle BIO-RAD vs BIORAD etc.)
  const normalized = brand.toUpperCase().trim();

  // Direct match
  if (brandGroups[normalized]) {
    return brandGroups[normalized];
  }

  // Try partial match
  for (const [key, groups] of Object.entries(brandGroups)) {
    if (
      key.includes(normalized) ||
      normalized.includes(key) ||
      key.replace(/[\s-]/g, "") === normalized.replace(/[\s-]/g, "")
    ) {
      return groups;
    }
  }

  return [];
}

export function inferProductGroup(
  brand: string,
  isEquipment: boolean
): string | null {
  const groups = getGroupsForBrand(brand);
  if (groups.length === 0) return null;

  if (isEquipment) {
    const equipGroup = groups.find(
      (g) =>
        g.category.includes("EQUIP") ||
        g.category.includes("ACESS") ||
        g.category.includes("CONSUM")
    );
    return equipGroup?.code || groups[0].code;
  }

  // Default to reagents
  const reagentGroup = groups.find(
    (g) =>
      g.category.includes("REAGENT") ||
      g.category.includes("BIOMOL") ||
      g.category.includes("PCR") ||
      g.category.includes("QPCR")
  );
  return reagentGroup?.code || groups[0].code;
}
