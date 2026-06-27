import { slugify } from "./formatters";

export function getCatalogLabel(option = {}) {
  option ||= {};

  return option.name || option.label || option.title || option.brand_name || "";
}

export function getCatalogSlug(option = {}) {
  option ||= {};

  return (
    option.slug ||
    option.category_slug ||
    option.categorySlug ||
    option.brand_slug ||
    option.brandSlug ||
    ""
  );
}

export function getCatalogId(option = {}) {
  option ||= {};

  return (
    option.id ??
    option.category_id ??
    option.categoryId ??
    option.brand_id ??
    option.brandId ??
    ""
  );
}

export function getCatalogFilterValue(option = {}) {
  const slug = getCatalogSlug(option);
  const id = getCatalogId(option);
  const label = getCatalogLabel(option);

  return String(slug || id || (label ? slugify(label) : "") || "");
}

export function getCatalogComparableValues(option = {}) {
  const label = getCatalogLabel(option);

  return [
    getCatalogId(option),
    getCatalogSlug(option),
    label,
    label ? slugify(label) : "",
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => String(value));
}

export function isCatalogFilterActive(option = {}, value = "") {
  if (!value) {
    return false;
  }

  return getCatalogComparableValues(option).includes(String(value));
}

export function findCatalogOptionByValue(options = [], value = "") {
  if (!value) {
    return null;
  }

  return options.find((option) => isCatalogFilterActive(option, value)) || null;
}

export function findCatalogOptionBySearchTerm(options = [], value = "") {
  const rawValue = String(value || "").trim();
  const normalizedValue = slugify(rawValue);

  if (!rawValue || !normalizedValue) {
    return null;
  }

  return (
    options.find((option) =>
      getCatalogComparableValues(option).some((candidate) => {
        const rawCandidate = String(candidate || "").trim();

        return (
          rawCandidate.toLowerCase() === rawValue.toLowerCase() ||
          slugify(rawCandidate) === normalizedValue
        );
      }),
    ) || null
  );
}

export function getCatalogSearchMatches(options = [], value = "", limit = 5) {
  const rawValue = String(value || "").trim();
  const normalizedValue = slugify(rawValue);

  if (!rawValue || !normalizedValue) {
    return [];
  }

  const rawLowerValue = rawValue.toLowerCase();

  return options
    .map((option) => {
      const values = getCatalogComparableValues(option);
      let score = Number.POSITIVE_INFINITY;

      values.forEach((candidate) => {
        const rawCandidate = String(candidate || "").trim();
        const rawLowerCandidate = rawCandidate.toLowerCase();
        const normalizedCandidate = slugify(rawCandidate);

        if (!rawCandidate || !normalizedCandidate) {
          return;
        }

        if (
          rawLowerCandidate === rawLowerValue ||
          normalizedCandidate === normalizedValue
        ) {
          score = Math.min(score, 0);
          return;
        }

        if (
          rawLowerCandidate.startsWith(rawLowerValue) ||
          normalizedCandidate.startsWith(normalizedValue)
        ) {
          score = Math.min(score, 1);
          return;
        }

        if (
          rawLowerCandidate.includes(rawLowerValue) ||
          normalizedCandidate.includes(normalizedValue)
        ) {
          score = Math.min(score, 2);
        }
      });

      return {
        label: getCatalogLabel(option),
        option,
        score,
      };
    })
    .filter((item) => Number.isFinite(item.score))
    .sort((first, second) => {
      if (first.score !== second.score) {
        return first.score - second.score;
      }

      return first.label.length - second.label.length;
    })
    .slice(0, limit)
    .map((item) => item.option);
}

export function resolveCatalogSearchPath({
  brands = [],
  categories = [],
  query = "",
} = {}) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    return "/products";
  }

  const category = findCatalogOptionBySearchTerm(categories, trimmedQuery);

  if (category) {
    return buildProductsPath({
      category: getCatalogFilterValue(category),
    });
  }

  const brand = findCatalogOptionBySearchTerm(brands, trimmedQuery);

  if (brand) {
    return buildProductsPath({
      brand: getCatalogFilterValue(brand),
    });
  }

  return `/products?search=${encodeURIComponent(trimmedQuery)}`;
}

export function buildProductsPath({
  basePath = "/products",
  brand = "",
  category = "",
  searchParams,
} = {}) {
  const params = new URLSearchParams(searchParams || "");
  const categoryValue = String(category || "");
  const brandValue = String(brand || "");

  params.delete("category");
  params.delete("category_id");
  params.delete("brand");
  params.delete("page");

  if (basePath !== "/products") {
    if (categoryValue) {
      params.set("category", categoryValue);
    }

    if (brandValue) {
      params.set("brand", brandValue);
    }

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  let path = "/products";

  if (categoryValue && brandValue) {
    path = `/products/category/${encodeURIComponent(categoryValue)}/brand/${encodeURIComponent(brandValue)}`;
  } else if (categoryValue) {
    path = `/products/category/${encodeURIComponent(categoryValue)}`;
  } else if (brandValue) {
    path = `/products/brand/${encodeURIComponent(brandValue)}`;
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
