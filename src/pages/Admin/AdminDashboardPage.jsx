import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage, readCollection } from "../../services/api";
import { adminService, uploadService } from "../../services/bstoreService";
import DashboardOverview from "./Dashboard/DashboardOverview";
import useDashboardMetrics from "./Dashboard/useDashboardMetrics";
import AdminProductsPage from "./Products/AdminProductsPage";
import useProductFormState from "./Products/useProductFormState";
import AdminBannersPage from "./Banners/AdminBannersPage";
import useBannerManagement from "./Banners/useBannerManagement";
import AdminCategoriesPage from "./Categories/AdminCategoriesPage";
import useCategoryManagement from "./Categories/useCategoryManagement";
import AdminInventoryPage from "./Inventory/AdminInventoryPage";
import useInventoryManagement from "./Inventory/useInventoryManagement";
import AdminSettingsPage from "./Settings/AdminSettingsPage";
import {
  MAX_PRODUCT_IMAGE_SIZE,
  PRODUCT_IMAGE_TYPES,
  CategoryIconPreview,
  createLocalId,
  ensureVariantRows,
  ensureThumbnailImage,
  createEmptyProductForm,
  createEmptyBannerForm,
  ADMIN_PRODUCT_PAGE_SIZE,
  ADMIN_USER_PAGE_SIZE,
  ADMIN_INVENTORY_PAGE_SIZE,
  ADMIN_TABS,
  STAFF_TABS,
  emptyCategoryForm,
  emptyTabSearch,
  REVENUE_RANGES,
  normalizeOrder,
  matchesSearch,
  normalizeSelectValue,
  dedupeBrandOptions,
  findOptionByValue,
  findOptionByLabel,
  AdminTabSearch,
  getCategoryIconValue,
  getInternalProductMeta,
  getProductVariantCount,
  getUploadImagePath,
  getUploadImagePublicId,
  productImagesToPayload,
  productImagesToRows,
  productSpecGroupsToObject,
  productVariantsToPayload,
  productVariantsToRows,
  resolveProductBrandId,
  resolveProductCategoryId,
  specificationsToGroups,
  readSalePercent,
  resolveFormSalePercent,
  createProductPagination,
  normalizeProductPagination,
  normalizeAdminProducts,
  normalizeManagedUserPage,
  normalizeInventoryItems,
  getFirstRejectedResult,
  normalizeAdminBanner,
  StatusPill,
  AdminPagination,
} from "./Dashboard/adminDashboardShared";
import {
  calculateSalePrice,
  formatCurrency,
  formatSalePercent,
  getRole,
  normalizeProduct,
  slugify,
  USER_ROLES,
} from "../../utils/formatters";

