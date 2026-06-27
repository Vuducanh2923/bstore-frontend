import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { getApiErrorMessage, readCollection } from "../../services/api";
import { adminService, uploadService } from "../../services/bstoreService";
import { normalizeBrand } from "./Brands/BrandService";
import ProductFormModal from "./ProductFormModal";
import {
  formatCurrency,
  formatSalePercent,
  normalizeProduct,
  normalizeSpecifications,
  resolveMediaUrl,
  slugify,
} from "../../utils/formatters";

function createLocalId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySpecRow() {
  return { key: "", value: "" };
}

function createEmptySpecGroup(index = 0, name = "") {
  return {
    id: createLocalId(`spec-group-${index + 1}`),
    items: [createEmptySpecRow()],
    name,
  };
}

function createDefaultSpecGroups() {
  return [createEmptySpecGroup()];
}

function createEmptyVariant(index = 0, productSlug = "") {
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

function ensureVariantRows(variants, productSlug = "") {
  return Array.isArray(variants) && variants.length
    ? variants
    : [createEmptyVariant(0, productSlug)];
}

function createEmptyProductForm() {
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
    seo: {
      metaDescription: "",
      metaKeywords: "",
      metaTitle: "",
    },
    shortDescription: "",
    specifications: createDefaultSpecGroups(),
    status: "active",
    variants: [createEmptyVariant()],
  };
}

function createEmptyBannerForm() {
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

const BANNER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BANNER_IMAGE_SIZE = 5 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const ADMIN_PRODUCT_PAGE_SIZE = 12;

const emptyCategoryForm = {
  name: "",
  slug: "",
  icon: "",
  description: "",
  status: "active",
};

const emptyTabSearch = {
  products: "",
  banners: "",
  categories: "",
  orders: "",
  inventory: "",
  users: "",
};

const chartBars = [
  { day: "Mon", value: 46 },
  { day: "Tue", value: 70 },
  { day: "Wed", value: 58 },
  { day: "Thu", value: 92 },
  { day: "Fri", value: 100, active: true },
  { day: "Sat", value: 76 },
  { day: "Sun", value: 64 },
];

function normalizeOrder(order = {}) {
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
  };
}

function normalizeUser(user = {}) {
  return {
    id: user.id,
    name: user.full_name || user.name || "User",
    email: user.email || "",
    phone: user.phone || "Chưa cập nhật",
    roleId: String(user.role_id || user.role?.id || ""),
    role: user.role?.name || (Number(user.role_id) === 1 ? "Admin" : "Customer"),
    status: user.status || "active",
    raw: user,
  };
}

function initials(value) {
  return String(value || "BS")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesSearch(query, ...values) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) =>
    normalizeSearchText(value).includes(normalizedQuery),
  );
}

function normalizeSelectValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeSelectLabel(value) {
  return normalizeSearchText(value).replace(/\s+/g, " ");
}

