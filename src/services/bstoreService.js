import api, { getToken, readCollection, unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";
import authApi from "./authApi";
import orderApi from "./orderApi";
import { cachedRequest, createRequestKey } from "../utils/requestCache";

const toPayload = (request) => request.then(unwrapResponse);
const toBody = (request) => request.then((response) => response.data);
const isFormDataPayload = (payload) =>
  typeof FormData !== "undefined" && payload instanceof FormData;
const ADMIN_BRANDS_PAGE_SIZE = 100;
const SUPPRESS_GLOBAL_ERROR_CONFIG = { suppressGlobalError: true };

function isEndpointUnavailable(error) {
  return [404, 405].includes(Number(error?.response?.status));
}

async function withEndpointFallback(primaryRequest, fallbackRequest) {
  try {
    return await primaryRequest();
  } catch (error) {
    if (!isEndpointUnavailable(error)) {
      throw error;
    }

    return fallbackRequest(error);
  }
}

function normalizeVnpayPaymentPayload(payload = {}) {
  const orderId = payload.order_id ?? payload.orderId;

  if (orderId === null || orderId === undefined || orderId === "") {
    throw new Error("Không thể tạo thanh toán VNPAY vì thiếu order_id.");
  }

  return {
    order_id: orderId,
    order_info:
      payload.order_info ||
      payload.orderInfo ||
      `Thanh toán đơn hàng #${orderId}`,
  };
}

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

export const authService = authApi;

export const productService = {
  getProducts: (params = {}) => cachedRequest(
    createRequestKey("products", params),
    () => toPayload(api.get(API_ENDPOINTS.products.list, { params })),
    { ttl: 60_000 },
  ),
  getSaleProducts: (params = {}) => cachedRequest(
    createRequestKey("sale-products", params),
    () => toPayload(api.get(API_ENDPOINTS.products.sale, { params })),
    { ttl: 60_000 },
  ),
  getProduct: (slug) => cachedRequest(
    `product:${slug}`,
    () => toPayload(api.get(API_ENDPOINTS.products.detail(slug))),
    { ttl: 60_000 },
  ),
  getCategories: () => cachedRequest(
    "catalog:categories",
    () => toPayload(api.get(API_ENDPOINTS.categories.list)),
  ),
  getBrands: () => cachedRequest(
    "catalog:brands",
    () => toPayload(api.get(API_ENDPOINTS.brands.list)),
  ),
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

export const profileService = {
  getProfile: () => toPayload(api.get(API_ENDPOINTS.profile.detail)),
  updateProfile: (payload) =>
    toPayload(api.put(API_ENDPOINTS.profile.detail, payload)),
  getAddresses: () => toPayload(api.get(API_ENDPOINTS.profile.addresses)),
  createAddress: (payload) =>
    toPayload(api.post(API_ENDPOINTS.profile.addresses, payload)),
  updateAddress: (addressId, payload) =>
    toPayload(api.put(API_ENDPOINTS.profile.address(addressId), payload)),
  deleteAddress: (addressId) =>
    toPayload(api.delete(API_ENDPOINTS.profile.address(addressId))),
  setDefaultAddress: (addressId) =>
    toPayload(api.patch(API_ENDPOINTS.profile.defaultAddress(addressId))),
  changePassword: (payload) =>
    toPayload(api.put(API_ENDPOINTS.profile.changePassword, payload)),
};

export const customerOrderService = {
  getOrders: () => toPayload(api.get(API_ENDPOINTS.customer.orders)),
  getOrder: (orderId, config) =>
    toPayload(api.get(API_ENDPOINTS.customer.order(orderId), config)),
  cancelOrder: (orderId, payload = {}) =>
    toPayload(
      api.post(
        API_ENDPOINTS.customer.orderCancel(orderId),
        payload,
        SUPPRESS_GLOBAL_ERROR_CONFIG,
      ),
    ),
};

export const cartService = {
  getCarts: (config = {}) => toPayload(api.get(API_ENDPOINTS.cart.list, config)),
  createCart: (payload) => toPayload(api.post(API_ENDPOINTS.cart.create, payload)),
  addItem: (payload) => toPayload(api.post(API_ENDPOINTS.cart.items, payload)),
  updateItem: (cartItemId, payload) =>
    toPayload(api.put(API_ENDPOINTS.cart.item(cartItemId), payload)),
  removeItem: (cartItemId) =>
    toPayload(api.delete(API_ENDPOINTS.cart.item(cartItemId))),
};

export const orderService = orderApi;

export const paymentService = {
  createPayment: (payload) =>
    toPayload(api.post(API_ENDPOINTS.payments.create, payload)),
  createVnpayPayment: async (payload) => {
    if (!getToken()) {
      throw new Error("Vui lòng đăng nhập trước khi thanh toán VNPAY.");
    }

    const vnpayPayload = normalizeVnpayPaymentPayload(payload);

    if (import.meta.env.DEV) {
      console.debug("VNPAY payload:", vnpayPayload);
    }

    const response = await api.post(API_ENDPOINTS.payments.vnpayCreate, vnpayPayload);
    const responsePayload = unwrapResponse(response);

    if (import.meta.env.DEV) {
      console.debug("VNPAY response:", responsePayload);
    }

    return responsePayload;
  },
  verifyVnpayReturn: (queryString = "", config = {}) =>
    api.get(`${API_ENDPOINTS.payments.vnpayReturn}${String(queryString || "")}`, config),
  getPayments: () => toPayload(api.get(API_ENDPOINTS.payments.list)),
};

export const adminService = {
  getProducts: (params, config = {}) =>
    toBody(api.get(API_ENDPOINTS.admin.products, { ...config, params })),
  getProduct: (productId) =>
    toPayload(api.get(API_ENDPOINTS.admin.product(productId))),
  getBanners: (config = {}) => toPayload(api.get(API_ENDPOINTS.admin.banners, config)),
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
  getCategories: (config = {}) => toPayload(api.get(API_ENDPOINTS.admin.categories, config)),
  createCategory: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.categories, payload)),
  updateCategory: (categoryId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.category(categoryId), payload)),
  deleteCategory: (categoryId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.category(categoryId))),
  getBrands: (params) => getAllAdminBrands(params),
  getRoles: (config = {}) => toPayload(api.get(API_ENDPOINTS.admin.roles, config)),
  getUsers: () => toPayload(api.get(API_ENDPOINTS.admin.users)),
  updateUser: (userId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.user(userId), payload)),
  getStaff: (params, config = {}) => toBody(api.get(API_ENDPOINTS.admin.staff, { ...config, params })),
  createStaff: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.staff, payload)),
  updateStaff: (staffId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.staffMember(staffId), payload)),
  updateStaffStatus: (staffId, payload) =>
    toPayload(api.patch(API_ENDPOINTS.admin.staffStatus(staffId), payload)),
  deleteStaff: (staffId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.staffMember(staffId))),
  getCustomers: (params, config = {}) =>
    toBody(api.get(API_ENDPOINTS.admin.customers, { ...config, params })),
  getCustomer: (customerId) =>
    toPayload(api.get(API_ENDPOINTS.admin.customer(customerId))),
  updateCustomerStatus: (customerId, payload) =>
    toPayload(api.patch(API_ENDPOINTS.admin.customerStatus(customerId), payload)),
  lockCustomer: (customerId) =>
    toPayload(api.patch(API_ENDPOINTS.admin.customerStatus(customerId), { status: "blocked" })),
  unlockCustomer: (customerId) =>
    toPayload(api.patch(API_ENDPOINTS.admin.customerStatus(customerId), { status: "active" })),
  deleteCustomer: (customerId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.customer(customerId))),
  createProduct: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.products, payload)),
  updateProduct: (productId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.product(productId), payload)),
  deleteProduct: (productId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.product(productId))),
  getInventory: (config = {}) => toPayload(api.get(API_ENDPOINTS.admin.inventory, config)),
  createInventory: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.inventory, payload)),
  updateInventory: (inventoryId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.inventoryItem(inventoryId), payload)),
  getOrders: (config = {}) => toPayload(api.get(API_ENDPOINTS.admin.orders, config)),
  getOrder: (orderId, config) =>
    toPayload(api.get(API_ENDPOINTS.admin.order(orderId), config)),
  assignOrder: (orderId, payload = {}) =>
    withEndpointFallback(
      () =>
        toPayload(
          api.patch(
            API_ENDPOINTS.admin.orderAssign(orderId),
            payload,
            SUPPRESS_GLOBAL_ERROR_CONFIG,
          ),
        ),
      () =>
        toPayload(
          api.patch(
            API_ENDPOINTS.admin.orderStatus(orderId),
            {
              ...payload,
              status: "processing",
            },
            SUPPRESS_GLOBAL_ERROR_CONFIG,
          ),
        ),
    ),
  cancelOrder: (orderId, payload = {}) =>
    withEndpointFallback(
      () =>
        toPayload(
          api.patch(
            API_ENDPOINTS.admin.orderCancel(orderId),
            payload,
            SUPPRESS_GLOBAL_ERROR_CONFIG,
          ),
        ),
      () =>
        toPayload(
          api.patch(
            API_ENDPOINTS.admin.orderStatus(orderId),
            {
              ...payload,
              status: "cancelled",
            },
            SUPPRESS_GLOBAL_ERROR_CONFIG,
          ),
        ),
    ),
  updateRefundStatus: (orderId, payload = {}) =>
    withEndpointFallback(
      () =>
        toPayload(
          api.patch(
            API_ENDPOINTS.admin.orderRefund(orderId),
            payload,
            SUPPRESS_GLOBAL_ERROR_CONFIG,
          ),
        ),
      () =>
        toPayload(
          api.patch(
            API_ENDPOINTS.admin.orderStatus(orderId),
            {
              ...payload,
              status: payload.status || payload.refund_status || "refunding",
            },
            SUPPRESS_GLOBAL_ERROR_CONFIG,
          ),
        ),
    ),
  updateOrderStatus: (orderId, payload) =>
    toPayload(api.patch(API_ENDPOINTS.admin.orderStatus(orderId), payload)),
  updateOrder: (orderId, payload) =>
    toPayload(api.patch(API_ENDPOINTS.admin.orderStatus(orderId), payload)),
};
