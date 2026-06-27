import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import BrandPage from "./pages/Admin/Brands/BrandPage";
import AdminDashboardPage from "./pages/Admin/AdminDashboardPage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import CartPage from "./pages/Cart/CartPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import ContactPage from "./pages/Contact/ContactPage";
import HomePage from "./pages/Home/HomePage";
import NewsPage from "./pages/News/NewsPage";
import PolicyPage from "./pages/Policy/PolicyPage";
import ProductDetailPage from "./pages/ProductDetail/ProductDetailPage";
import ProductsPage from "./pages/Products/ProductsPage";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
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
                <Route
                  path="cart"
                  element={
                    <ProtectedRoute roles={["customer", "admin"]}>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="checkout"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
                path="admin"
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="brands" element={<BrandPage />} />
              </Route>
              <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
