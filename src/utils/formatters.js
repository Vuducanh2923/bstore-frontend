import { API_BASE_URL } from "../services/api";

export function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

export function normalizeRole(role) {
  const rawRole = Array.isArray(role) ? role[0] : role;

  if (typeof rawRole === "number") {
    return rawRole === 1 ? "admin" : "customer";
  }

  const value =
    typeof rawRole === "object"
      ? rawRole?.name || rawRole?.authority || rawRole?.role || rawRole?.id
      : rawRole;

  if (typeof value === "number") {
    return value === 1 ? "admin" : "customer";
  }

  const normalized = String(value || "customer")
    .toLowerCase()
    .replace("role_", "");

  if (normalized.includes("admin") || normalized === "1") {
    return "admin";
  }

  return "customer";
}

export function getUserRole(user = {}) {
  return normalizeRole(
    user.role?.name || user.role || user.roles || user.authorities || user.role_id,
  );
}

export function resolveMediaUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/i, "");
  return `${apiOrigin}/${value.replace(/^\/+/, "")}`;
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

  return Object.entries(specifications).map(([key, value]) => ({
    key,
    label: formatSpecLabel(key),
    value: formatSpecValue(value),
  }));
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
    product.imageUrl ||
    product.image_url ||
    product.thumbnail ||
    product.image ||
    product.cover ||
    thumbnail?.image_url ||
    thumbnail?.url ||
    thumbnail;

  return {
    id: product.id ?? product.productId ?? product.product_id ?? product._id,
    slug: product.slug,
    categoryId: product.category_id ?? product.categoryId,
    brandId: product.brand_id ?? product.brandId,
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
    price: Number(variant.price ?? product.price ?? product.salePrice ?? 0),
    oldPrice: Number(
      product.oldPrice ||
        product.old_price ||
        product.originalPrice ||
        product.original_price ||
        0,
    ),
    stock: Number(
      inventory.quantity ??
        product.stock ??
        product.quantity ??
        product.inventory?.quantity ??
        0,
    ),
    imageUrl: resolveMediaUrl(typeof imageValue === "string" ? imageValue : ""),
    specifications: normalizeSpecifications(product.specifications),
    variants,
    warrantyPolicy: product.warranty_policy || product.warrantyPolicy || null,
    status: product.status || variant.status || "",
    raw: product,
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
  return (
    payload.paymentUrl ||
    payload.payment_url ||
    payload.checkoutUrl ||
    payload.checkout_url ||
    payload.redirectUrl ||
    payload.redirect_url ||
    payload.url
  );
}
