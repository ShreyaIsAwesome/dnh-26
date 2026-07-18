import Typesense from 'typesense';

const typesenseHost = import.meta.env.VITE_TYPESENSE_HOST as string;
const typesenseKey  = import.meta.env.VITE_TYPESENSE_SEARCH_KEY as string;

// Without these env vars the Typesense constructor throws at import time,
// which would crash the whole app — so fall back to a null client instead.
export const typesenseClient =
  typesenseHost && typesenseKey
    ? new Typesense.Client({
        nodes: [
          {
            host:     typesenseHost,
            port:     Number(import.meta.env.VITE_TYPESENSE_PORT) || 443,
            protocol: (import.meta.env.VITE_TYPESENSE_PROTOCOL as string) || 'https',
          },
        ],
        apiKey:         typesenseKey,
        connectionTimeoutSeconds: 5,
      })
    : null;

export interface IngredientHit {
  id:       string;
  name:     string;
  category: string;
  unit?:    string;
}

/**
 * Search the Typesense ingredients catalog.
 * Returns up to `limit` matches with typo-tolerance.
 */
export async function searchIngredients(
  query: string,
  limit = 8,
): Promise<IngredientHit[]> {
  if (!typesenseClient || !query.trim()) return [];

  try {
    const result = await typesenseClient
      .collections<IngredientHit>('ingredients')
      .documents()
      .search({
        q:                  query,
        query_by:           'name',
        per_page:           limit,
        num_typos:          2,
        typo_tokens_threshold: 1,
      });

    return (result.hits ?? []).map((h) => h.document);
  } catch {
    return [];
  }
}