function dedupeBrandOptions(items = []) {
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

function findOptionByValue(options = [], value) {
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

function findOptionByLabel(options = [], value) {
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

function resolveProductBrandId(product = {}, options = []) {
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

function resolveProductCategoryId(product = {}, options = []) {
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

function AdminTabSearch({ onChange, placeholder, value }) {
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

function getCategoryIconValue(category = {}) {
  return String(
    category.icon ||
      category.icon_url ||
      category.iconUrl ||
      category.category_icon ||
      "",
  ).trim();
}

function isCategoryImageIcon(icon) {
  return (
    /^(https?:)?\/\//i.test(icon) ||
    icon.startsWith("/") ||
    icon.startsWith("uploads/") ||
    /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(icon)
  );
}

function CategoryIconPreview({ category }) {
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

function stringifySpecValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function readSpecificationObject(specifications) {
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

function getInternalProductMeta(specifications) {
  const specObject = readSpecificationObject(specifications);
  const summary = specObject._summary || {};
  const seo = specObject._seo || {};
  const flags = specObject._flags || {};

  return {
    featured: Boolean(flags.featured ?? flags.is_featured ?? false),
    seo: {
      metaDescription:
        seo.meta_description || seo.metaDescription || seo.description || "",
      metaKeywords:
        Array.isArray(seo.meta_keywords)
          ? seo.meta_keywords.join(", ")
          : seo.meta_keywords || seo.metaKeywords || seo.keywords || "",
      metaTitle: seo.meta_title || seo.metaTitle || seo.title || "",
    },
    shortDescription:
      summary.short_description ||
      summary.shortDescription ||
      summary.description ||
      "",
  };
}

function specificationsToGroups(specifications) {
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

function specRowsToObject(rows = []) {
  return rows.reduce((acc, row) => {
    const key = String(row?.key || "").trim();
    const value = String(row?.value || "").trim();

    if (key && value) {
      acc[key] = value;
    }

    return acc;
  }, {});
}

function productSpecGroupsToObject(groups = [], meta = {}) {
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
  const seo = meta.seo || {};
  const metaTitle = String(seo.metaTitle || "").trim();
  const metaDescription = String(seo.metaDescription || "").trim();
  const metaKeywords = String(seo.metaKeywords || "").trim();

  if (shortDescription) {
    specs._summary = {
      short_description: shortDescription,
    };
  }

  if (metaTitle || metaDescription || metaKeywords) {
    specs._seo = {
      meta_description: metaDescription,
      meta_keywords: metaKeywords,
      meta_title: metaTitle,
    };
  }

  if (meta.featured) {
    specs._flags = {
      featured: true,
    };
  }

  return specs;
}

function nullableText(value) {
  const text = String(value ?? "").trim();

  return text || null;
}

function normalizeVariantFormRow(variant = {}, index = 0, product = {}) {
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

function productVariantsToRows(product = {}) {
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

function productVariantsToPayload(rows = [], slug = "", fallbackPrice = 0) {
  return ensureVariantRows(rows, slug).map((variant, index) => {
    const variantPrice = Number(variant.price || fallbackPrice || 0);
    const salePrice = Number(variant.salePrice || 0);
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

function calculateSalePercentFromPrice(price, salePrice) {
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

function normalizeProductImageRow(image = {}, index = 0) {
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

function ensureThumbnailImage(images = []) {
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

function productImagesToRows(product = {}) {
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

function productImagesToPayload(images = []) {
  return ensureThumbnailImage(images).map((image) => ({
    image_url: image.imageUrl,
    is_thumbnail: Boolean(image.isThumbnail),
    product_variant_id: image.productVariantId || null,
    public_id: image.publicId || null,
  }));
}

function getProductVariantCount(product = {}) {
  const variants = Array.isArray(product.variants)
    ? product.variants
    : Array.isArray(product.raw?.variants)
      ? product.raw.variants
      : [];

  return variants.length;
}

function createProductPagination(page = 1) {
  return {
    currentPage: page,
    lastPage: 1,
    perPage: ADMIN_PRODUCT_PAGE_SIZE,
    total: 0,
  };
}

function normalizeProductPagination(payload = {}, fallbackPage = 1) {
  const meta = payload?.meta || payload?.pagination || {};
  const currentPage = Number(
    meta.current_page ?? meta.currentPage ?? meta.page ?? fallbackPage,
  );
  const perPage = Number(meta.per_page ?? meta.perPage ?? ADMIN_PRODUCT_PAGE_SIZE);
  const total = Number(meta.total ?? 0);
  const lastPage = Number(
    meta.last_page ??
      meta.lastPage ??
      (total > 0 ? Math.ceil(total / Math.max(perPage, 1)) : 1),
  );

  return {
    currentPage: Math.max(1, currentPage || fallbackPage),
    lastPage: Math.max(1, lastPage || 1),
    perPage: Math.max(1, perPage || ADMIN_PRODUCT_PAGE_SIZE),
    total: Math.max(0, total || 0),
  };
}

function normalizeAdminProducts(payload = {}, fallbackPage = 1) {
  return {
    list: readCollection(payload, ["products"]).map(normalizeProduct),
    pagination: normalizeProductPagination(payload, fallbackPage),
  };
}

function normalizeInventoryItems(payload = {}, productList = []) {
  return readCollection(payload, ["inventories", "inventory"]).map((item) => {
    const variant = item.variant || {};
    const product = productList.find(
      (current) => Number(current.id) === Number(variant.product_id),
    );

    return {
      id: item.id,
      productName:
        product?.name || variant.product?.name || `Variant #${variant.id}`,
      variantLabel: [variant.color, variant.ram, variant.storage]
        .filter(Boolean)
        .join(" / "),
      quantity: Number(item.quantity || 0),
      reservedQuantity: Number(item.reserved_quantity || 0),
    };
  });
}

function getFirstRejectedResult(results = []) {
  return results.find((result) => result.status === "rejected");
}

function isBannerActive(banner = {}) {
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

function normalizeBannerDisplaySlot(banner = {}, index = 0) {
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

function getImageValue(source, preferPreview = false) {
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

function firstImageValue(preferPreview, ...sources) {
  for (const source of sources) {
    const imageValue = getImageValue(source, preferPreview);

    if (imageValue) {
      return imageValue;
    }
  }

  return "";
}

function getUploadImagePath(payload = {}) {
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

function getUploadImagePublicId(payload = {}) {
  return String(payload.public_id || payload.publicId || "").trim();
}

function normalizeAdminBanner(banner = {}, index = 0) {
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

function statusClass(status) {
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

function StatusPill({ children }) {
  return (
    <span className={`admin-pill admin-pill--${statusClass(children)}`}>
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState(() =>
    createProductPagination(),
  );
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tabSearch, setTabSearch] = useState(emptyTabSearch);
  const [productForm, setProductForm] = useState(() => createEmptyProductForm());
  const [bannerForm, setBannerForm] = useState(() => createEmptyBannerForm());
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productLocalPreviewUrl, setProductLocalPreviewUrl] = useState("");
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerLocalPreviewUrl, setBannerLocalPreviewUrl] = useState("");
  const [pendingSaleConfirmation, setPendingSaleConfirmation] = useState(null);
  const [message, setMessage] = useState("");

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const productRequestPage = tab === "products" ? productPage : 1;
    const productSearch =
      tab === "products" ? tabSearch.products.trim() || undefined : undefined;
    const requests = [];
    const addRequest = (key, request) => {
      requests.push([key, request]);
    };

    if (["dashboard", "products", "inventory"].includes(tab)) {
      addRequest(
        "products",
        adminService.getProducts({
          page: productRequestPage,
          per_page: ADMIN_PRODUCT_PAGE_SIZE,
          search: productSearch,
        }),
      );
    }

    if (["dashboard", "banners"].includes(tab)) {
      addRequest("banners", adminService.getBanners());
    }

    if (["products", "categories"].includes(tab)) {
      addRequest("categories", adminService.getCategories());
    }

    if (tab === "products") {
      addRequest("brands", adminService.getBrands());
    }

    if (["dashboard", "inventory"].includes(tab)) {
      addRequest("inventory", adminService.getInventory());
    }

    if (["dashboard", "orders"].includes(tab)) {
      addRequest("orders", adminService.getOrders());
    }

    if (["dashboard", "users"].includes(tab)) {
      addRequest("users", adminService.getUsers());
    }

    if (tab === "users") {
      addRequest("roles", adminService.getRoles());
    }

    const settledResults = await Promise.allSettled(
      requests.map(([, request]) => request),
    );
    const results = requests.reduce((acc, [key], index) => {
      acc[key] = settledResults[index];
      return acc;
    }, {});

    let productList = [];

    if (results.products?.status === "fulfilled") {
      const normalizedProducts = normalizeAdminProducts(
        results.products.value,
        productRequestPage,
      );
      productList = normalizedProducts.list;
      setProducts(productList);
      setProductPagination(normalizedProducts.pagination);
    }

    if (results.banners?.status === "fulfilled") {
      setBanners(
        readCollection(results.banners.value, ["banners"])
          .map(normalizeAdminBanner)
          .sort((first, second) => first.sortOrder - second.sortOrder),
      );
    }

    if (results.categories?.status === "fulfilled") {
      setCategories(readCollection(results.categories.value, ["categories"]));
    }

    if (results.brands?.status === "fulfilled") {
      setBrands(dedupeBrandOptions(readCollection(results.brands.value, ["brands"])));
    }

    if (results.inventory?.status === "fulfilled") {
      setInventory(normalizeInventoryItems(results.inventory.value, productList));
    }

    if (results.orders?.status === "fulfilled") {
      setOrders(readCollection(results.orders.value, ["orders"]).map(normalizeOrder));
    }

    if (results.users?.status === "fulfilled") {
      setUsers(readCollection(results.users.value, ["users"]).map(normalizeUser));
    }

    if (results.roles?.status === "fulfilled") {
      setRoles(readCollection(results.roles.value, ["roles"]));
    }

    const rejected = getFirstRejectedResult(settledResults);

    if (rejected) {
      setMessage(
        getApiErrorMessage(
          rejected.reason,
          "Một số dữ liệu admin chưa tải được từ backend.",
        ),
      );
    }

    setLoading(false);
  }, [productPage, tab, tabSearch.products]);

  useEffect(() => {
    const timerId = window.setTimeout(loadAdminData, 0);
    return () => window.clearTimeout(timerId);
  }, [loadAdminData]);

  useEffect(() => {
    return () => {
      if (bannerLocalPreviewUrl) {
        URL.revokeObjectURL(bannerLocalPreviewUrl);
      }
    };
  }, [bannerLocalPreviewUrl]);

  useEffect(() => {
    return () => {
      if (productLocalPreviewUrl) {
        URL.revokeObjectURL(productLocalPreviewUrl);
      }
    };
  }, [productLocalPreviewUrl]);

  const dashboard = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter((order) =>
      ["pending", "processing", "confirmed"].includes(order.status),
    ).length;
    const shippedOrders = orders.filter((order) =>
      ["shipping", "shipped"].includes(order.status),
    ).length;
    const activeInventory = inventory.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    return {
      totalRevenue,
      pendingOrders,
      shippedOrders,
      activeInventory,
      activeBanners: banners.filter((banner) => banner.status).length,
      activeUsers: users.filter((user) => user.status !== "suspended").length,
    };
  }, [banners, inventory, orders, users]);

  const productPageStart =
    productPagination.total > 0 && products.length > 0
      ? (productPagination.currentPage - 1) * productPagination.perPage + 1
      : 0;
  const productPageEnd =
    productPagination.total > 0 && products.length > 0
      ? Math.min(
          productPagination.total,
          productPageStart + Math.max(products.length - 1, 0),
        )
      : 0;
  const canGoPreviousProductPage = productPagination.currentPage > 1;
  const canGoNextProductPage =
    productPagination.currentPage < productPagination.lastPage;
  const filteredBanners = useMemo(
    () =>
      banners.filter((banner) =>
        matchesSearch(
          tabSearch.banners,
          banner.title,
          banner.subtitle,
          banner.description,
          banner.buttonText,
          banner.buttonLink,
          `banner ${banner.displaySlot}`,
          banner.status ? "active" : "hidden",
        ),
      ),
    [banners, tabSearch.banners],
  );
  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        matchesSearch(
          tabSearch.categories,
          category.name,
          category.slug,
          category.description,
          category.status,
          getCategoryIconValue(category),
        ),
      ),
    [categories, tabSearch.categories],
  );
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesSearch(
          tabSearch.orders,
          order.id,
          order.customerName,
          order.paymentMethod,
          order.paymentStatus,
          order.status,
          order.total,
        ),
      ),
    [orders, tabSearch.orders],
  );
  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) =>
        matchesSearch(
          tabSearch.inventory,
          item.productName,
          item.variantLabel,
          item.quantity,
          item.reservedQuantity,
        ),
      ),
    [inventory, tabSearch.inventory],
  );
  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        matchesSearch(
          tabSearch.users,
          user.name,
          user.email,
          user.phone,
          user.role,
          user.status,
        ),
      ),
    [users, tabSearch.users],
  );
  const productVariantRows = ensureVariantRows(
    productForm.variants,
    productForm.slug || slugify(productForm.name),
  );
  const productPreviewUrl = productLocalPreviewUrl || productForm.imageUrl.trim();
  const bannerPreviewUrl = bannerLocalPreviewUrl || bannerForm.imageUrl.trim();
  const salePreview = useMemo(() => {
    const firstVariant = productVariantRows[0] || {};
    const salePercent = calculateSalePercentFromPrice(
      firstVariant.price,
      firstVariant.salePrice,
    );
    const salePrice = Number(firstVariant.salePrice || 0);

    if (salePercent === null || !Number.isFinite(salePrice)) {
      return null;
    }

    return {
      originalPrice: Number(firstVariant.price || 0),
      salePercent,
      salePrice,
    };
  }, [productVariantRows]);
  const productFormErrors = useMemo(() => {
    const skuCounts = productVariantRows.reduce((acc, variant) => {
      const sku = normalizeSelectValue(variant.sku);

      if (sku) {
        acc.set(sku, (acc.get(sku) || 0) + 1);
      }

      return acc;
    }, new Map());
    const variants = productVariantRows.map((variant) => {
      const errors = {};
      const sku = normalizeSelectValue(variant.sku);
      const price = Number(variant.price);
      const salePrice = Number(variant.salePrice);
      const stock = Number(variant.stock);

      if (!sku) {
        errors.sku = "SKU bắt buộc.";
      } else if ((skuCounts.get(sku) || 0) > 1) {
        errors.sku = "SKU không được trùng.";
      }

      if (variant.price === "" || !Number.isFinite(price) || price < 0) {
        errors.price = "Giá bán bắt buộc.";
      }

      if (
        variant.salePrice !== "" &&
        (!Number.isFinite(salePrice) || salePrice < 0)
      ) {
        errors.salePrice = "Giá khuyến mãi không hợp lệ.";
      } else if (
        variant.salePrice !== "" &&
        Number.isFinite(price) &&
        salePrice > price
      ) {
        errors.salePrice = "Giá khuyến mãi phải nhỏ hơn hoặc bằng giá bán.";
      }

      if (variant.stock !== "" && (!Number.isFinite(stock) || stock < 0)) {
        errors.stock = "Tồn kho phải lớn hơn hoặc bằng 0.";
      }

      return errors;
    });

    return {
      hasErrors: variants.some((errors) => Object.keys(errors).length > 0),
      variants,
    };
  }, [productVariantRows]);
  const brandOptions = useMemo(() => {
    const options = dedupeBrandOptions(brands);

    if (
      productForm.brandId &&
      !findOptionByValue(options, productForm.brandId)
    ) {
      options.push({
        id: productForm.brandId,
        name: productForm.brandName || "Thương hiệu hiện tại",
        slug: "",
      });
    }

    return options.sort((first, second) =>
      first.name.localeCompare(second.name, "vi"),
    );
  }, [brands, productForm.brandId, productForm.brandName]);
  const categoryOptions = useMemo(() => {
    const options = [...categories];

    if (
      productForm.categoryId &&
      !findOptionByValue(options, productForm.categoryId)
    ) {
      options.push({
        id: productForm.categoryId,
        name: productForm.categoryName || "Danh mục hiện tại",
      });
    }

    return options;
  }, [categories, productForm.categoryId, productForm.categoryName]);
  const handleTab = (nextTab) => {
    setSearchParams(nextTab === "dashboard" ? {} : { tab: nextTab });
  };

  const handleTabSearchChange = (tabKey, value) => {
    setTabSearch((current) => ({
      ...current,
      [tabKey]: value,
    }));

    if (tabKey === "products") {
      setProductPage(1);
    }
  };

  const handleProductPageChange = (nextPage) => {
    setProductPage(
      Math.min(Math.max(1, nextPage), Math.max(productPagination.lastPage, 1)),
    );
  };

  const handleProductChange = (event) => {
    const { checked, name, type, value } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    const selectedBrand =
      name === "brandId" ? findOptionByValue(brandOptions, nextValue) : null;
    const selectedCategory =
      name === "categoryId" ? findOptionByValue(categoryOptions, nextValue) : null;

    if (name === "imageUrl") {
      setProductLocalPreviewUrl("");
    }

    setProductForm((current) => {
      const nextSlug = name === "name" && !editingProductId
        ? slugify(nextValue)
        : current.slug;
      const shouldRefreshFirstSku = name === "name" && !editingProductId;

      return {
        ...current,
        [name]: nextValue,
        brandName: name === "brandId" ? selectedBrand?.name || "" : current.brandName,
        categoryName:
          name === "categoryId"
            ? selectedCategory?.name || ""
            : current.categoryName,
        imagePublicId: name === "imageUrl" ? "" : current.imagePublicId,
        slug: nextSlug,
        variants: ensureVariantRows(current.variants, nextSlug).map((variant, index) =>
          shouldRefreshFirstSku && index === 0
            ? { ...variant, sku: nextSlug ? nextSlug.toUpperCase() : "" }
            : variant,
        ),
      };
    });
  };

  const handleProductSeoChange = (field, value) => {
    setProductForm((current) => ({
      ...current,
      seo: {
        ...current.seo,
        [field]: value,
      },
    }));
  };

  const handleProductDescriptionChange = (value) => {
    setProductForm((current) => ({
      ...current,
      description: value,
    }));
  };

  const handleProductSpecGroupChange = (groupIndex, value) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) =>
        index === groupIndex ? { ...group, name: value } : group,
      ),
    }));
  };

  const handleProductSpecChange = (groupIndex, specIndex, field, value) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              items: group.items.map((spec, currentSpecIndex) =>
                currentSpecIndex === specIndex ? { ...spec, [field]: value } : spec,
              ),
            }
          : group,
      ),
    }));
  };

  const handleAddProductSpecGroup = () => {
    setProductForm((current) => ({
      ...current,
      specifications: [
        ...current.specifications,
        createEmptySpecGroup(current.specifications.length),
      ],
    }));
  };

  const handleRemoveProductSpecGroup = (groupIndex) => {
    setProductForm((current) => {
      const specifications = current.specifications.filter(
        (_, index) => index !== groupIndex,
      );

      return {
        ...current,
        specifications: specifications.length ? specifications : createDefaultSpecGroups(),
      };
    });
  };

  const handleAddProductSpec = (groupIndex) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              items: [...group.items, createEmptySpecRow()],
            }
          : group,
      ),
    }));
  };

  const handleRemoveProductSpec = (groupIndex, specIndex) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) => {
        if (index !== groupIndex) {
          return group;
        }

        const items = group.items.filter((_, itemIndex) => itemIndex !== specIndex);

        return {
          ...group,
          items: items.length ? items : [createEmptySpecRow()],
        };
      }),
    }));
  };

  const handleProductVariantChange = (index, field, value) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  };

  const handleCopyProductVariant = (index) => {
    setProductForm((current) => {
      const variants = ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      );
      const source = variants[index] || createEmptyVariant(0, current.slug);
      const copiedVariant = {
        ...source,
        collapsed: false,
        id: undefined,
        inventoryId: "",
        localId: createLocalId(`variant-copy-${index + 1}`),
        sku: source.sku ? `${source.sku}-COPY-${variants.length + 1}` : "",
        specifications: source.specifications.map((spec) => ({ ...spec })),
      };

      return {
        ...current,
        variants: [
          ...variants.slice(0, index + 1),
          copiedVariant,
          ...variants.slice(index + 1),
        ],
      };
    });
  };

  const handleToggleProductVariant = (index) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, variantIndex) =>
        variantIndex === index
          ? { ...variant, collapsed: !variant.collapsed }
          : variant,
      ),
    }));
  };

  const handleAddProductVariant = () => {
    setProductForm((current) => ({
      ...current,
      variants: [
        ...ensureVariantRows(current.variants, current.slug || slugify(current.name)),
        createEmptyVariant(
          ensureVariantRows(current.variants).length,
          current.slug || slugify(current.name),
        ),
      ],
    }));
  };

  const handleRemoveProductVariant = (index) => {
    setProductForm((current) => {
      const variants = ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).filter(
        (_, variantIndex) => variantIndex !== index,
      );

      return {
        ...current,
        variants: variants.length
          ? variants
          : [createEmptyVariant(0, current.slug || slugify(current.name))],
      };
    });
  };

  const handleVariantSpecChange = (variantIndex, specIndex, field, value) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, currentVariantIndex) =>
        currentVariantIndex === variantIndex
          ? {
              ...variant,
              specifications: variant.specifications.map((spec, currentSpecIndex) =>
                currentSpecIndex === specIndex ? { ...spec, [field]: value } : spec,
              ),
            }
          : variant,
      ),
    }));
  };

  const handleAddVariantSpec = (variantIndex) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, currentVariantIndex) =>
        currentVariantIndex === variantIndex
          ? {
              ...variant,
              specifications: [...variant.specifications, createEmptySpecRow()],
            }
          : variant,
      ),
    }));
  };

  const handleRemoveVariantSpec = (variantIndex, specIndex) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, currentVariantIndex) => {
        if (currentVariantIndex !== variantIndex) {
          return variant;
        }

        const specifications = variant.specifications.filter(
          (_, currentSpecIndex) => currentSpecIndex !== specIndex,
        );

        return {
          ...variant,
          specifications: specifications.length
            ? specifications
            : [createEmptySpecRow()],
        };
      }),
    }));
  };

  const handleBannerChange = (event) => {
    const { name, value } = event.target;

    if (name === "imageUrl") {
      setBannerImageFile(null);
      setBannerLocalPreviewUrl("");
    }

    setBannerForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCategoryChange = (event) => {
    const { name, value } = event.target;

    setCategoryForm((current) => ({
      ...current,
      [name]: value,
      slug:
        name === "name" && !editingCategoryId
          ? slugify(value)
          : current.slug,
    }));
  };

  const validateProductImageFile = (file) => {
    if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
      return "Chỉ hỗ trợ ảnh jpg, jpeg, png hoặc webp cho sản phẩm.";
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      return "Ảnh sản phẩm tối đa 5MB.";
    }

    return "";
  };

  const syncProductImages = (updater) => {
    setProductForm((current) => {
      const nextImages = ensureThumbnailImage(updater(current.images || []));
      const thumbnail = nextImages.find((image) => image.isThumbnail) || nextImages[0];

      return {
        ...current,
        imagePublicId: thumbnail?.publicId || "",
        images: nextImages,
        imageUrl: thumbnail?.imageUrl || "",
      };
    });
  };

  const uploadProductFiles = async (files, { thumbnail = false } = {}) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) {
      return;
    }

    const validationMessage = fileList.map(validateProductImageFile).find(Boolean);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setUploadingImage(true);
    setMessage("");

    if (thumbnail) {
      setProductLocalPreviewUrl(URL.createObjectURL(fileList[0]));
    }

    try {
      const uploadedImages = await Promise.all(
        fileList.map(async (file, index) => {
          const payload = await uploadService.uploadImage(file);

          return {
            imageUrl: getUploadImagePath(payload),
            isThumbnail: thumbnail && index === 0,
            localId: createLocalId("product-image"),
            productVariantId: null,
            publicId: getUploadImagePublicId(payload),
          };
        }),
      );

      syncProductImages((currentImages) => {
        if (thumbnail) {
          return [
            ...uploadedImages,
            ...currentImages.map((image) => ({
              ...image,
              isThumbnail: false,
            })),
          ];
        }

        return [...currentImages, ...uploadedImages];
      });
      if (thumbnail) {
        setProductLocalPreviewUrl("");
      }
      setMessage(thumbnail ? "Đã upload ảnh đại diện." : "Đã upload album ảnh.");
    } catch (err) {
      if (thumbnail) {
        setProductLocalPreviewUrl("");
      }
      setMessage(getApiErrorMessage(err, "Không upload được ảnh sản phẩm."));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageFile = async (event) => {
    await uploadProductFiles(event.target.files, { thumbnail: true });
    event.target.value = "";
  };

  const handleAlbumImageFiles = async (event) => {
    await uploadProductFiles(event.target.files, { thumbnail: false });
    event.target.value = "";
  };

  const handleSetProductThumbnail = (imageId) => {
    setProductLocalPreviewUrl("");
    syncProductImages((currentImages) =>
      currentImages.map((image) => ({
        ...image,
        isThumbnail: image.localId === imageId,
      })),
    );
  };

  const handleRemoveProductImage = (imageId) => {
    setProductLocalPreviewUrl("");
    syncProductImages((currentImages) =>
      currentImages.filter((image) => image.localId !== imageId),
    );
  };

  const handleRemoveProductThumbnail = () => {
    setProductLocalPreviewUrl("");
    setProductForm((current) => {
      const currentImages = current.images || [];
      const thumbnail =
        currentImages.find((image) => image.isThumbnail) ||
        currentImages.find((image) => image.imageUrl === current.imageUrl);
      const nextImages = ensureThumbnailImage(
        thumbnail
          ? currentImages.filter((image) => image.localId !== thumbnail.localId)
          : currentImages,
      );
      const nextThumbnail = nextImages.find((image) => image.isThumbnail);

      return {
        ...current,
        imagePublicId: nextThumbnail?.publicId || "",
        images: nextImages,
        imageUrl: nextThumbnail?.imageUrl || "",
      };
    });
  };

  const handleBannerImageFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!BANNER_IMAGE_TYPES.includes(file.type)) {
      setMessage("Chỉ hỗ trợ ảnh jpg, jpeg, png hoặc webp cho banner.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BANNER_IMAGE_SIZE) {
      setMessage("Ảnh banner tối đa 5MB.");
      event.target.value = "";
      return;
    }

    setBannerImageFile(file);
    setBannerLocalPreviewUrl(URL.createObjectURL(file));
    setBannerForm((current) => ({
      ...current,
      imageUrl: "",
    }));
    setMessage("");
    event.target.value = "";
  };

  const resetProductForm = () => {
    setProductLocalPreviewUrl("");
    setProductForm(createEmptyProductForm());
    setEditingProductId(null);
    setPendingSaleConfirmation(null);
    setProductFormOpen(false);
  };

  const openCreateProductForm = () => {
    setProductLocalPreviewUrl("");
    setProductForm(createEmptyProductForm());
    setEditingProductId(null);
    setPendingSaleConfirmation(null);
    setProductFormOpen(true);
  };

  const applyProductToForm = (product) => {
    setProductLocalPreviewUrl("");
    const normalizedProduct = normalizeProduct(product?.product || product);
    const rawProduct = normalizedProduct.raw || product || {};
    const variantRows = productVariantsToRows(normalizedProduct);
    const firstVariant = variantRows[0] || {};
    const selectedCategoryId = resolveProductCategoryId(normalizedProduct, categoryOptions);
    const selectedBrandId = resolveProductBrandId(normalizedProduct, brandOptions);
    const selectedCategory =
      findOptionByValue(categoryOptions, selectedCategoryId) ||
      findOptionByLabel(
        categoryOptions,
        normalizedProduct.category ||
          rawProduct.category_name ||
          rawProduct.category?.name,
      );
    const selectedBrand =
      findOptionByValue(brandOptions, selectedBrandId) ||
      findOptionByLabel(
        brandOptions,
        normalizedProduct.brand ||
          rawProduct.brand_name ||
          rawProduct.brand?.name,
      );
    const images = productImagesToRows(normalizedProduct);
    const thumbnailImage = images.find((image) => image.isThumbnail) || images[0];
    const productMeta = getInternalProductMeta(
      rawProduct.specifications || normalizedProduct.specifications,
    );

    setEditingProductId(normalizedProduct.id);
    setProductForm({
      ...createEmptyProductForm(),
      name: normalizedProduct.name,
      slug: normalizedProduct.slug || slugify(normalizedProduct.name),
      categoryId: selectedCategoryId ? String(selectedCategoryId) : "",
      categoryName:
        selectedCategory?.name ||
        normalizedProduct.category ||
        rawProduct.category_name ||
        rawProduct.category?.name ||
        "",
      brandId: selectedBrandId ? String(selectedBrandId) : "",
      brandName:
        selectedBrand?.name ||
        normalizedProduct.brand ||
        rawProduct.brand_name ||
        rawProduct.brand?.name ||
        "",
      description: rawProduct.description || normalizedProduct.description || "",
      featured: productMeta.featured,
      imagePublicId: thumbnailImage?.publicId || "",
      images,
      imageUrl: thumbnailImage?.imageUrl || "",
      price: normalizedProduct.price || firstVariant.price || "",
      salePercent: normalizedProduct.salePercent ?? rawProduct.sale_percent ?? "",
      seo: productMeta.seo,
      shortDescription:
        productMeta.shortDescription ||
        rawProduct.short_description ||
        rawProduct.shortDescription ||
        "",
      specifications: specificationsToGroups(
        rawProduct.specifications || normalizedProduct.specifications,
      ),
      status: rawProduct.status || normalizedProduct.status || "active",
      variants: variantRows,
    });
  };

  const handleEditProduct = async (product) => {
    setProductFormOpen(true);
    setSaving(true);
    setMessage("");

    try {
      const payload = await adminService.getProduct(product.id);
      applyProductToForm(payload?.product || payload);
    } catch (err) {
      applyProductToForm(product);
      setMessage(getApiErrorMessage(err, "Không tải được chi tiết sản phẩm, đang dùng dữ liệu danh sách."));
    } finally {
      setSaving(false);
    }
  };

  const syncVariantInventories = async (savedProduct, formVariants) => {
    const savedVariants = Array.isArray(savedProduct?.variants)
      ? savedProduct.variants
      : [];

    await Promise.all(
      formVariants.map(async (variant, index) => {
        const savedVariant =
          savedVariants.find((item) => String(item.sku) === String(variant.sku)) ||
          savedVariants[index];

        if (!savedVariant?.id) {
          return;
        }

        const quantity = Number(variant.stock || 0);

        if (!Number.isFinite(quantity) || quantity < 0) {
          return;
        }

        const inventoryPayload = {
          product_variant_id: Number(savedVariant.id),
          quantity,
          reserved_quantity: Number(savedVariant.inventory?.reserved_quantity || 0),
        };
        const inventoryId = savedVariant.inventory?.id;

        if (inventoryId) {
          await adminService.updateInventory(inventoryId, inventoryPayload);
          return;
        }

        await adminService.createInventory(inventoryPayload);
      }),
    );
  };

  const handleSaveProduct = async (event, options = {}) => {
    event?.preventDefault();
    setSaving(true);
    setMessage("");

    const categoryId = productForm.categoryId || categoryOptions[0]?.id;
    const brandId = productForm.brandId || brandOptions[0]?.id;
    const slug = productForm.slug || slugify(productForm.name);
    const firstVariant = productVariantRows[0] || {};
    const price = Number(firstVariant.price || productForm.price || 0);
    const salePercent = calculateSalePercentFromPrice(
      firstVariant.price,
      firstVariant.salePrice,
    );
    const variants = productVariantsToPayload(productVariantRows, slug, price);

    if (!categoryId || !brandId) {
      setSaving(false);
      setMessage("Vui lòng chọn danh mục và thương hiệu cho sản phẩm.");
      return;
    }

    if (!Number.isFinite(price)) {
      setSaving(false);
      setMessage("Giá sản phẩm không hợp lệ.");
      return;
    }

    if (productFormErrors.hasErrors) {
      setSaving(false);
      setMessage("Vui lòng kiểm tra lỗi trong danh sách biến thể.");
      return;
    }

    const payload = {
      category_id: Number(categoryId),
      brand_id: Number(brandId),
      name: productForm.name,
      slug,
      description: productForm.description,
      specifications: productSpecGroupsToObject(productForm.specifications, {
        featured: productForm.featured,
        seo: productForm.seo,
        shortDescription: productForm.shortDescription,
      }),
      price,
      sale_percent: salePercent,
      status: productForm.status || "active",
      variants,
      images: productImagesToPayload(productForm.images),
    };

    try {
      let savedProduct;

      if (editingProductId) {
        savedProduct = await adminService.updateProduct(editingProductId, payload);
        setMessage("Đã cập nhật sản phẩm.");
      } else {
        savedProduct = await adminService.createProduct(payload);
        setMessage("Đã thêm sản phẩm mới.");
      }

      await syncVariantInventories(savedProduct, productVariantRows);

      if (options.continueEditing) {
        const savedProductId = savedProduct?.id || editingProductId;

        if (savedProductId) {
          const detailPayload = await adminService.getProduct(savedProductId);
          applyProductToForm(detailPayload?.product || detailPayload);
        }
      } else {
        resetProductForm();
      }

      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không lưu được sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSaleProduct = async () => {
    const confirmation = pendingSaleConfirmation;

    if (!confirmation) {
      return;
    }

    setPendingSaleConfirmation(null);
    setSaving(true);
    setMessage("");

    try {
      if (confirmation.productId) {
        await adminService.updateProduct(confirmation.productId, confirmation.payload);
        setMessage("Đã cập nhật sản phẩm.");
      } else {
        await adminService.createProduct(confirmation.payload);
        setMessage("Đã thêm sản phẩm mới.");
      }

      resetProductForm();
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không lưu được sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.deleteProduct(productId);
      setMessage("Đã xoá sản phẩm.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không xoá được sản phẩm."));
    } finally {
      setSaving(false);
    }
  };

  const resetBannerForm = () => {
    setBannerImageFile(null);
    setBannerLocalPreviewUrl("");
    setBannerForm(createEmptyBannerForm());
    setEditingBannerId(null);
  };

  const handleEditBanner = (banner) => {
    setBannerImageFile(null);
    setBannerLocalPreviewUrl("");
    setEditingBannerId(banner.id);
    setBannerForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      buttonText: banner.buttonText || "",
      buttonLink: banner.buttonLink || "",
      imageUrl: banner.rawImageUrl || banner.imageUrl || "",
      displaySlot: String(banner.displaySlot || 1),
      sortOrder: String(banner.sortOrder ?? 0),
      status: banner.status ? "1" : "0",
    });
  };

  const handleSaveBanner = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const buttonLink = bannerForm.buttonLink.trim();
    const imageUrl = bannerForm.imageUrl.trim();

    if (!imageUrl && !bannerImageFile) {
      setSaving(false);
      setMessage("Vui lòng nhập URL ảnh hoặc upload ảnh banner.");
      return;
    }

    const bannerPayload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim() || null,
      description: bannerForm.description.trim() || null,
      button_text: bannerForm.buttonText.trim() || null,
      button_link: buttonLink || null,
      route: buttonLink || null,
      display_slot: Number(bannerForm.displaySlot || 1),
      sort_order: Number(bannerForm.sortOrder || 0),
      status: bannerForm.status === "1" ? "1" : "0",
    };
    const payload = bannerImageFile
      ? Object.entries(bannerPayload).reduce((formData, [key, value]) => {
          formData.append(key, value ?? "");
          return formData;
        }, new FormData())
      : {
          ...bannerPayload,
          image_url: imageUrl,
        };

    if (bannerImageFile) {
      payload.append("image", bannerImageFile);
    }

    try {
      if (editingBannerId) {
        await adminService.updateBanner(editingBannerId, payload);
        setMessage("Đã cập nhật banner.");
      } else {
        await adminService.createBanner(payload);
        setMessage("Đã thêm banner mới.");
      }

      resetBannerForm();
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không lưu được banner."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.deleteBanner(bannerId);
      setMessage("Đã xoá banner.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không xoá được banner."));
    } finally {
      setSaving(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategoryForm);
    setEditingCategoryId(null);
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || "",
      slug: category.slug || slugify(category.name),
      icon: getCategoryIconValue(category),
      description: category.description || "",
      status: category.status || "active",
    });
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug || slugify(categoryForm.name),
      icon: categoryForm.icon || null,
      description: categoryForm.description,
      status: categoryForm.status || "active",
    };

    try {
      if (editingCategoryId) {
        await adminService.updateCategory(editingCategoryId, payload);
        setMessage("Đã cập nhật danh mục.");
      } else {
        await adminService.createCategory(payload);
        setMessage("Đã thêm danh mục mới.");
      }

      resetCategoryForm();
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không lưu được danh mục."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.deleteCategory(categoryId);
      setMessage("Đã xóa danh mục.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không xóa được danh mục."));
    } finally {
      setSaving(false);
    }
  };

  const handleInventoryChange = (inventoryId, value) => {
    setInventory((current) =>
      current.map((item) =>
        item.id === inventoryId ? { ...item, quantity: Number(value) } : item,
      ),
    );
  };

  const handleSaveInventory = async (item) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.updateInventory(item.id, {
        quantity: Number(item.quantity),
        reserved_quantity: Number(item.reservedQuantity || 0),
      });
      setMessage("Đã cập nhật tồn kho.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không cập nhật được tồn kho."));
    } finally {
      setSaving(false);
    }
  };

  const handleOrderStatus = async (orderId, status) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.updateOrder(orderId, { status });
      setMessage("Đã cập nhật trạng thái đơn hàng.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không cập nhật được đơn hàng."));
    } finally {
      setSaving(false);
    }
  };

  const handleUserRoleChange = async (user, roleId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.updateUser(user.id, {
        role_id: Number(roleId),
      });
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                roleId: String(roleId),
                role:
                  roles.find((role) => Number(role.id) === Number(roleId))?.name ||
                  item.role,
              }
            : item,
        ),
      );
      setMessage("Đã cập nhật role người dùng.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không cập nhật được role người dùng."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`admin-dashboard admin-dashboard--${tab}`}>
      {loading ? <StatusMessage>Đang tải dữ liệu admin...</StatusMessage> : null}
      {message ? <StatusMessage>{message}</StatusMessage> : null}
      {pendingSaleConfirmation ? (
        <div className="sale-confirm-backdrop" role="presentation">
          <div
            aria-labelledby="sale-confirm-title"
            aria-modal="true"
            className="sale-confirm-modal"
            role="dialog"
          >
            <h2 id="sale-confirm-title">Xác nhận giảm giá</h2>
            <dl>
              <div>
                <dt>Giá gốc:</dt>
                <dd>{formatCurrency(pendingSaleConfirmation.originalPrice)}</dd>
              </div>
              <div>
                <dt>Giảm:</dt>
                <dd>{formatSalePercent(pendingSaleConfirmation.salePercent)}%</dd>
              </div>
              <div>
                <dt>Giá sau giảm:</dt>
                <dd>{formatCurrency(pendingSaleConfirmation.salePrice)}</dd>
              </div>
            </dl>
            <p>Bạn có chắc muốn áp dụng giảm giá cho sản phẩm này?</p>
            <div className="sale-confirm-actions">
              <button
                disabled={saving}
                onClick={() => setPendingSaleConfirmation(null)}
                type="button"
              >
                Hủy
              </button>
              <button
                className="admin-primary-action"
                disabled={saving}
                onClick={handleConfirmSaleProduct}
                type="button"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "dashboard" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Dashboard Overview</h1>
              <p>Monitor your store's performance across all metrics.</p>
            </div>
            <div className="admin-heading-actions">
              <button type="button">▣ Last 30 Days</button>
              <button className="admin-primary-action" type="button">
                ⇩ Export Report
              </button>
            </div>
          </div>

          <div className="dashboard-hero-grid">
            <article className="dashboard-card revenue-card">
              <div className="card-title-row">
                <h2>Total Revenue</h2>
                <div>
                  <strong>{formatCurrency(dashboard.totalRevenue)}</strong>
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="bar-chart">
                {chartBars.map((bar) => (
                  <div className="bar-column" key={bar.day}>
                    <span
                      className={bar.active ? "active" : ""}
                      style={{ height: `${bar.value}%` }}
                    />
                    <small>{bar.day}</small>
                  </div>
                ))}
              </div>
            </article>

            <div className="side-metric-stack">
              <article className="dashboard-card side-metric">
                <span className="metric-icon metric-icon--blue">▢</span>
                <div>
                  <small>Monthly Target</small>
                  <span>Total Orders</span>
                  <strong>{orders.length}</strong>
                  <div className="progress-line">
                    <i style={{ width: "78%" }} />
                  </div>
                </div>
              </article>
              <article className="dashboard-card side-metric">
                <span className="metric-icon metric-icon--green">◉</span>
                <div>
                  <small>New This Week</small>
                  <span>Active Users</span>
                  <strong>{dashboard.activeUsers}</strong>
                  <p>↗ 8% increase from last week</p>
                </div>
              </article>
            </div>
          </div>

          <div className="dashboard-content-grid">
            <article className="dashboard-card recent-orders">
              <div className="card-title-row">
                <h2>Recent Orders</h2>
                <button onClick={() => handleTab("orders")} type="button">
                  View All
                </button>
              </div>
              <table className="admin-clean-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 3).map((order) => (
                    <tr key={order.id}>
                      <td className="admin-link">#ORD-{order.id}</td>
                      <td>
                        <div className="admin-person">
                          <span>{initials(order.customerName)}</span>
                          {order.customerName}
                        </div>
                      </td>
                      <td>
                        <StatusPill>{order.status}</StatusPill>
                      </td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>•••</td>
                    </tr>
                  ))}
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="5">Chưa có đơn hàng từ backend.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </article>

            <article className="dashboard-card top-products">
              <h2>Top Products</h2>
              <div className="top-product-list">
                {products.slice(0, 3).map((product) => (
                  <div className="top-product-row" key={product.id}>
                    <div className="top-product-image">
                      {product.imageUrl ? (
                        <img alt={product.name} src={product.imageUrl} />
                      ) : (
                        <span>□</span>
                      )}
                    </div>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
                      <b>{formatCurrency(product.price)}</b>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => handleTab("inventory")} type="button">
                Manage Inventory
              </button>
            </article>
          </div>

          <div className="dashboard-kpi-row">
            <article>
              <span className="metric-icon metric-icon--blue">▤</span>
              <div>
                <small>Active Products</small>
                <strong>{products.length}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--green">◇</span>
              <div>
                <small>Live Banners</small>
                <strong>{dashboard.activeBanners}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--orange">▱</span>
              <div>
                <small>Pending Delivery</small>
                <strong>{dashboard.pendingOrders + dashboard.shippedOrders}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--purple">☆</span>
              <div>
                <small>Store Rating</small>
                <strong>4.9/5</strong>
              </div>
            </article>
          </div>
        </>
      ) : null}

      {tab === "products" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Quản lý sản phẩm</h1>
              <p>Thêm, cập nhật và quản lý sản phẩm từ BStore API.</p>
            </div>
            <button
              className="admin-create-product-button"
              onClick={openCreateProductForm}
              type="button"
            >
              <span aria-hidden="true">+</span>
              Thêm sản phẩm
            </button>
          </div>
          {productFormOpen ? (
            <ProductFormModal
              brandOptions={brandOptions}
              categories={categoryOptions}
              editingProductId={editingProductId}
              onAddProductSpec={handleAddProductSpec}
              onAddProductSpecGroup={handleAddProductSpecGroup}
              onAddVariant={handleAddProductVariant}
              onAddVariantSpec={handleAddVariantSpec}
              onAlbumImageFiles={handleAlbumImageFiles}
              onChange={handleProductChange}
              onClose={resetProductForm}
              onCopyVariant={handleCopyProductVariant}
              onDescriptionChange={handleProductDescriptionChange}
              onImageFile={handleImageFile}
              onRemoveProductImage={handleRemoveProductImage}
              onRemoveProductSpec={handleRemoveProductSpec}
              onRemoveProductSpecGroup={handleRemoveProductSpecGroup}
              onRemoveThumbnail={handleRemoveProductThumbnail}
              onRemoveVariant={handleRemoveProductVariant}
              onRemoveVariantSpec={handleRemoveVariantSpec}
              onSave={handleSaveProduct}
              onSeoChange={handleProductSeoChange}
              onSetThumbnail={handleSetProductThumbnail}
              onSpecChange={handleProductSpecChange}
              onSpecGroupChange={handleProductSpecGroupChange}
              onToggleVariant={handleToggleProductVariant}
              onVariantChange={handleProductVariantChange}
              onVariantSpecChange={handleVariantSpecChange}
              productForm={productForm}
              productFormErrors={productFormErrors}
              productPreviewUrl={productPreviewUrl}
              productVariantRows={productVariantRows}
              salePreview={salePreview}
              saving={saving}
              uploadingImage={uploadingImage}
            />
          ) : null}
          <div className="admin-grid admin-grid--product-table-only">
            <div className="admin-table-wrap">
              <AdminTabSearch
                onChange={(value) => handleTabSearchChange("products", value)}
                placeholder="Tìm sản phẩm..."
                value={tabSearch.products}
              />
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Thương hiệu</th>
                    <th>Biến thể</th>
                    <th>Thông số</th>
                    <th>Giá</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id || product.name}>
                      <td>
                        <div className="admin-product-cell">
                          <span>
                            {product.imageUrl ? (
                              <img alt="" src={resolveMediaUrl(product.imageUrl)} />
                            ) : (
                              product.name.slice(0, 1)
                            )}
                          </span>
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>{product.brand}</td>
                      <td>{getProductVariantCount(product) || "Chưa có"}</td>
                      <td>
                        {Object.keys(product.specifications || {}).length || "Chưa có"}
                      </td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <button onClick={() => handleEditProduct(product)} type="button">
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          type="button"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="admin-pagination">
                <span>
                  Hiển thị {productPageStart}-{productPageEnd} /{" "}
                  {productPagination.total} sản phẩm
                </span>
                <div>
                  <button
                    disabled={loading || !canGoPreviousProductPage}
                    onClick={() =>
                      handleProductPageChange(productPagination.currentPage - 1)
                    }
                    type="button"
                  >
                    Trước
                  </button>
                  <strong>
                    Trang {productPagination.currentPage} /{" "}
                    {productPagination.lastPage}
                  </strong>
                  <button
                    disabled={loading || !canGoNextProductPage}
                    onClick={() =>
                      handleProductPageChange(productPagination.currentPage + 1)
                    }
                    type="button"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {tab === "banners" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Banner Management</h1>
              <p>Upload banner images directly or paste an image URL for the home slider.</p>
            </div>
            <button
              className="admin-primary-action"
              onClick={resetBannerForm}
              type="button"
            >
              + Create Banner
            </button>
          </div>
          <div className="admin-grid admin-grid--wide-form">
            <form className="admin-form form-stack" onSubmit={handleSaveBanner}>
              <h2>{editingBannerId ? "Sửa banner" : "Thêm banner"}</h2>
              <div className="admin-form-section">
                <div className="admin-section-title">
                  <div>
                    <h3>Nội dung banner</h3>
                    <p>Tiêu đề, mô tả và nút kêu gọi hành động.</p>
                  </div>
                </div>
                <label>
                  Tiêu đề
                  <input
                    name="title"
                    onChange={handleBannerChange}
                    required
                    value={bannerForm.title}
                  />
                </label>
                <label>
                  Dòng phụ
                  <input
                    name="subtitle"
                    onChange={handleBannerChange}
                    value={bannerForm.subtitle}
                  />
                </label>
                <label>
                  Mô tả
                  <textarea
                    name="description"
                    onChange={handleBannerChange}
                    rows="3"
                    value={bannerForm.description}
                  />
                </label>
              </div>

              <div className="admin-form-section">
                <div className="admin-section-title">
                  <div>
                    <h3>Ảnh banner</h3>
                    <p>Nhập URL ảnh hoặc tải ảnh trực tiếp từ máy.</p>
                  </div>
                </div>
                <label>
                  URL ảnh
                  <input
                    name="imageUrl"
                    onChange={handleBannerChange}
                    placeholder="https://..."
                    required={!bannerImageFile}
                    value={bannerForm.imageUrl}
                  />
                </label>
                <label>
                  Tải ảnh từ máy
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={saving}
                    onChange={handleBannerImageFile}
                    type="file"
                  />
                </label>
                {bannerPreviewUrl ? (
                  <div className="image-preview image-preview--banner">
                    <img
                      alt="Xem trước ảnh banner"
                      src={bannerPreviewUrl}
                    />
                  </div>
                ) : null}
              </div>

              <div className="admin-form-section">
                <div className="admin-section-title">
                  <div>
                    <h3>Liên kết và hiển thị</h3>
                    <p>Cấu hình nút, thứ tự và trạng thái banner.</p>
                  </div>
                </div>
                <label>
                  Chữ trên nút
                  <input
                    name="buttonText"
                    onChange={handleBannerChange}
                    placeholder="Xem ngay"
                    value={bannerForm.buttonText}
                  />
                </label>
                <label>
                  Link khi bấm banner/nút
                  <input
                    name="buttonLink"
                    onChange={handleBannerChange}
                    placeholder="/products hoặc https://..."
                    value={bannerForm.buttonLink}
                  />
                </label>
                <div className="admin-inline-fields">
                  <label>
                    Khung hien thi
                    <select
                      name="displaySlot"
                      onChange={handleBannerChange}
                      value={bannerForm.displaySlot}
                    >
                      <option value="1">Khung banner 1 - lon</option>
                      <option value="2">Khung banner 2 - tren phai</option>
                      <option value="3">Khung banner 3 - duoi phai</option>
                    </select>
                  </label>
                  <label>
                    Thứ tự
                    <input
                      min="0"
                      name="sortOrder"
                      onChange={handleBannerChange}
                      type="number"
                      value={bannerForm.sortOrder}
                    />
                  </label>
                  <label>
                    Trạng thái
                    <select
                      name="status"
                      onChange={handleBannerChange}
                      value={bannerForm.status}
                    >
                      <option value="1">Đang bật</option>
                      <option value="0">Tạm ẩn</option>
                    </select>
                  </label>
                </div>
              </div>

              <button
                className="primary-button"
                disabled={saving}
                type="submit"
              >
                {saving ? "Đang lưu..." : "Lưu banner"}
              </button>
              {editingBannerId ? (
                <button
                  className="secondary-button"
                  onClick={resetBannerForm}
                  type="button"
                >
                  Huỷ sửa
                </button>
              ) : null}
            </form>

            <div className="banner-admin-list">
              <AdminTabSearch
                onChange={(value) => handleTabSearchChange("banners", value)}
                placeholder="Search banners..."
                value={tabSearch.banners}
              />
              {filteredBanners.map((banner) => (
                <article className="banner-admin-card" key={banner.id}>
                  <div className="banner-admin-image">
                    {banner.imageUrl ? (
                      <img alt={banner.title} src={banner.imageUrl} />
                    ) : (
                      <span>Banner</span>
                    )}
                  </div>
                  <div className="banner-admin-body">
                    <div>
                      <StatusPill>{banner.status ? "active" : "hidden"}</StatusPill>
                      <small>Khung {banner.displaySlot}</small>
                      <small>Thứ tự {banner.sortOrder}</small>
                    </div>
                    <h3>{banner.title}</h3>
                    <p>{banner.description || banner.subtitle || "Chưa có mô tả."}</p>
                    <div className="banner-admin-actions">
                      <button onClick={() => handleEditBanner(banner)} type="button">
                        Sửa
                      </button>
                      <button onClick={() => handleDeleteBanner(banner.id)} type="button">
                        Xoá
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {filteredBanners.length === 0 ? (
                <div className="admin-empty-state">
                  Chưa có banner từ backend. Thêm banner đầu tiên để hiển thị ở trang chủ.
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {tab === "categories" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Category Management</h1>
              <p>Create, update and publish category icons from the BStore API.</p>
            </div>
            <button
              className="admin-primary-action"
              onClick={resetCategoryForm}
              type="button"
            >
              + Create Category
            </button>
          </div>
          <div className="admin-grid">
            <form className="admin-form form-stack" onSubmit={handleSaveCategory}>
              <h2>{editingCategoryId ? "Edit category" : "Add category"}</h2>
              <label>
                Name
                <input
                  name="name"
                  onChange={handleCategoryChange}
                  required
                  value={categoryForm.name}
                />
              </label>
              <label>
                Slug
                <input
                  name="slug"
                  onChange={handleCategoryChange}
                  required
                  value={categoryForm.slug}
                />
              </label>
              <label>
                Icon
                <input
                  name="icon"
                  onChange={handleCategoryChange}
                  placeholder="emoji, text, https://... or uploads/categories/..."
                  value={categoryForm.icon}
                />
              </label>
              <div className="category-icon-preview-row">
                <CategoryIconPreview category={categoryForm} />
                <span>Preview</span>
              </div>
              <label>
                Status
                <select
                  name="status"
                  onChange={handleCategoryChange}
                  value={categoryForm.status}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  onChange={handleCategoryChange}
                  rows="4"
                  value={categoryForm.description}
                />
              </label>
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save category"}
              </button>
              {editingCategoryId ? (
                <button
                  className="secondary-button"
                  onClick={resetCategoryForm}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
            <div className="admin-table-wrap">
              <AdminTabSearch
                onChange={(value) => handleTabSearchChange("categories", value)}
                placeholder="Search categories..."
                value={tabSearch.categories}
              />
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Icon</th>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id || category.slug || category.name}>
                      <td>
                        <CategoryIconPreview category={category} />
                      </td>
                      <td>{category.name}</td>
                      <td>{category.slug}</td>
                      <td>{category.status || "active"}</td>
                      <td>
                        <button
                          onClick={() => handleEditCategory(category)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="5">No categories from backend yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {tab === "orders" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Order Management</h1>
              <p>Review and manage customer purchases and fulfillment status.</p>
            </div>
            <div className="admin-heading-actions">
              <button type="button">⇩ Export CSV</button>
              <button className="admin-primary-action" type="button">
                + Create Order
              </button>
            </div>
          </div>
          <div className="order-metric-row">
            <article>
              <span className="metric-icon metric-icon--purple">▤</span>
              <div>
                <small>Total Orders</small>
                <strong>{orders.length}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--blue">▣</span>
              <div>
                <small>Pending Fulfillment</small>
                <strong>{dashboard.pendingOrders}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--blue">▱</span>
              <div>
                <small>In Transit</small>
                <strong>{dashboard.shippedOrders}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--red">⊗</span>
              <div>
                <small>Refund Requests</small>
                <strong>0</strong>
              </div>
            </article>
          </div>
          <div className="admin-filter-card">
            <button type="button">All Statuses⌄</button>
            <button type="button">Last 30 Days</button>
            <button type="button">All Payment Methods⌄</button>
            <button type="button">Clear all filters</button>
          </div>
          <div className="admin-table-wrap">
            <AdminTabSearch
              onChange={(value) => handleTabSearchChange("orders", value)}
              placeholder="Search orders..."
              value={tabSearch.orders}
            />
            <table className="admin-table admin-order-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="admin-link">#ORD-{order.id}</td>
                    <td>
                      <div className="admin-person">
                        <span>{initials(order.customerName)}</span>
                        {order.customerName}
                      </div>
                    </td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>{order.paymentStatus || order.paymentMethod}</td>
                    <td>
                      <select
                        onChange={(event) =>
                          handleOrderStatus(order.id, event.target.value)
                        }
                        value={order.status}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="shipping">shipping</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td>•••</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "inventory" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>Inventory Control</h1>
              <p>Update product stock and reserved quantities.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <AdminTabSearch
              onChange={(value) => handleTabSearchChange("inventory", value)}
              placeholder="Search inventory..."
              value={tabSearch.inventory}
            />
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Biến thể</th>
                  <th>Tồn kho</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id || item.productName}>
                    <td>{item.productName}</td>
                    <td>{item.variantLabel || "Mặc định"}</td>
                    <td>
                      <input
                        min="0"
                        onChange={(event) =>
                          handleInventoryChange(item.id, event.target.value)
                        }
                        type="number"
                        value={item.quantity}
                      />
                    </td>
                    <td>
                      <button onClick={() => handleSaveInventory(item)} type="button">
                        Lưu kho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "users" ? (
        <>
          <div className="admin-page-heading">
            <div>
              <h1>User Management</h1>
              <p>Oversee user accounts, permissions, and security policies.</p>
            </div>
            <button className="admin-primary-action" type="button">
              + Create User
            </button>
          </div>
          <div className="order-metric-row">
            <article>
              <span className="metric-icon metric-icon--blue">◉</span>
              <div>
                <small>Total Users</small>
                <strong>{users.length}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--green">◇</span>
              <div>
                <small>Active Now</small>
                <strong>{dashboard.activeUsers}</strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--orange">▣</span>
              <div>
                <small>Admins</small>
                <strong>
                  {users.filter((user) => user.role.toLowerCase().includes("admin")).length}
                </strong>
              </div>
            </article>
            <article>
              <span className="metric-icon metric-icon--red">⊘</span>
              <div>
                <small>Suspended</small>
                <strong>
                  {users.filter((user) => user.status === "suspended").length}
                </strong>
              </div>
            </article>
          </div>
          <div className="admin-table-wrap">
            <AdminTabSearch
              onChange={(value) => handleTabSearchChange("users", value)}
              placeholder="Search users..."
              value={tabSearch.users}
            />
            <table className="admin-table admin-user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-person">
                        <span>{initials(user.name)}</span>
                        <div>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{user.phone}</td>
                    <td>
                      <StatusPill>{user.status}</StatusPill>
                    </td>
                    <td>
                      <select
                        className="admin-role-select"
                        disabled={saving || roles.length === 0}
                        onChange={(event) =>
                          handleUserRoleChange(user, event.target.value)
                        }
                        value={String(user.roleId)}
                      >
                        {roles.length === 0 ? (
                          <option value={user.roleId}>{user.role}</option>
                        ) : null}
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "settings" ? (
        <div className="dashboard-card settings-card">
          <h1>Settings</h1>
          <p>Điều chỉnh endpoint backend tại file cấu hình API.</p>
          <Link className="primary-button" to="/products">
            Về cửa hàng
          </Link>
        </div>
      ) : null}
    </section>
  );
}
