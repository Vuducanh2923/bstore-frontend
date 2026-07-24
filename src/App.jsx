import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { FORBIDDEN_EVENT, UNAUTHORIZED_EVENT } from "./services/api";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import AccountPage from "./pages/Account/AccountPage";
import OrderDetailPage from "./pages/Account/OrderDetailPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPasswordPage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import VerifyEmailPage from "./pages/Auth/VerifyEmailPage";
import CartPage from "./pages/Cart/CartPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import ContactPage from "./pages/Contact/ContactPage";
import HomePage from "./pages/Home/HomePage";
import NewsPage from "./pages/News/NewsPage";
import VnpayReturnPage from "./pages/Payment/VnpayReturnPage";
import PolicyPage from "./pages/Policy/PolicyPage";
import ProductDetailPage from "./pages/ProductDetail/ProductDetailPage";
import ProductsPage from "./pages/Products/ProductsPage";
import { USER_ROLES } from "./utils/formatters";

const AdminDashboardPage = lazy(() => import("./pages/Admin/AdminDashboardPage"));
const BrandPage = lazy(() => import("./pages/Admin/Brands/BrandPage"));
const CustomerDetailPage = lazy(() => import("./pages/Admin/Customers/CustomerDetailPage"));
const CustomerListPage = lazy(() => import("./pages/Admin/Customers/CustomerListPage"));
const OrderListPage = lazy(() => import("./pages/Admin/Orders/OrderListPage"));
const StaffListPage = lazy(() => import("./pages/Admin/Staff/StaffListPage"));
const WarrantyRequestsPage = lazy(() => import("./pages/Account/WarrantyRequestsPage"));
const WarrantyRequestDetailPage = lazy(() => import("./pages/Account/WarrantyRequestDetailPage"));
const CreateWarrantyRequestPage = lazy(() => import("./pages/Account/CreateWarrantyRequestPage"));
const WarrantyManagementPage = lazy(() => import("./pages/Admin/Warranty/WarrantyManagementPage"));
const WarrantyDetailPage = lazy(() => import("./pages/Admin/Warranty/WarrantyDetailPage"));

function RouteFallback() {
  return <main className="page-loading" aria-busy="true">Äang táº£i...</main>;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60_000,
    },
  },
});

function ForbiddenPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span>403</span>
        <h1>Bạn không có quyền truy cập</h1>
        <p>Tài khoản hiện tại không đủ quyền để mở khu vực này.</p>
        <Link className="primary-button" to="/">
          Về trang chủ
        </Link>
      </section>
    </main>
  );
}

function ApiNavigationEvents() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      if (location.pathname !== "/login") {
        navigate("/login", {
          replace: true,
          state: { from: location },
        });
      }
    };
    const handleForbidden = () => {
      if (location.pathname !== "/403") {
        navigate("/403", { replace: true });
      }
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    window.addEventListener(FORBIDDEN_EVENT, handleForbidden);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
      window.removeEventListener(FORBIDDEN_EVENT, handleForbidden);
    };
  }, [location, navigate]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <ApiNavigationEvents />
            <CartProvider>
              <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route element={<UserLayout />}>
                <Route index element={<HomePage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="products/category/:categorySlug" element={<ProductsPage />} />
                <Route path="products/category/:categorySlug/brand/:brandSlug" element={<ProductsPage />} />
                <Route path="products/brand/:brandSlug" element={<ProductsPage />} />
                <Route path="sale" element={<ProductsPage saleOnly />} />
                <Route path="new-products" element={<ProductsPage newOnly />} />
                <Route path="news" element={<NewsPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="warranty-policy" element={<PolicyPage type="warranty" />} />
                <Route path="return-policy" element={<PolicyPage type="return" />} />
                <Route path="shipping-policy" element={<PolicyPage type="shipping" />} />
                <Route path="payment-methods" element={<PolicyPage type="payment" />} />
                <Route path="terms-of-use" element={<PolicyPage type="terms" />} />
                <Route path="products/:slug" element={<ProductDetailPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="403" element={<ForbiddenPage />} />
                <Route
                  path="cart"
                  element={
                    <ProtectedRoute roles={[USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]}>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="checkout"
                  element={
                    <ProtectedRoute roles={[USER_ROLES.CUSTOMER]}>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="payment/vnpay-return"
                  element={
                    <ProtectedRoute roles={[USER_ROLES.CUSTOMER]}>
                      <VnpayReturnPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="account"
                  element={
                    <ProtectedRoute roles={[USER_ROLES.CUSTOMER]}>
                      <AccountPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="account/orders/:orderId"
                  element={
                    <ProtectedRoute roles={[USER_ROLES.CUSTOMER]}>
                      <OrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="account/warranty-requests" element={
                  <ProtectedRoute roles={[USER_ROLES.CUSTOMER]}><WarrantyRequestsPage /></ProtectedRoute>
                } />
                <Route path="account/warranty-requests/create" element={
                  <ProtectedRoute roles={[USER_ROLES.CUSTOMER]}><CreateWarrantyRequestPage /></ProtectedRoute>
                } />
                <Route path="account/warranty-requests/:id" element={
                  <ProtectedRoute roles={[USER_ROLES.CUSTOMER]}><WarrantyRequestDetailPage /></ProtectedRoute>
                } />
              </Route>
              <Route
                element={
                  <ProtectedRoute roles={[USER_ROLES.ADMIN, USER_ROLES.STAFF]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
                path="admin"
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="products" element={<AdminDashboardPage page="products" />} />
                <Route path="banners" element={<AdminDashboardPage page="banners" />} />
                <Route path="categories" element={<AdminDashboardPage page="categories" />} />
                <Route path="inventory" element={<AdminDashboardPage page="inventory" />} />
                <Route path="settings" element={<AdminDashboardPage page="settings" />} />
                <Route path="brands" element={<BrandPage />} />
                <Route path="customers" element={<CustomerListPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="orders" element={<OrderListPage />} />
                <Route path="warranty-requests" element={<WarrantyManagementPage />} />
                <Route path="warranty-requests/:id" element={<WarrantyDetailPage />} />
                <Route
                  path="staff"
                  element={
                    <ProtectedRoute roles={[USER_ROLES.ADMIN]}>
                      <StaffListPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate replace to="/" />} />
              </Routes>
              </Suspense>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
