export function parsePagination(
  query: { page?: string; limit?: string },
  maxLimit = 100,
): { skip: number; take: number; page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || '50', 10) || 50));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
