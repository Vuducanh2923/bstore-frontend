import { API_BASE_URL } from "../services/api";

export function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function truthySaleFlag(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized !== "" && !["0", "false", "no", "off"].includes(normalized);
  }

  return false;
}

export function calculateSalePrice(price, salePercent) {
  const originalPrice = finiteNumber(price);
  const percent = finiteNumber(salePercent);

  if (originalPrice === null || percent === null || percent <= 0) {
    return null;
  }

  return Math.round((originalPrice - originalPrice * percent / 100) * 100) / 100;
}

export function formatSalePercent(value) {
  const number = finiteNumber(value) ?? 0;

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2).replace(/\.?0+$/, "");
}

export function getProductSaleInfo(product = {}) {
  const originalPrice = finiteNumber(
    product.price ??
      product.originalPrice ??
      product.original_price ??
      product.regular_price ??
      product.variant?.price ??
      product.variants?.[0]?.price,
  ) ?? 0;
  const salePercent = finiteNumber(
    product.sale_percent ??
      product.salePercent ??
      product.discount_percent ??
      product.discountPercent,
  );
  const explicitSalePrice = finiteNumber(
    product.sale_price ??
      product.salePrice ??
      product.discount_price ??
      product.discountPrice,
  );
  const calculatedSalePrice = calculateSalePrice(originalPrice, salePercent);
  const salePrice = explicitSalePrice ?? calculatedSalePrice;
  const inferredPercent =
    salePercent ??
    (originalPrice > 0 && salePrice !== null
      ? Math.round((100 - salePrice / originalPrice * 100) * 100) / 100
      : null);
  const isSale =
    originalPrice > 0 &&
    salePrice !== null &&
    salePrice > 0 &&
    salePrice < originalPrice &&
    (truthySaleFlag(product.is_sale ?? product.isSale) ||
      (inferredPercent !== null && inferredPercent > 0));

  return {
    displayPrice: isSale ? salePrice : originalPrice,
    isSale,
    originalPrice,
    salePercent: isSale ? inferredPercent : null,
    salePrice: isSale ? salePrice : null,
  };
}

export const USER_ROLES = Object.freeze({
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  STAFF: "STAFF",
});

export function getRole(user = {}) {
  const directRole = user?.role_name || user?.roleName || user?.role;

  if (typeof directRole === "string" && directRole.trim()) {
    return directRole.trim().toUpperCase();
  }

  if (!directRole || typeof directRole !== "object") {
    return null;
  }

  const roleName = directRole.name;

  if (typeof roleName !== "string" || !roleName.trim()) {
    return null;
  }

  return roleName.trim().toUpperCase();
}

export function getUserRole(user = {}) {
  return getRole(user);
}

function getApiOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
}

function isAbsoluteMediaUrl(value) {
  return /^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");
}

export function resolveMediaUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (isAbsoluteMediaUrl(trimmedValue)) {
    return trimmedValue;
  }

  const apiOrigin = getApiOrigin();
  const imagePath = trimmedValue.replace(/^\/+/, "");

  if (imagePath.toLowerCase().startsWith("storage/")) {
    return `${apiOrigin}/${imagePath}`;
  }

  return `${apiOrigin}/storage/${imagePath}`;
}

function directMediaUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export function toStorageRelativePath(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue.startsWith("data:") || trimmedValue.startsWith("blob:")) {
    return "";
  }

  const apiOrigin = getApiOrigin();
  const storagePrefix = `${apiOrigin}/storage/`;

  if (trimmedValue.startsWith(storagePrefix)) {
    return trimmedValue.slice(storagePrefix.length);
  }

  if (trimmedValue.startsWith(`${apiOrigin}/`)) {
    return trimmedValue
      .slice(apiOrigin.length + 1)
      .replace(/^storage\/+/i, "");
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const storageMarker = "/storage/";
    const storageIndex = parsedUrl.pathname.indexOf(storageMarker);

    if (storageIndex >= 0) {
      return decodeURIComponent(
        parsedUrl.pathname.slice(storageIndex + storageMarker.length),
      );
    }
  } catch {
    // Relative storage paths are handled below.
  }

  if (/^(https?:)?\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue.replace(/^\/+/, "").replace(/^storage\/+/i, "");
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const SPEC_LABELS = {
  battery: "Pin",
  camera: "Camera",
  charging: "Sạc",
  chip: "Chip",
  color: "Màu sắc",
  connectivity: "Kết nối",
  cpu: "CPU",
  display: "Màn hình",
  front_camera: "Camera trước",
  gpu: "GPU",
  material: "Chất liệu",
  os: "Hệ điều hành",
  port: "Cổng kết nối",
  ports: "Cổng kết nối",
  ram: "RAM",
  rear_camera: "Camera sau",
  refresh_rate: "Tần số quét",
  resolution: "Độ phân giải",
  rom: "Bộ nhớ",
  screen: "Màn hình",
  storage: "Lưu trữ",
  weight: "Trọng lượng",
};

function hasSpecValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return String(value).trim() !== "";
}

