/* eslint-disable react-refresh/only-export-components */
import { readCollection } from "../../../services/api";
import { normalizeBrand } from "../Brands/BrandService";
import {
  calculateSalePrice,
  getRole,
  normalizeProduct,
  normalizeSpecifications,
  resolveMediaUrl,
  slugify,
  USER_ROLES,
} from "../../../utils/formatters";

export function createLocalId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptySpecRow() {
  return { key: "", value: "" };
}

export function createEmptySpecGroup(index = 0, name = "") {
  return {
    id: createLocalId(`spec-group-${index + 1}`),
    items: [createEmptySpecRow()],
    name,
  };
}

export function createDefaultSpecGroups() {
  return [createEmptySpecGroup()];
}

export function createEmptyVariant(index = 0, productSlug = "") {
  const skuPrefix = productSlug ? productSlug.toUpperCase() : "";

  return {
    barcode: "",
    collapsed: false,
    color: "",
    localId: createLocalId(`variant-${index + 1}`),
    price: "",
    ram: "",
    salePrice: "",
    sku: skuPrefix ? `${skuPrefix}-${index + 1}` : "",
    specifications: [],
    status: "active",
    stock: "0",
    storage: "",
  };
}

export function ensureVariantRows(variants, productSlug = "") {
  return Array.isArray(variants) && variants.length
    ? variants
    : [createEmptyVariant(0, productSlug)];
}

export function createEmptyProductForm() {
  return {
    name: "",
    slug: "",
    categoryId: "",
    categoryName: "",
    brandId: "",
    brandName: "",
    description: "",
    featured: false,
    imagePublicId: "",
    images: [],
    imageUrl: "",
    price: "",
    salePercent: "",
    shortDescription: "",
    specifications: createDefaultSpecGroups(),
    status: "active",
    variants: [createEmptyVariant()],
  };
}

export function createEmptyBannerForm() {
  return {
    title: "",
    subtitle: "",
    description: "",
    buttonText: "",
    buttonLink: "",
    imageUrl: "",
    displaySlot: "1",
    sortOrder: "0",
    status: "1",
  };
}

export const BANNER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BANNER_IMAGE_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
export const ADMIN_PRODUCT_PAGE_SIZE = 12;
export const ADMIN_USER_PAGE_SIZE = 10;
export const ADMIN_INVENTORY_PAGE_SIZE = 12;
export const ADMIN_TABS = new Set([
  "dashboard",
  "products",
  "banners",
  "categories",
  "inventory",
  "settings",
]);
export const STAFF_TABS = ADMIN_TABS;

export const emptyCategoryForm = {
  name: "",
  slug: "",
  icon: "",
  description: "",
  status: "active",
};

export const emptyTabSearch = {
  products: "",
  banners: "",
  categories: "",
  inventory: "",
};

export const REVENUE_RANGES = [
  { label: "7 ngày qua", value: 7 },
  { label: "30 ngày qua", value: 30 },
  { label: "90 ngày qua", value: 90 },
];

export function getOrderCreatedAt(order = {}) {
  return (
    order.created_at ||
    order.createdAt ||
    order.order_date ||
    order.orderDate ||
    order.placed_at ||
    order.placedAt ||
    ""
  );
}

export function isRevenueOrder(order = {}) {
  return !["cancelled", "canceled", "refunded", "failed"].includes(
    String(order.status || "").toLowerCase(),
  );
}

export function normalizeOrder(order = {}) {
  return {
    id: order.id || order.orderId || order.order_id,
    customerName:
      order.receiver_name ||
      order.customer?.name ||
      order.customerName ||
      "Khách hàng",
    paymentMethod: order.payment_method || order.paymentMethod || "COD",
    status: String(order.status || "pending").toLowerCase(),
    paymentStatus: order.payment_status || "pending",
    total: Number(order.final_amount || order.total_amount || order.total || 0),
    createdAt: getOrderCreatedAt(order),
  };
}