export default function AdminDashboardPage({ page }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { initialized, isAuthenticated, token, user } = useAuth();
  const tab = page || searchParams.get("tab") || "dashboard";
  const currentRole = getRole(user);
  const allowedTabs = currentRole === USER_ROLES.STAFF ? STAFF_TABS : ADMIN_TABS;
  const [products, setProducts] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState(() =>
    createProductPagination(),
  );
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryServerPagination, setInventoryServerPagination] = useState(() => ({
    currentPage: 1,
    lastPage: 1,
    perPage: ADMIN_INVENTORY_PAGE_SIZE,
    total: 0,
  }));
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tabSearch, setTabSearch] = useState(emptyTabSearch);
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
  const [revenueRange, setRevenueRange] = useState(30);
  const [message, setMessage] = useState("");

  const {
    brandOptions,
    categoryOptions,
    handleProductChange,
    handleProductDescriptionChange,
    handleProductSpecGroupChange,
    handleProductSpecChange,
    handleAddProductSpecGroup,
    handleRemoveProductSpecGroup,
    handleAddProductSpec,
    handleRemoveProductSpec,
    handleProductVariantChange,
    handleCopyProductVariant,
    handleToggleProductVariant,
    handleAddProductVariant,
    handleRemoveProductVariant,
    handleVariantSpecChange,
    handleAddVariantSpec,
    handleRemoveVariantSpec,
    productForm,
    setProductForm,
  } = useProductFormState({
    brands,
    categories,
    editingProductId,
    setProductLocalPreviewUrl,
  });

  const loadAdminData = useCallback(async (config = {}) => {
    if (!initialized || !isAuthenticated || !token ||
      ![USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(currentRole) || !allowedTabs.has(tab)) {
      return;
    }

    setLoading(true);
    setMessage("");

    const productRequestPage = tab === "products" ? productPage : 1;
    const productRequestPageSize = ADMIN_PRODUCT_PAGE_SIZE;
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
          per_page: productRequestPageSize,
          search: productSearch,
        }, config),
      );
    }

    if (["dashboard", "banners"].includes(tab)) {
      addRequest("banners", adminService.getBanners(config));
    }

    if (["products", "categories"].includes(tab)) {
      addRequest("categories", adminService.getCategories({}, config));
    }

    if (tab === "products") {
      addRequest("brands", adminService.getBrands({ page: 1, per_page: 100 }, config));
    }

    if (["dashboard", "inventory"].includes(tab)) {
      addRequest("inventory", adminService.getInventory({
        page: inventoryPage,
        per_page: ADMIN_INVENTORY_PAGE_SIZE,
        search: tab === "inventory" ? tabSearch.inventory.trim() || undefined : undefined,
      }, config));
    }

    if (tab === "dashboard") {
      addRequest("orders", adminService.getOrders({ page: 1, per_page: 20 }, config));
    }

    if (tab === "dashboard") {
      addRequest(
        "customers",
        adminService.getCustomers({
          page: 1,
          per_page: ADMIN_USER_PAGE_SIZE,
        }, config),
      );
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
      setInventoryServerPagination(normalizeProductPagination(results.inventory.value, inventoryPage));
    }

    if (results.orders?.status === "fulfilled") {
      setOrders(readCollection(results.orders.value, ["orders"]).map(normalizeOrder));
    }

    if (results.customers?.status === "fulfilled") {
      const normalizedCustomers = normalizeManagedUserPage(
        results.customers.value,
        ["customers", "users"],
        1,
      );

      setCustomers(normalizedCustomers.list);
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

    if (!config.signal?.aborted) setLoading(false);
  }, [
    allowedTabs,
    currentRole,
    initialized,
    inventoryPage,
    isAuthenticated,
    productPage,
    tab,
    tabSearch.inventory,
    tabSearch.products,
    token,
  ]);

  const {
    handleBannerChange,
    handleBannerImageFile,
    resetBannerForm,
    handleEditBanner,
    handleSaveBanner,
    handleDeleteBanner,
  } = useBannerManagement({
    bannerForm,
    bannerImageFile,
    editingBannerId,
    loadAdminData,
    setBannerForm,
    setBannerImageFile,
    setBannerLocalPreviewUrl,
    setEditingBannerId,
    setMessage,
    setSaving,
  });

  const {
    handleCategoryChange,
    resetCategoryForm,
    handleEditCategory,
    handleSaveCategory,
    handleDeleteCategory,
  } = useCategoryManagement({
    categoryForm,
    editingCategoryId,
    loadAdminData,
    setCategoryForm,
    setEditingCategoryId,
    setMessage,
    setSaving,
  });

  const {
    handleInventoryChange,
    handleSaveInventory,
  } = useInventoryManagement({
    loadAdminData,
    setInventory,
    setMessage,
    setSaving,
  });

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => loadAdminData({ signal: controller.signal }));
    return () => controller.abort();
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

  const dashboard = useDashboardMetrics({
    banners,
    customers,
    inventory,
    orders,
    revenueRange,
  });
  const handleExportRevenue = () => {
    const rows = [
      ["Mã đơn", "Khách hàng", "Ngày tạo", "Trạng thái", "Doanh thu"],
      ...dashboard.revenueOrders.map((order) => [
        order.id,
        order.customerName,
        order.createdAt,
        order.status,
        order.total,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `doanh-thu-${revenueRange}-ngay.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
  const inventoryPagination = inventoryServerPagination;
  const pagedInventory = filteredInventory;
  const productVariantRows = ensureVariantRows(
    productForm.variants,
    productForm.slug || slugify(productForm.name),
  );
  const productPreviewUrl = productLocalPreviewUrl || productForm.imageUrl.trim();
  const bannerPreviewUrl = bannerLocalPreviewUrl || bannerForm.imageUrl.trim();
  const salePreview = useMemo(() => {
    const firstVariant = productVariantRows[0] || {};
    const originalPrice = Number(firstVariant.price || productForm.price || 0);
    const enteredSalePercent = readSalePercent(productForm.salePercent);
    const salePercent = resolveFormSalePercent(productForm, firstVariant);
    const salePrice = enteredSalePercent !== null
      ? calculateSalePrice(originalPrice, enteredSalePercent)
      : Number(firstVariant.salePrice || 0);

    if (
      salePercent === null ||
      salePercent <= 0 ||
      salePercent >= 100 ||
      salePrice === null ||
      !Number.isFinite(salePrice) ||
      salePrice <= 0
    ) {
      return null;
    }

    return {
      originalPrice,
      salePercent,
      salePrice,
    };
  }, [productForm, productVariantRows]);
  const productFormErrors = useMemo(() => {
    const salePercent = readSalePercent(productForm.salePercent);
    const salePercentError = productForm.salePercent !== "" &&
      (salePercent === null || salePercent < 0 || salePercent >= 100)
      ? "Giảm giá phải từ 0 đến dưới 100%."
      : "";
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
      hasErrors:
        Boolean(salePercentError) ||
        variants.some((errors) => Object.keys(errors).length > 0),
      salePercent: salePercentError,
      variants,
    };
  }, [productForm.salePercent, productVariantRows]);
  const handleTab = (nextTab) => {
    const pageRoutes = {
      banners: "/admin/banners",
      categories: "/admin/categories",
      dashboard: "/admin",
      inventory: "/admin/inventory",
      orders: "/admin/orders",
      products: "/admin/products",
      settings: "/admin/settings",
    };
    if (pageRoutes[nextTab]) navigate(pageRoutes[nextTab]);
    else setSearchParams(nextTab === "dashboard" ? {} : { tab: nextTab });
  };

  const handleTabSearchChange = (tabKey, value) => {
    setTabSearch((current) => ({
      ...current,
      [tabKey]: value,
    }));

    if (tabKey === "products") {
      setProductPage(1);
    }

    if (tabKey === "inventory") {
      setInventoryPage(1);
    }
  };

  const handleProductPageChange = (nextPage) => {
    setProductPage(
      Math.min(Math.max(1, nextPage), Math.max(productPagination.lastPage, 1)),
    );
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
    const salePercent = resolveFormSalePercent(productForm, firstVariant);
    const variants = productVariantsToPayload(
      productVariantRows,
      slug,
      price,
      salePercent,
    );

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

  if (![USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(currentRole) || !allowedTabs.has(tab)) {
    return <Navigate replace to="/403" />;
  }

  const adminViewProps = {
    AdminPagination,
    AdminTabSearch,
    CategoryIconPreview,
    StatusPill,
    bannerForm,
    bannerImageFile,
    bannerPreviewUrl,
    brandOptions,
    canGoNextProductPage,
    canGoPreviousProductPage,
    categoryOptions,
    categoryForm,
    editingBannerId,
    editingCategoryId,
    editingProductId,
    filteredBanners,
    filteredCategories,
    formatCurrency,
    getProductVariantCount,
    handleAddProductSpec,
    handleAddProductSpecGroup,
    handleAddProductVariant,
    handleAddVariantSpec,
    handleAlbumImageFiles,
    handleCopyProductVariant,
    handleBannerChange,
    handleBannerImageFile,
    handleCategoryChange,
    handleDeleteBanner,
    handleDeleteCategory,
    handleDeleteProduct,
    handleEditBanner,
    handleEditCategory,
    handleEditProduct,
    handleImageFile,
    handleInventoryChange,
    handleProductChange,
    handleProductDescriptionChange,
    handleProductPageChange,
    handleProductSpecChange,
    handleProductSpecGroupChange,
    handleProductVariantChange,
    handleRemoveProductImage,
    handleRemoveProductSpec,
    handleRemoveProductSpecGroup,
    handleRemoveProductThumbnail,
    handleRemoveProductVariant,
    handleRemoveVariantSpec,
    handleSaveBanner,
    handleSaveCategory,
    handleSaveInventory,
    handleSaveProduct,
    handleSetProductThumbnail,
    handleTabSearchChange,
    handleToggleProductVariant,
    handleVariantSpecChange,
    inventoryPagination,
    loading,
    openCreateProductForm,
    pagedInventory,
    productForm,
    productFormErrors,
    productFormOpen,
    productPageEnd,
    productPageStart,
    productPagination,
    productPreviewUrl,
    products,
    productVariantRows,
    resetProductForm,
    resetBannerForm,
    resetCategoryForm,
    saving,
    salePreview,
    setInventoryPage,
    setProductPage,
    tabSearch,
    uploadingImage,
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
        <DashboardOverview
          dashboard={dashboard}
          onExportRevenue={handleExportRevenue}
          onNavigateToOrder={(orderId) =>
            navigate(`/admin/orders?orderId=${encodeURIComponent(orderId)}`)
          }
          onRevenueRangeChange={setRevenueRange}
          onTabChange={handleTab}
          orders={orders}
          products={products}
          revenueRange={revenueRange}
          revenueRanges={REVENUE_RANGES}
        />
      ) : null}

      {tab === "products" ? <AdminProductsPage {...adminViewProps} /> : null}
      {tab === "banners" ? <AdminBannersPage {...adminViewProps} /> : null}
      {tab === "categories" ? <AdminCategoriesPage {...adminViewProps} /> : null}
      {tab === "inventory" ? <AdminInventoryPage {...adminViewProps} /> : null}
      {tab === "settings" ? <AdminSettingsPage /> : null}
    </section>
  );
}
