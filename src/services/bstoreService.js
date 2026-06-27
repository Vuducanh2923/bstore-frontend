import api, { readCollection, unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";

const toPayload = (request) => request.then(unwrapResponse);
const toBody = (request) => request.then((response) => response.data);
const isFormDataPayload = (payload) =>
  typeof FormData !== "undefined" && payload instanceof FormData;
const ADMIN_BRANDS_PAGE_SIZE = 100;

function getPaginationValue(payload = {}, key, fallback = undefined) {
  const meta = payload.meta || payload.pagination || {};

  return payload[key] ?? meta[key] ?? fallback;
}

function normalizeBrandsPagination(payload = {}, fallbackPage = 1) {
  const page = Number(
    getPaginationValue(
      payload,
      "page",
      getPaginationValue(payload, "current_page", fallbackPage),
    ),
  );
  const limit = Number(
    getPaginationValue(
      payload,
      "limit",
      getPaginationValue(payload, "per_page", ADMIN_BRANDS_PAGE_SIZE),
    ),
  );
  const total = Number(getPaginationValue(payload, "total", 0));
  const totalPages = Number(
    getPaginationValue(
      payload,
      "totalPages",
      getPaginationValue(
        payload,
        "last_page",
        getPaginationValue(payload, "total_pages", total > 0 ? Math.ceil(total / Math.max(limit, 1)) : 1),
      ),
    ),
  );

  return {
    limit: Math.max(1, limit || ADMIN_BRANDS_PAGE_SIZE),
    page: Math.max(1, page || fallbackPage),
    total: Math.max(0, total || 0),
    totalPages: Math.max(1, totalPages || 1),
  };
}

async function getAllAdminBrands(params = {}) {
  const requestedLimit = Number(params.limit ?? params.per_page ?? ADMIN_BRANDS_PAGE_SIZE);
  const pageSize = Math.min(
    ADMIN_BRANDS_PAGE_SIZE,
    Math.max(1, requestedLimit || ADMIN_BRANDS_PAGE_SIZE),
  );
  const baseParams = {
    ...params,
    limit: pageSize,
    per_page: pageSize,
  };
  const fetchAdminBrandsPage = async (page) => {
    const response = await api.get(API_ENDPOINTS.admin.brands, {
      params: {
        ...baseParams,
        page,
      },
    });

    return response.data;
  };
  const fetchPublicBrands = async () => {
    const response = await api.get(API_ENDPOINTS.brands.list);
    const payload = response.data;
    const brands = readCollection(payload, ["brands"]);

    return {
      success: payload?.success ?? true,
      message: payload?.message ?? "Success",
      data: brands,
      brands,
      pagination: {
        page: 1,
        limit: brands.length || pageSize,
        total: brands.length,
        totalPages: 1,
      },
    };
  };

  try {
    const firstPayload = await fetchAdminBrandsPage(1);
    const firstPageBrands = readCollection(firstPayload, ["brands"]);
    const pagination = normalizeBrandsPagination(firstPayload, 1);
    const totalPages = pagination.totalPages;

    if (totalPages <= 1) {
      return firstPayload;
    }

    const remainingPayloads = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        fetchAdminBrandsPage(index + 2),
      ),
    );
    const brands = [
      ...firstPageBrands,
      ...remainingPayloads.flatMap((payload) =>
        readCollection(payload, ["brands"]),
      ),
    ];

    return {
      ...firstPayload,
      data: brands,
      brands,
      pagination: {
        ...firstPayload.pagination,
        ...pagination,
        total: pagination.total || brands.length,
      },
    };
  } catch (error) {
    if (![404, 405].includes(Number(error?.response?.status))) {
      throw error;
    }

    return fetchPublicBrands();
  }
}

export const authService = {
  register: (payload) =>
    toPayload(api.post(API_ENDPOINTS.auth.register, payload)),
  login: (payload) => toPayload(api.post(API_ENDPOINTS.auth.login, payload)),
  me: () => toPayload(api.get(API_ENDPOINTS.auth.me)),
};

