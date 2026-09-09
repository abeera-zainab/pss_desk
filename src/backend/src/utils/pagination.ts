// Normalizes ?page= and ?limit= query params into Prisma skip/take plus
// a helper to shape the paginated response envelope.
export interface PageParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function parsePagination(query: any): PageParams {
  let page = parseInt(query?.page, 10);
  let limit = parseInt(query?.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 500) limit = 500;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paginated<T>(data: T[], total: number, p: PageParams) {
  return {
    data,
    page: p.page,
    limit: p.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.limit))
  };
}