export function getRoleLabel(roleName) {
  if (roleName === USER_ROLES.ADMIN) {
    return "Admin";
  }

  if (roleName === USER_ROLES.STAFF) {
    return "Staff";
  }

  if (roleName === USER_ROLES.CUSTOMER) {
    return "Customer";
  }

  return "Unknown";
}

export function getUserAvatarValue(user = {}) {
  return String(
    user.avatar_url ||
      user.avatarUrl ||
      user.avatar ||
      user.image_url ||
      user.imageUrl ||
      user.image ||
      "",
  ).trim();
}

export function getUserCreatedAt(user = {}) {
  return (
    user.created_at ||
    user.createdAt ||
    user.created_date ||
    user.createdDate ||
    user.inserted_at ||
    ""
  );
}

export function normalizeManagedUser(user = {}) {
  const roleName = getRole(user);
  const roleKey = roleName ? roleName.toLowerCase() : "";

  return {
    id: user.id ?? user.user_id ?? user.userId ?? user._id,
    avatar: getUserAvatarValue(user),
    name: user.full_name || user.fullName || user.name || "User",
    email: user.email || "",
    phone: user.phone || "",
    role: getRoleLabel(roleName),
    roleKey,
    status: String(user.status || "active").toLowerCase(),
    createdAt: getUserCreatedAt(user),
    raw: user,
  };
}

export function isUserLocked(user = {}) {
  return ["locked", "suspended", "disabled", "inactive", "blocked"].includes(
    String(user.status || "").toLowerCase(),
  );
}

export function initials(value) {
  return String(value || "BS")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesSearch(query, ...values) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) =>
    normalizeSearchText(value).includes(normalizedQuery),
  );
}

export function normalizeSelectValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeSelectLabel(value) {
  return normalizeSearchText(value).replace(/\s+/g, " ");
}

export function dedupeBrandOptions(items = []) {
  const brandsByKey = new Map();

  items
    .map(normalizeBrand)
    .filter((brand) => brand.id && brand.name)
    .forEach((brand) => {
      const key = normalizeSelectValue(brand.id || brand.slug || brand.name);

      if (!brandsByKey.has(key)) {
        brandsByKey.set(key, brand);
      }
    });

  return Array.from(brandsByKey.values()).sort((first, second) =>
    first.name.localeCompare(second.name, "vi"),
  );
}

export function findOptionByValue(options = [], value) {
  const normalizedValue = normalizeSelectValue(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    options.find((option) => normalizeSelectValue(option.id) === normalizedValue) ||
    options.find((option) => normalizeSelectValue(option.slug) === normalizedValue) ||
    null
  );
}

export function findOptionByLabel(options = [], value) {
  const normalizedLabel = normalizeSelectLabel(value);

  if (!normalizedLabel) {
    return null;
  }

  return (
    options.find((option) => normalizeSelectLabel(option.name) === normalizedLabel) ||
    options.find((option) => normalizeSelectValue(option.slug) === normalizeSelectValue(value)) ||
    null
  );
}

export function resolveProductBrandId(product = {}, options = []) {
  const directValue =
    product.brandId ??
    product.raw?.brand_id ??
    product.raw?.brand?.id ??
    product.raw?.brand?.brand_id ??
    "";
  const directOption = findOptionByValue(options, directValue);

  if (directOption) {
    return directOption.id;
  }

  if (directValue) {
    return directValue;
  }

  return (
    findOptionByLabel(
      options,
      product.brand || product.raw?.brand_name || product.raw?.brand?.name,
    )?.id || ""
  );
}

export function resolveProductCategoryId(product = {}, options = []) {
  const directValue =
    product.categoryId ??
    product.raw?.category_id ??
    product.raw?.category?.id ??
    product.raw?.category?.category_id ??
    "";
  const directOption = findOptionByValue(options, directValue);

  if (directOption) {
    return directOption.id;
  }

  if (directValue) {
    return directValue;
  }

  return (
    findOptionByLabel(
      options,
      product.category || product.raw?.category_name || product.raw?.category?.name,
    )?.id || ""
  );
}

