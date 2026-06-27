export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
  },
  products: {
    list: "/products",
    sale: "/products/sale",
    detail: (slug) => `/products/${encodeURIComponent(slug)}`,
  },
  categories: {
    list: "/categories",
  },
  brands: {
    list: "/brands",
  },
  banners: {
    list: "/banners",
    detail: (bannerId) => `/banners/${encodeURIComponent(bannerId)}`,
  },
  home: {
    banners: "/banners/home",
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
    banners: "/banners",
    banner: (bannerId) => `/banners/${encodeURIComponent(bannerId)}`,
    categories: "/categories",
    category: (categoryId) => `/categories/${encodeURIComponent(categoryId)}`,
    brands: "/admin/brands",
    brand: (brandId) => `/admin/brands/${encodeURIComponent(brandId)}`,
    brandToggleStatus: (brandId) =>
      `/admin/brands/${encodeURIComponent(brandId)}/toggle-status`,
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
