import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import AdminDashboardPage from "./pages/Admin/AdminDashboardPage";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import CartPage from "./pages/Cart/CartPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import HomePage from "./pages/Home/HomePage";
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
                <Route path="products/:idOrSlug" element={<ProductDetailPage />} />
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
