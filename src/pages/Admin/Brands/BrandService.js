import brandApi from "../../../services/brandApi";

export const ADMIN_BRAND_PAGE_SIZE = 10;
export const BRAND_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/svg+xml",
  "image/webp",
];
export const MAX_BRAND_IMAGE_SIZE = 2 * 1024 * 1024;

export function isBrandActive(brand = {}) {
  const status = brand.status ?? brand.is_active ?? brand.active;

  if (status === undefined || status === null || status === "") {
    return true;
  }

  if (typeof status === "boolean") {
    return status;
  }

  if (typeof status === "number") {
    return status !== 0;
  }

  return !["0", "false", "inactive", "disabled", "locked"].includes(
    String(status).trim().toLowerCase(),
  );
}

export function getBrandLogoValue(brand = {}) {
  return String(
    brand.logo_url ||
      brand.logoUrl ||
      brand.logo ||
      brand.image_url ||
      brand.imageUrl ||
      brand.image ||
      brand.avatar ||
      "",
  ).trim();
}

export function normalizeBrand(brand = {}) {
  const active = isBrandActive(brand);

  return {
    id: brand.id ?? brand.brand_id ?? brand.brandId ?? brand._id,
    name: brand.name || brand.brand_name || brand.label || brand.title || "Brand",
    slug: brand.slug || brand.brand_slug || "",
    description: brand.description || brand.desc || "",
    logo: getBrandLogoValue(brand),
    status: active ? "active" : "inactive",
    active,
    createdAt:
      brand.created_at ||
      brand.createdAt ||
      brand.created_date ||
      brand.createdDate ||
      "",
    raw: brand,
  };
}

export function normalizeBrandPagination(payload = {}, fallbackPage = 1) {
  const meta = payload?.meta || payload?.pagination || payload?.page || {};
  const total = Number(
    payload?.total ??
      payload?.total_items ??
      payload?.totalItems ??
      meta.total ??
      meta.total_items ??
      meta.totalItems ??
      0,
  );
  const perPage = Number(
    payload?.per_page ??
      payload?.perPage ??
      payload?.limit ??
      meta.per_page ??
      meta.perPage ??
      meta.limit ??
      ADMIN_BRAND_PAGE_SIZE,
  );
  const currentPage = Number(
    payload?.current_page ??
      payload?.currentPage ??
      payload?.page ??
      meta.current_page ??
      meta.currentPage ??
      meta.page ??
      fallbackPage,
  );
  const lastPage = Number(
    payload?.last_page ??
      payload?.lastPage ??
      payload?.total_pages ??
      payload?.totalPages ??
      meta.last_page ??
      meta.lastPage ??
      meta.total_pages ??
      meta.totalPages ??
      (total > 0 ? Math.ceil(total / Math.max(perPage, 1)) : 1),
  );

  return {
    currentPage: Math.max(1, currentPage || fallbackPage),
    lastPage: Math.max(1, lastPage || 1),
    perPage: Math.max(1, perPage || ADMIN_BRAND_PAGE_SIZE),
    total: Math.max(0, total || 0),
  };
}

export function validateBrandLogoFile(file) {
  if (!file) {
    return "";
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["jpg", "jpeg", "png", "svg", "webp"];

  if (
    !BRAND_IMAGE_TYPES.includes(file.type) &&
    !allowedExtensions.includes(extension)
  ) {
    return "Logo chi ho tro jpg, jpeg, png, svg hoac webp.";
  }

  if (file.size > MAX_BRAND_IMAGE_SIZE) {
    return "Logo không được vượt quá 2MB.";
  }

  return "";
}

export function createBrandPayload(values, logoFile) {
  const normalizedValues = {
    description: values.description.trim(),
    logo: values.logoUrl.trim(),
    name: values.name.trim(),
    status: values.status,
  };

  if (!logoFile) {
    return normalizedValues;
  }

  const formData = new FormData();
  formData.append("name", normalizedValues.name);
  formData.append("description", normalizedValues.description);
  formData.append("status", normalizedValues.status);
  formData.append("logo", logoFile);

  return formData;
}

export default brandApi;