export function AdminTabSearch({ onChange, placeholder, value }) {
  return (
    <label className="admin-tab-search">
      <span>Search</span>
      <input
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </label>
  );
}

export function getCategoryIconValue(category = {}) {
  return String(
    category.icon ||
      category.icon_url ||
      category.iconUrl ||
      category.category_icon ||
      "",
  ).trim();
}

export function isCategoryImageIcon(icon) {
  return (
    /^(https?:)?\/\//i.test(icon) ||
    icon.startsWith("/") ||
    icon.startsWith("uploads/") ||
    /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(icon)
  );
}

export function CategoryIconPreview({ category }) {
  const icon = getCategoryIconValue(category);
  const label = category.name || category.label || "Category";

  if (icon && isCategoryImageIcon(icon)) {
    return (
      <span className="category-icon-preview">
        <img alt="" src={resolveMediaUrl(icon)} />
      </span>
    );
  }

  return (
    <span className="category-icon-preview">
      {icon || initials(label)}
    </span>
  );
}

export function stringifySpecValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function readSpecificationObject(specifications) {
  if (!specifications) {
    return {};
  }

  if (typeof specifications === "string") {
    try {
      return readSpecificationObject(JSON.parse(specifications));
    } catch {
      return {};
    }
  }

  if (Array.isArray(specifications)) {
    return specifications.reduce((acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }

      if (item.name && Array.isArray(item.items)) {
        acc[item.name] = item.items.reduce((groupAcc, spec) => {
          const key = String(spec.key || "").trim();
          const value = String(spec.value || "").trim();

          if (key && value) {
            groupAcc[key] = value;
          }

          return groupAcc;
        }, {});
      }

      return acc;
    }, {});
  }

  if (typeof specifications === "object") {
    return specifications;
  }

  return {};
}

export function getInternalProductMeta(specifications) {
  const specObject = readSpecificationObject(specifications);
  const summary = specObject._summary || {};
  const flags = specObject._flags || {};

  return {
    featured: Boolean(flags.featured ?? flags.is_featured ?? false),
    shortDescription:
      summary.short_description ||
      summary.shortDescription ||
      summary.description ||
      "",
  };
}

export function specificationsToGroups(specifications) {
  const specObject = readSpecificationObject(specifications);
  const groups = [];
  const flatRows = [];

  Object.entries(specObject).forEach(([key, value]) => {
    if (String(key).startsWith("_")) {
      return;
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const items = Object.entries(value).map(([itemKey, itemValue]) => ({
        key: itemKey,
        value: stringifySpecValue(itemValue),
      }));

      groups.push({
        id: createLocalId("spec-group"),
        items: items.length ? items : [createEmptySpecRow()],
        name: key,
      });
      return;
    }

    flatRows.push({
      key,
      value: stringifySpecValue(value),
    });
  });

  if (flatRows.length) {
    groups.unshift({
      id: createLocalId("spec-group"),
      items: flatRows,
      name: "Thông số kỹ thuật",
    });
  }

  return groups.length ? groups : createDefaultSpecGroups();
}

export function specRowsToObject(rows = []) {
  return rows.reduce((acc, row) => {
    const key = String(row?.key || "").trim();
    const value = String(row?.value || "").trim();

    if (key && value) {
      acc[key] = value;
    }

    return acc;
  }, {});
}

export function productSpecGroupsToObject(groups = [], meta = {}) {
  const specs = groups.reduce((acc, group) => {
    const groupName = String(group?.name || "").trim();
    const groupSpecs = specRowsToObject(group?.items || []);

    if (!Object.keys(groupSpecs).length) {
      return acc;
    }

    if (groupName) {
      acc[groupName] = groupSpecs;
    } else {
      Object.assign(acc, groupSpecs);
    }

    return acc;
  }, {});

  const shortDescription = String(meta.shortDescription || "").trim();

  if (shortDescription) {
    specs._summary = {
      short_description: shortDescription,
    };
  }

  if (meta.featured) {
    specs._flags = {
      featured: true,
    };
  }

  return specs;
}

