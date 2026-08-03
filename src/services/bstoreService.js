import api, { getToken, normalizePaginatedResponse, unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";
import authApi from "./authApi";
import orderApi from "./orderApi";
import { cachedRequest, createRequestKey } from "../utils/requestCache";

const toPayload = (request) => request.then(unwrapResponse);
const toBody = (request) => request.then((response) => response.data);
const isFormDataPayload = (payload) =>
  typeof FormData !== "undefined" && payload instanceof FormData;
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

export const authService = authApi;

export const productService = {
  getProducts: (params = {}) => cachedRequest(
    createRequestKey("products", params),
    () => api.get(API_ENDPOINTS.products.list, { params })
      .then((response) => normalizePaginatedResponse(response, ["products"], params)),
    { ttl: 60_000 },
  ),
  getSaleProducts: (params = {}) => cachedRequest(
    createRequestKey("sale-products", params),
    () => api.get(API_ENDPOINTS.products.sale, { params })
      .then((response) => normalizePaginatedResponse(response, ["products"], params)),
    { ttl: 60_000 },
  ),
  getProduct: (slug) => cachedRequest(
    `product:${slug}`,
    () => toPayload(api.get(API_ENDPOINTS.products.detail(slug))),
    { ttl: 60_000 },
  ),
  getCategories: (params = {}) => cachedRequest(
    createRequestKey("catalog:categories", params),
    () => api.get(API_ENDPOINTS.categories.list, { params })
      .then((response) => normalizePaginatedResponse(response, ["categories"], params)),
  ),
  getBrands: (params = {}) => cachedRequest(
    createRequestKey("catalog:brands", params),
    () => api.get(API_ENDPOINTS.brands.list, { params })
      .then((response) => normalizePaginatedResponse(response, ["brands"], params)),
  ),
};

export const bannerService = {
  getBanners: () => toPayload(api.get(API_ENDPOINTS.banners.list)),
  getHomeBanners: () => cachedRequest(
    "banners:home",
    () => toPayload(api.get(API_ENDPOINTS.home.banners)),
    { ttl: 5 * 60_000 },
  ),
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
  getOrders: (params = {}, config = {}) =>
    api.get(API_ENDPOINTS.customer.orders, {
      ...config,
      params,
    }).then((response) => response.data),
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
  getCategories: (params = {}, config = {}) =>
    api.get(API_ENDPOINTS.admin.categories, { ...config, params })
      .then((response) => normalizePaginatedResponse(response, ["categories"], params)),
  createCategory: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.categories, payload)),
  updateCategory: (categoryId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.category(categoryId), payload)),
  deleteCategory: (categoryId) =>
    toPayload(api.delete(API_ENDPOINTS.admin.category(categoryId))),
  getBrands: (params = {}, config = {}) =>
    api.get(API_ENDPOINTS.admin.brands, { ...config, params })
      .then((response) => normalizePaginatedResponse(response, ["brands"], params)),
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
  getInventory: (params = {}, config = {}) =>
    api.get(API_ENDPOINTS.admin.inventory, { ...config, params })
      .then((response) => normalizePaginatedResponse(response, ["inventories", "inventory"], params)),
  createInventory: (payload) =>
    toPayload(api.post(API_ENDPOINTS.admin.inventory, payload)),
  updateInventory: (inventoryId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.inventoryItem(inventoryId), payload)),
  getOrders: (params = {}, config = {}) =>
    api.get(API_ENDPOINTS.admin.orders, { ...config, params })
      .then((response) => normalizePaginatedResponse(response, ["orders"], params)),
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
    toPayload(
      api.put(
        API_ENDPOINTS.admin.orderCancelApprove(orderId),
        { note: payload.note || payload.reason || payload.cancel_reason || "" },
        SUPPRESS_GLOBAL_ERROR_CONFIG,
      ),
    ),
  decideCancelRequest: (orderId, status, payload = {}) =>
    toPayload(
      api.put(
        status === "approved"
          ? API_ENDPOINTS.admin.orderCancelApprove(orderId)
          : API_ENDPOINTS.admin.orderCancelReject(orderId),
        payload,
        SUPPRESS_GLOBAL_ERROR_CONFIG,
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
  updateOrderPaymentStatus: (orderId, paymentStatus) =>
    toPayload(
      api.patch(
        API_ENDPOINTS.admin.orderPaymentStatus(orderId),
        { payment_status: paymentStatus },
        SUPPRESS_GLOBAL_ERROR_CONFIG,
      ),
    ),
  updateOrder: (orderId, payload) =>
    toPayload(api.patch(API_ENDPOINTS.admin.orderStatus(orderId), payload)),
};