export const productService = {
  getProducts: (params) =>
    toPayload(api.get(API_ENDPOINTS.products.list, { params })),
  getSaleProducts: (params) =>
    toPayload(api.get(API_ENDPOINTS.products.sale, { params })),
  getProduct: (slug) => toPayload(api.get(API_ENDPOINTS.products.detail(slug))),
  getCategories: () => toPayload(api.get(API_ENDPOINTS.categories.list)),
  getBrands: () => toPayload(api.get(API_ENDPOINTS.brands.list)),
};

export const bannerService = {
  getBanners: () => toPayload(api.get(API_ENDPOINTS.banners.list)),
  getHomeBanners: () => toPayload(api.get(API_ENDPOINTS.home.banners)),
  getBanner: (bannerId) =>
    toPayload(api.get(API_ENDPOINTS.banners.detail(bannerId))),
};

export const uploadService = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);

    return toPayload(api.post(API_ENDPOINTS.uploads.image, formData));
  },
};

export const cartService = {
  getCarts: () => toPayload(api.get(API_ENDPOINTS.cart.list)),
  getCart: (cartId) => toPayload(api.get(API_ENDPOINTS.cart.detail(cartId))),
  createCart: (payload) => toPayload(api.post(API_ENDPOINTS.cart.create, payload)),
  addItem: (payload) => toPayload(api.post(API_ENDPOINTS.cart.items, payload)),
  updateItem: (cartItemId, payload) =>
    toPayload(api.put(API_ENDPOINTS.cart.item(cartItemId), payload)),
  removeItem: (cartItemId) =>
    toPayload(api.delete(API_ENDPOINTS.cart.item(cartItemId))),
};

export const orderService = {
  createOrder: (payload) =>
    toPayload(api.post(API_ENDPOINTS.orders.create, payload)),
  getOrders: () => toPayload(api.get(API_ENDPOINTS.orders.list)),
  getOrder: (orderId) => toPayload(api.get(API_ENDPOINTS.orders.detail(orderId))),
};

export const paymentService = {
  createPayment: (payload) =>
    toPayload(api.post(API_ENDPOINTS.payments.create, payload)),
  getPayments: () => toPayload(api.get(API_ENDPOINTS.payments.list)),
};

export const adminService = {
  getProducts: (params) =>
    toBody(api.get(API_ENDPOINTS.admin.products, { params })),
  getProduct: (productId) =>
    toPayload(api.get(API_ENDPOINTS.admin.product(productId))),
  getBanners: () => toPayload(api.get(API_ENDPOINTS.admin.banners)),
  createBanner: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.banners, payload)),
  updateBanner: (bannerId, payload) =>
    toPayload(
      isFormDataPayload(payload)
        ? api.post(API_ENDPOINTS.admin.banner(bannerId), payload)
        : api.put(API_ENDPOINTS.admin.banner(bannerId), payload),
    ),
  deleteBanner: (bannerId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.banner(bannerId))),
  getCategories: () => toPayload(api.get(API_ENDPOINTS.admin.categories)),
  createCategory: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.categories, payload)),
  updateCategory: (categoryId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.category(categoryId), payload)),
  deleteCategory: (categoryId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.category(categoryId))),
  getBrands: (params) => getAllAdminBrands(params),
  getRoles: () => toPayload(api.get(API_ENDPOINTS.admin.roles)),
  getUsers: () => toPayload(api.get(API_ENDPOINTS.admin.users)),
  updateUser: (userId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.user(userId), payload)),
  createProduct: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.products, payload)),
  updateProduct: (productId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.product(productId), payload)),
  deleteProduct: (productId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.product(productId))),
  getInventory: () => toPayload(api.get(API_ENDPOINTS.admin.inventory)),
  createInventory: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.inventory, payload)),
  updateInventory: (inventoryId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.inventoryItem(inventoryId), payload)),
  getOrders: () => toPayload(api.get(API_ENDPOINTS.admin.orders)),
  updateOrder: (orderId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.order(orderId), payload)),
};