export function normalizeSpecifications(specifications = {}) {
  if (!specifications) {
    return {};
  }

  if (typeof specifications === "string") {
    try {
      return normalizeSpecifications(JSON.parse(specifications));
    } catch {
      return {};
    }
  }

  if (Array.isArray(specifications)) {
    return specifications.reduce((acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }

      const key =
        item.key ??
        item.name ??
        item.label ??
        item.spec_key ??
        item.specification_key;
      const value =
        item.value ??
        item.spec_value ??
        item.specification_value ??
        item.description;

      if (key && hasSpecValue(value)) {
        acc[key] = value;
      }

      return acc;
    }, {});
  }

  if (typeof specifications === "object") {
    return Object.entries(specifications).reduce((acc, [key, value]) => {
      if (hasSpecValue(value)) {
        acc[key] = value;
      }

      return acc;
    }, {});
  }

  return {};
}

export function formatSpecLabel(key) {
  const normalizedKey = String(key || "")
    .trim()
    .toLowerCase();

  if (SPEC_LABELS[normalizedKey]) {
    return SPEC_LABELS[normalizedKey];
  }

  return String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatSpecValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean).join(", ");
  }

  return String(value || "");
}

export function getProductSpecEntries(product = {}) {
  const specifications = normalizeSpecifications(
    product.specifications || product.raw?.specifications,
  );

  return Object.entries(specifications)
    .filter(([key]) => !String(key).startsWith("_"))
    .flatMap(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.entries(value)
          .filter(([childKey]) => !String(childKey).startsWith("_"))
          .map(([childKey, childValue]) => ({
            group: formatSpecLabel(key),
            key: childKey,
            label: formatSpecLabel(childKey),
            value: formatSpecValue(childValue),
          }));
      }

      return [{
        key,
        label: formatSpecLabel(key),
        value: formatSpecValue(value),
      }];
    });
}

export function normalizeProduct(product = {}) {
  const thumbnail =
    product.images?.find?.((image) => image.is_thumbnail) || product.images?.[0];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const requestedVariantId =
    product.product_variant_id ??
    product.variantId ??
    product.variant_id ??
    product.variant?.id;
  const variant =
    variants.find((item) => String(item.id) === String(requestedVariantId)) ||
    product.variant ||
    variants[0] ||
    {};
  const inventory = variant.inventory || product.inventory || {};
  const imageValue =
    product.full_image_url ||
    product.fullImageUrl ||
    product.imageUrl ||
    product.image_url ||
    product.thumbnail ||
    product.image ||
    product.cover ||
    thumbnail?.full_image_url ||
    thumbnail?.fullImageUrl ||
    thumbnail?.image_url ||
    thumbnail?.url ||
    thumbnail;
  const basePrice = Number(variant.price ?? product.price ?? product.salePrice ?? 0);
  const saleInfo = getProductSaleInfo({
    ...product,
    price: basePrice,
  });

  return {
    id: product.id ?? product.productId ?? product.product_id ?? product._id,
    slug: product.slug,
    categoryId:
      product.category_id ??
      product.categoryId ??
      product.category?.id ??
      product.category?.category_id ??
      product.category?.categoryId,
    brandId:
      product.brand_id ??
      product.brandId ??
      product.brand?.id ??
      product.brand?.brand_id ??
      product.brand?.brandId,
    warrantyPolicyId: product.warranty_policy_id ?? product.warrantyPolicyId,
    variantId:
      product.product_variant_id ??
      product.variantId ??
      product.variant_id ??
      variant.id ??
      product.id,
    name: product.name || product.productName || product.title || "Sản phẩm",
    description:
      product.description ||
      product.shortDescription ||
      product.short_description ||
      "Thiết bị điện tử chính hãng tại BStore.",
    category:
      product.category?.name ||
      product.categoryName ||
      product.category_name ||
      product.category ||
      "Electronics",
    brand:
      product.brand?.name ||
      product.brandName ||
      product.brand_name ||
      product.brand ||
      "",
    price: saleInfo.originalPrice,
    salePercent: saleInfo.salePercent,
    salePrice: saleInfo.salePrice,
    isSale: saleInfo.isSale,
    oldPrice: Number(
      product.oldPrice ||
        product.old_price ||
        product.originalPrice ||
        product.original_price ||
        (saleInfo.isSale ? saleInfo.originalPrice : 0) ||
        0,
    ),
    stock: Number(
      inventory.quantity ??
        product.stock ??
        product.quantity ??
        product.inventory?.quantity ??
        0,
    ),
    imageUrl: directMediaUrl(typeof imageValue === "string" ? imageValue : ""),
    thumbnail: directMediaUrl(typeof imageValue === "string" ? imageValue : ""),
    specifications: normalizeSpecifications(product.specifications),
    variants,
    warrantyPolicy: product.warranty_policy || product.warrantyPolicy || null,
    status: product.status || variant.status || "",
    raw: product,
  };
}

