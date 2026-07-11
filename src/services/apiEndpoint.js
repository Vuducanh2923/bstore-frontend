export const API_ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
    verifyRegisterOtp: "/auth/verify-register-otp",
    resendRegisterOtp: "/auth/resend-register-otp",
    forgotPassword: "/auth/forgot-password",
    verifyForgotPasswordOtp: "/auth/verify-forgot-password-otp",
    resetPassword: "/auth/reset-password",
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
  profile: {
    detail: "/profile",
    addresses: "/profile/addresses",
    address: (addressId) => `/profile/addresses/${encodeURIComponent(addressId)}`,
    defaultAddress: (addressId) =>
      `/profile/addresses/${encodeURIComponent(addressId)}/default`,
    changePassword: "/profile/change-password",
  },
  customer: {
    orders: "/customer/orders",
    order: (orderId) => `/customer/orders/${encodeURIComponent(orderId)}`,
    orderCancel: (orderId) =>
      `/customer/orders/${encodeURIComponent(orderId)}/cancel`,
  },
  cart: {
    list: "/carts",
    create: "/carts",
    items: "/cart-items",
    item: (cartItemId) => `/cart-items/${encodeURIComponent(cartItemId)}`,
  },
  orders: {
    create: "/orders",
    list: "/orders",
    detail: (orderId) => `/orders/${encodeURIComponent(orderId)}`,
    status: (orderId) => `/orders/${encodeURIComponent(orderId)}/status`,
  },
  payments: {
    list: "/payments",
    create: "/payments",
    vnpayCreate: "/payments/vnpay/create",
    vnpayReturn: "/payments/vnpay/return",
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
    staff: "/admin/staff",
    staffMember: (staffId) => `/admin/staff/${encodeURIComponent(staffId)}`,
    staffStatus: (staffId) =>
      `/admin/staff/${encodeURIComponent(staffId)}/status`,
    customers: "/admin/customers",
    customer: (customerId) => `/admin/customers/${encodeURIComponent(customerId)}`,
    customerStatus: (customerId) =>
      `/admin/customers/${encodeURIComponent(customerId)}/status`,
    inventory: "/inventories",
    inventoryItem: (inventoryId) =>
      `/inventories/${encodeURIComponent(inventoryId)}`,
    orders: "/admin/orders",
    order: (orderId) => `/admin/orders/${encodeURIComponent(orderId)}`,
    orderAssign: (orderId) =>
      `/admin/orders/${encodeURIComponent(orderId)}/assign`,
    orderCancel: (orderId) =>
      `/admin/orders/${encodeURIComponent(orderId)}/cancel`,
    orderRefund: (orderId) =>
      `/admin/orders/${encodeURIComponent(orderId)}/refund`,
    orderStatus: (orderId) =>
      `/admin/orders/${encodeURIComponent(orderId)}/status`,
  },
};