export function nullableText(value) {
  const text = String(value ?? "").trim();

  return text || null;
}

export function normalizeVariantFormRow(variant = {}, index = 0, product = {}) {
  const productSlug = slugify(product.name || product.productName || product.title || "");
  const variantSpecs =
    variant.specifications ||
    variant.raw?.specifications ||
    variant.variant_specifications ||
    {};

  return {
    barcode: variant.barcode || "",
    collapsed: false,
    color: variant.color || "",
    id: variant.id ?? variant.variant_id ?? variant.variantId,
    inventoryId: variant.inventory?.id || variant.inventory_id || "",
    localId: createLocalId(`variant-${index + 1}`),
    price: variant.price ?? product.price ?? "",
    ram: variant.ram || "",
    salePrice:
      variant.sale_price ??
      variant.salePrice ??
      variantSpecs?.sale_price ??
      variantSpecs?.salePrice ??
      "",
    sku: variant.sku || (productSlug ? `${productSlug.toUpperCase()}-${index + 1}` : ""),
    specifications: Object.entries(normalizeSpecifications(variantSpecs))
      .filter(([key]) => !["sale_price", "salePrice"].includes(key))
      .map(([key, value]) => ({
        key,
        value: stringifySpecValue(value),
      })),
    status: variant.status || "active",
    stock:
      variant.inventory?.quantity ??
      variant.stock ??
      variant.quantity ??
      "",
    storage: variant.storage || "",
  };
}

export function productVariantsToRows(product = {}) {
  const variants = Array.isArray(product.variants)
    ? product.variants
    : Array.isArray(product.raw?.variants)
      ? product.raw.variants
      : [];

  if (!variants.length) {
    return [createEmptyVariant(0, slugify(product.name || ""))];
  }

  return variants.map((variant, index) =>
    normalizeVariantFormRow(variant, index, product),
  );
}

export function productVariantsToPayload(
  rows = [],
  slug = "",
  fallbackPrice = 0,
  salePercent = null,
) {
  return ensureVariantRows(rows, slug).map((variant, index) => {
    const variantPrice = Number(variant.price || fallbackPrice || 0);
    const hasSalePercent = salePercent !== null && salePercent !== undefined;
    const salePrice = hasSalePercent
      ? Number(calculateSalePrice(variantPrice, salePercent) || 0)
      : Number(variant.salePrice || 0);
    const generatedSku = `${slug.toUpperCase()}-${index + 1}`;
    const specifications = specRowsToObject(variant.specifications);

    if (Number.isFinite(salePrice) && salePrice > 0) {
      specifications.sale_price = salePrice;
    }

    return {
      barcode: nullableText(variant.barcode),
      color: nullableText(variant.color),
      price: Number.isFinite(variantPrice) ? variantPrice : 0,
      ram: nullableText(variant.ram),
      sku: nullableText(variant.sku) || generatedSku,
      specifications,
      status: variant.status || "active",
      storage: nullableText(variant.storage),
    };
  });
}

export function calculateSalePercentFromPrice(price, salePrice) {
  const originalPrice = Number(price || 0);
  const discountedPrice = Number(salePrice || 0);

  if (
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(discountedPrice) ||
    originalPrice <= 0 ||
    discountedPrice <= 0 ||
    discountedPrice >= originalPrice
  ) {
    return null;
  }

  return Math.round((100 - discountedPrice / originalPrice * 100) * 100) / 100;
}

export function readSalePercent(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const salePercent = Number(value);

  return Number.isFinite(salePercent) ? salePercent : null;
}

export function resolveFormSalePercent(form, firstVariant = {}) {
  const enteredSalePercent = readSalePercent(form.salePercent);

  return enteredSalePercent ?? calculateSalePercentFromPrice(
    firstVariant.price,
    firstVariant.salePrice,
  );
}