export function normalizeProductSummary(product = {}) {
  const thumbnail =
    product.thumbnail ||
    product.thumbnail_url ||
    product.thumbnailUrl ||
    product.images?.find?.((image) => image.is_thumbnail)?.thumbnail ||
    product.images?.find?.((image) => image.is_thumbnail)?.thumbnail_url ||
    product.images?.find?.((image) => image.is_thumbnail)?.thumbnailUrl ||
    product.images?.find?.((image) => image.is_thumbnail)?.full_image_url ||
    product.images?.find?.((image) => image.is_thumbnail)?.fullImageUrl ||
    product.images?.find?.((image) => image.is_thumbnail)?.image_url ||
    product.images?.find?.((image) => image.is_thumbnail)?.url ||
    product.images?.[0]?.thumbnail ||
    product.images?.[0]?.thumbnail_url ||
    product.images?.[0]?.thumbnailUrl ||
    product.images?.[0]?.full_image_url ||
    product.images?.[0]?.fullImageUrl ||
    product.images?.[0]?.image_url ||
    product.images?.[0]?.url ||
    product.images?.[0] ||
    product.full_image_url ||
    product.fullImageUrl ||
    product.imageUrl ||
    product.image_url ||
    product.image ||
    product.cover;
  const price =
    product.price ??
    product.originalPrice ??
    product.original_price ??
    product.regular_price ??
    product.min_price ??
    product.variant?.price ??
    product.variants?.[0]?.price ??
    0;
  const salePrice =
    product.sale_price ??
    product.salePrice ??
    product.discount_price ??
    product.discountPrice ??
    null;
  const rating =
    product.rating ??
    product.average_rating ??
    product.averageRating ??
    product.avg_rating ??
    product.avgRating ??
    null;
  const saleInfo = getProductSaleInfo({
    ...product,
    price,
    sale_price: salePrice,
  });

  return {
    id: product.id ?? product.productId ?? product.product_id ?? product._id,
    slug: product.slug,
    name: product.name || product.productName || product.title || "Sản phẩm",
    price: saleInfo.originalPrice,
    sale_percent: saleInfo.salePercent,
    sale_price: saleInfo.salePrice,
    is_sale: saleInfo.isSale,
    thumbnail: directMediaUrl(typeof thumbnail === "string" ? thumbnail : ""),
    category: product.category,
    category_id:
      product.category_id ?? product.categoryId ?? product.category?.id ?? null,
    category_name:
      product.category_name ?? product.categoryName ?? product.category?.name ?? "",
    category_slug:
      product.category_slug ?? product.categorySlug ?? product.category?.slug ?? "",
    rating: rating === null || rating === "" ? null : Number(rating),
  };
}

export function normalizeCartItem(item = {}) {
  const product = item.product || item.productDto || item.productDTO || {};
  const normalizedProduct = normalizeProduct({
    ...product,
    id: product.id ?? item.product_id ?? item.productId,
    name: product.name ?? item.product_name ?? item.productName ?? item.name,
    price: item.price ?? product.price,
    product_variant_id: item.product_variant_id,
  });
  const quantity = Number(item.quantity ?? item.qty ?? 1);
  const price = Number(item.price ?? item.unitPrice ?? normalizedProduct.price ?? 0);

  return {
    id:
      item.id ??
      item.cartItemId ??
      item.cart_item_id ??
      normalizedProduct.variantId ??
      item.product_variant_id,
    productId: normalizedProduct.id ?? item.product_id ?? item.productId,
    variantId:
      item.product_variant_id ??
      item.productVariantId ??
      normalizedProduct.variantId,
    product: normalizedProduct,
    productName: item.product_name || normalizedProduct.name,
    color: item.color || "",
    ram: item.ram || "",
    storage: item.storage || "",
    quantity,
    price,
    subtotal: Number(item.subtotal ?? price * quantity),
    raw: item,
  };
}

export function getPaymentRedirectUrl(payload = {}) {
  const containers = [
    payload,
    payload.data,
    payload.payment,
    payload.paymentData,
    payload.payment_data,
    payload.vnpay,
  ].filter(Boolean);

  for (const container of containers) {
    const redirectUrl =
      container.paymentUrl ||
      container.payment_url ||
      container.checkoutUrl ||
      container.checkout_url ||
      container.redirectUrl ||
      container.redirect_url ||
      container.url;

    if (redirectUrl) {
      return redirectUrl;
    }
  }

  return "";
}
