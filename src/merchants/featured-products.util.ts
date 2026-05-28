export const MAX_FEATURED_PRODUCTS = 12;

export function parseFeaturedProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
}