export function normalizeProductImageRow(image = {}, index = 0) {
  const imageUrl = firstImageValue(
    false,
    image,
    image.image_url,
    image.imageUrl,
    image.url,
  );

  return {
    imageUrl,
    isThumbnail: Boolean(image.is_thumbnail ?? image.isThumbnail ?? index === 0),
    localId: createLocalId(`product-image-${index + 1}`),
    productVariantId:
      image.product_variant_id || image.productVariantId || image.variant_id || null,
    publicId: image.public_id || image.publicId || "",
  };
}

export function ensureThumbnailImage(images = []) {
  const normalizedImages = images
    .filter((image) => String(image?.imageUrl || "").trim())
    .map((image) => ({
      ...image,
      imageUrl: String(image.imageUrl || "").trim(),
    }));

  if (!normalizedImages.length) {
    return [];
  }

  if (normalizedImages.some((image) => image.isThumbnail)) {
    return normalizedImages.map((image, index) => ({
      ...image,
      isThumbnail: image.isThumbnail && index === normalizedImages.findIndex((item) => item.isThumbnail),
    }));
  }

  return normalizedImages.map((image, index) => ({
    ...image,
    isThumbnail: index === 0,
  }));
}

export function productImagesToRows(product = {}) {
  const rawImages = Array.isArray(product.raw?.images)
    ? product.raw.images
    : Array.isArray(product.images)
      ? product.images
      : [];
  const rows = rawImages.map(normalizeProductImageRow);

  if (!rows.length && product.imageUrl) {
    rows.push(
      normalizeProductImageRow(
        {
          image_url: product.imageUrl,
          public_id: product.imagePublicId,
          is_thumbnail: true,
        },
        0,
      ),
    );
  }

  return ensureThumbnailImage(rows);
}

export function productImagesToPayload(images = []) {
  return ensureThumbnailImage(images).map((image) => ({
    image_url: image.imageUrl,
    is_thumbnail: Boolean(image.isThumbnail),
    product_variant_id: image.productVariantId || null,
    public_id: image.publicId || null,
  }));
}

export function getProductVariantCount(product = {}) {
  const variants = Array.isArray(product.variants)
    ? product.variants
    : Array.isArray(product.raw?.variants)
      ? product.raw.variants
      : [];
  const reportedCount = Number(
    product.variantsCount ??
      product.variantCount ??
      product.variants_count ??
      product.variant_count ??
      product.raw?.variants_count ??
      product.raw?.variant_count,
  );

  return Math.max(1, Number.isFinite(reportedCount) ? reportedCount : variants.length);
}

export function createProductPagination(page = 1) {
  return {
    currentPage: page,
    lastPage: 1,
    perPage: ADMIN_PRODUCT_PAGE_SIZE,
    total: 0,
  };
}

export function normalizeProductPagination(payload = {}, fallbackPage = 1) {
  const meta = payload?.meta || payload?.pagination || {};
  const currentPage = Number(
    meta.current_page ?? meta.currentPage ?? meta.page ?? fallbackPage,
  );
  const perPage = Number(meta.per_page ?? meta.perPage ?? meta.limit ?? ADMIN_PRODUCT_PAGE_SIZE);
  const total = Number(meta.total ?? 0);
  const lastPage = Number(
    meta.last_page ??
      meta.lastPage ??
      meta.totalPages ??
      (total > 0 ? Math.ceil(total / Math.max(perPage, 1)) : 1),
  );

  return {
    currentPage: Math.max(1, currentPage || fallbackPage),
    lastPage: Math.max(1, lastPage || 1),
    perPage: Math.max(1, perPage || ADMIN_PRODUCT_PAGE_SIZE),
    total: Math.max(0, total || 0),
  };
}

export function normalizeAdminProducts(payload = {}, fallbackPage = 1) {
  return {
    list: readCollection(payload, ["products"]).map(normalizeProduct),
    pagination: normalizeProductPagination(payload, fallbackPage),
  };
}

