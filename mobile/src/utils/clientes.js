export const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload,
      current_page: 1,
      total_pages: 1,
      page_size: payload.length,
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
      current_page: 1,
      total_pages: 1,
      page_size: 0,
    };
  }

  return {
    count: payload.count ?? payload.results?.length ?? 0,
    next: payload.next ?? null,
    previous: payload.previous ?? null,
    results: payload.results ?? [],
    current_page: payload.current_page ?? 1,
    total_pages: payload.total_pages ?? 1,
    page_size: payload.page_size ?? payload.results?.length ?? 0,
  };
};
