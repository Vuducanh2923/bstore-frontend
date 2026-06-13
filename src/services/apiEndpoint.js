export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
  },
  products: {
    list: "/products",
    detail: (id) => `/products/${encodeURIComponent(id)}`,
  },
  categories: {
    list: "/categories",
  },
  uploads: {
    image: "/uploads/images",
  },
  cart: {
    list: "/carts",
    create: "/carts",
    detail: (cartId) => `/carts/${encodeURIComponent(cartId)}`,
    items: "/cart-items",
    item: (cartItemId) => `/cart-items/${encodeURIComponent(cartItemId)}`,
  },
  orders: {
    create: "/orders",
    list: "/orders",
    detail: (orderId) => `/orders/${encodeURIComponent(orderId)}`,
  },
  payments: {
    list: "/payments",
    create: "/payments",
  },
  admin: {
    products: "/products",
    product: (productId) => `/products/${encodeURIComponent(productId)}`,
    categories: "/categories",
    brands: "/brands",
    roles: "/roles",
    users: "/users",
    user: (userId) => `/users/${encodeURIComponent(userId)}`,
    inventory: "/inventories",
    inventoryItem: (inventoryId) =>
      `/inventories/${encodeURIComponent(inventoryId)}`,
    orders: "/orders",
    order: (orderId) => `/orders/${encodeURIComponent(orderId)}`,
  },
};