export function createAdminUserPagination(page = 1) {
  return {
    currentPage: page,
    lastPage: 1,
    perPage: ADMIN_USER_PAGE_SIZE,
    total: 0,
  };
}

export function readAdminUserCollection(payload = {}, keys = []) {
  const directItems = readCollection(payload, keys);

  if (directItems.length > 0) {
    return directItems;
  }

  return readCollection(payload?.data, keys);
}

export function normalizeAdminUserPagination(payload = {}, fallbackPage = 1) {
  const data = payload?.data && !Array.isArray(payload.data) ? payload.data : {};
  const meta =
    payload?.meta ||
    payload?.pagination ||
    payload?.page ||
    data.meta ||
    data.pagination ||
    data.page ||
    {};
  const total = Number(
    payload?.total ??
      payload?.total_items ??
      payload?.totalItems ??
      data.total ??
      data.total_items ??
      data.totalItems ??
      meta.total ??
      meta.total_items ??
      meta.totalItems ??
      0,
  );
  const perPage = Number(
    payload?.per_page ??
      payload?.perPage ??
      payload?.limit ??
      data.per_page ??
      data.perPage ??
      data.limit ??
      meta.per_page ??
      meta.perPage ??
      meta.limit ??
      ADMIN_USER_PAGE_SIZE,
  );
  const currentPage = Number(
    payload?.current_page ??
      payload?.currentPage ??
      payload?.page ??
      data.current_page ??
      data.currentPage ??
      data.page ??
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
      data.last_page ??
      data.lastPage ??
      data.total_pages ??
      data.totalPages ??
      meta.last_page ??
      meta.lastPage ??
      meta.total_pages ??
      meta.totalPages ??
      (total > 0 ? Math.ceil(total / Math.max(perPage, 1)) : 1),
  );

  return {
    currentPage: Math.max(1, currentPage || fallbackPage),
    lastPage: Math.max(1, lastPage || 1),
    perPage: Math.max(1, perPage || ADMIN_USER_PAGE_SIZE),
    total: Math.max(0, total || 0),
  };
}

export function normalizeManagedUserPage(payload = {}, keys = [], fallbackPage = 1) {
  const list = readAdminUserCollection(payload, keys).map(normalizeManagedUser);
  const pagination = normalizeAdminUserPagination(payload, fallbackPage);

  return {
    list,
    pagination: {
      ...pagination,
      total: pagination.total || list.length,
    },
  };
}

export function normalizeInventoryItems(payload = {}, productList = []) {
  return readCollection(payload, ["inventories", "inventory"]).map((item) => {
    const variant = item.variant || {};
    const variantId =
      variant.id ?? item.product_variant_id ?? item.productVariantId ?? item.variant_id;
    const product = productList.find(
      (current) =>
        Number(current.id) ===
        Number(variant.product_id ?? item.product_id ?? item.productId),
    );

    return {
      id: item.id,
      productName:
        product?.name ||
        variant.product?.name ||
        item.product?.name ||
        (variantId ? `Variant #${variantId}` : "Sản phẩm chưa xác định"),
      variantLabel: [variant.color, variant.ram, variant.storage]
        .filter(Boolean)
        .join(" / "),
      quantity: Number(item.quantity || 0),
      reservedQuantity: Number(item.reserved_quantity || 0),
    };
  });
}

export function getFirstRejectedResult(results = []) {
  return results.find((result) => result.status === "rejected");
}

export function isBannerActive(banner = {}) {
  const status = banner.status ?? banner.is_active ?? banner.active;

  if (status === undefined || status === null || status === "") {
    return true;
  }

  if (typeof status === "boolean") {
    return status;
  }

  if (typeof status === "number") {
    return status !== 0;
  }

  return !["0", "false", "inactive", "disabled", "hidden"].includes(
    String(status).trim().toLowerCase(),
  );
}

