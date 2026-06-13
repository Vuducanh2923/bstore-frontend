import api, { unwrapResponse } from "./api";
import { API_ENDPOINTS } from "./apiEndpoint";

const toPayload = (request) => request.then(unwrapResponse);

export const authService = {
  register: (payload) =>
    toPayload(api.post(API_ENDPOINTS.auth.register, payload)),
  login: (payload) => toPayload(api.post(API_ENDPOINTS.auth.login, payload)),
  me: () => toPayload(api.get(API_ENDPOINTS.auth.me)),
};

export const productService = {
  getProducts: (params) =>
    toPayload(api.get(API_ENDPOINTS.products.list, { params })),
  getProduct: (id) => toPayload(api.get(API_ENDPOINTS.products.detail(id))),
  getCategories: () => toPayload(api.get(API_ENDPOINTS.categories.list)),
};

export const uploadService = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);

    return toPayload(
      api.post(API_ENDPOINTS.uploads.image, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
    );
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
  getProducts: () => toPayload(api.get(API_ENDPOINTS.admin.products)),
  getCategories: () => toPayload(api.get(API_ENDPOINTS.admin.categories)),
  getBrands: () => toPayload(api.get(API_ENDPOINTS.admin.brands)),
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
  updateInventory: (inventoryId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.inventoryItem(inventoryId), payload)),
  getOrders: () => toPayload(api.get(API_ENDPOINTS.admin.orders)),
  updateOrder: (orderId, payload) =>
    toPayload(api.put(API_ENDPOINTS.admin.order(orderId), payload)),
};
