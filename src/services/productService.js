import { API_BASE_URL } from "../config/api";

async function requestProducts(path, {
  page = 1,
  limit = 15,
  category,
  brand,
  search,
  sort,
  order,
  signal,
} = {}) {
  const params = new URLSearchParams();

  params.append("page", String(page));
  params.append("limit", String(limit));

  if (category) params.append("category", category);
  if (brand) params.append("brand", brand);
  if (search) params.append("search", search);
  if (sort) params.append("sort", sort);
  if (order) params.append("order", order);

  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}${path}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Không thể tải sản phẩm");
  }

  return response.json();
}

export function getProducts(options = {}) {
  return requestProducts("/products", options);
}

export function getSaleProducts(options = {}) {
  return requestProducts("/products/sale", options);
}

export async function getCategories({ limit, signal } = {}) {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const params = new URLSearchParams();

  if (limit) {
    params.append("limit", String(limit));
  }

  const query = params.toString();
  const response = await fetch(`${baseUrl}/categories${query ? `?${query}` : ""}`, {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error("Không thể tải danh mục");
  }

  return response.json();
}