export function normalizeBannerDisplaySlot(banner = {}, index = 0) {
  const rawSlot =
    banner.display_slot ??
    banner.displaySlot ??
    banner.banner_slot ??
    banner.bannerSlot ??
    banner.home_slot ??
    banner.homeSlot ??
    banner.frame_position ??
    banner.framePosition ??
    banner.position ??
    banner.slot;
  const slot = Number(rawSlot);

  if ([1, 2, 3].includes(slot)) {
    return slot;
  }

  return (index % 3) + 1;
}

export function getImageValue(source, preferPreview = false) {
  if (!source) {
    return "";
  }

  if (typeof source === "string") {
    return source;
  }

  if (typeof source !== "object") {
    return "";
  }

  const previewValue = [
    source.full_image_url,
    source.fullImageUrl,
    source.fullImageURL,
  ].find((value) => typeof value === "string" && value.trim());
  const storedValue = [
    source.image_url,
    source.imageUrl,
    source.path,
    source.url,
    source.thumbnail,
    source.image,
    source.cover,
  ].find((value) => typeof value === "string" && value.trim());

  return preferPreview ? previewValue || storedValue : storedValue || previewValue;
}

export function firstImageValue(preferPreview, ...sources) {
  for (const source of sources) {
    const imageValue = getImageValue(source, preferPreview);

    if (imageValue) {
      return imageValue;
    }
  }

  return "";
}

export function getUploadImagePath(payload = {}) {
  return String(
    payload.image_url ||
      payload.path ||
      payload.relative_path ||
      payload.url ||
      payload.full_image_url ||
      payload.fullImageUrl ||
      "",
  ).trim();
}

export function getUploadImagePublicId(payload = {}) {
  return String(payload.public_id || payload.publicId || "").trim();
}

export function normalizeAdminBanner(banner = {}, index = 0) {
  const storedImageValue = getImageValue(banner);
  const previewImageValue = getImageValue(banner, true);
  const imageUrl =
    typeof previewImageValue === "string" ? previewImageValue.trim() : "";

  return {
    id: banner.id ?? banner.banner_id ?? `${banner.title || "banner"}-${index}`,
    title: banner.title || banner.name || `Banner ${index + 1}`,
    subtitle: banner.subtitle || banner.sub_title || "",
    description: banner.description || banner.content || "",
    buttonText: banner.buttonText || banner.button_text || "",
    buttonLink: banner.buttonLink || banner.button_link || banner.route || "",
    imageUrl,
    rawImageUrl: typeof storedImageValue === "string" ? storedImageValue.trim() : "",
    displaySlot: normalizeBannerDisplaySlot(banner, index),
    sortOrder: Number(banner.sort_order ?? banner.sortOrder ?? index),
    status: isBannerActive(banner),
  };
}

export function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (["delivered", "completed", "active", "shipped"].includes(value)) {
    return "success";
  }

  if (["shipping", "processing", "confirmed"].includes(value)) {
    return "info";
  }

  if (["pending", "created"].includes(value)) {
    return "warning";
  }

  if (["cancelled", "canceled", "suspended", "failed"].includes(value)) {
    return "danger";
  }

  return "neutral";
}

export function StatusPill({ children }) {
  return (
    <span className={`admin-pill admin-pill--${statusClass(children)}`}>
      {children}
    </span>
  );
}

export function AdminPagination({ disabled, label, onPageChange, pagination }) {
  const hasRows = pagination.total > 0;
  const start = hasRows
    ? (pagination.currentPage - 1) * pagination.perPage + 1
    : 0;
  const end = hasRows
    ? Math.min(pagination.total, start + pagination.perPage - 1)
    : 0;

  return (
    <div className="admin-pagination">
      <span>
        {label} {start}-{end} / {pagination.total}
      </span>
      <div>
        <button
          disabled={disabled || pagination.currentPage <= 1}
          onClick={() => onPageChange(pagination.currentPage - 1)}
          type="button"
        >
          Truoc
        </button>
        <strong>
          Trang {pagination.currentPage} / {pagination.lastPage}
        </strong>
        <button
          disabled={disabled || pagination.currentPage >= pagination.lastPage}
          onClick={() => onPageChange(pagination.currentPage + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
