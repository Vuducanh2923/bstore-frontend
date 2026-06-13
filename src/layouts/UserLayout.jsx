import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function UserLayout() {
  const { isAuthenticated, logout, role, user } = useAuth();
  const { totalQuantity } = useCart();
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const handleSearch = (event) => {
    event.preventDefault();
    const query = keyword.trim();
    navigate(query ? `/products?keyword=${encodeURIComponent(query)}` : "/products");
  };

  return (
    <div className="site-shell">
      <header className="store-header">
        <div className="container header-inner">
          <Link className="logo" to="/">
            BStore
          </Link>
          <nav className="main-nav">
            <NavLink to="/products">Categories</NavLink>
          </nav>
          <form className="search-box" onSubmit={handleSearch}>
            <span>⌕</span>
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search for electronics..."
              value={keyword}
            />
          </form>
          <Link aria-label="Giỏ hàng" className="header-icon" to="/cart">
            🛒
            {totalQuantity > 0 ? <span>{totalQuantity}</span> : null}
          </Link>
          {isAuthenticated ? (
            <div className="account-menu">
              <button aria-label="Tài khoản" type="button">
                ☻
              </button>
              <div className="account-popover">
                <strong>{user?.name || user?.fullName || user?.email || "BStore"}</strong>
                {role === "admin" ? <Link to="/admin">Admin</Link> : null}
                <button onClick={logout} type="button">
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <Link aria-label="Đăng nhập" className="header-icon" to="/login">
              ☺
            </Link>
          )}
        </div>
      </header>
      <Outlet />
      <footer className="store-footer">
        <div className="container footer-grid">
          <div>
            <strong>BStore</strong>
            <p>
              Your destination for premium electronics and cutting-edge
              technology.
            </p>
          </div>
          <div>
            <strong>Shop</strong>
            <Link to="/products">All Products</Link>
            <Link to="/products?sort=flash">Flash Sale</Link>
            <Link to="/products?sort=new">New Arrivals</Link>
          </div>
          <div>
            <strong>Support</strong>
            <span>Help Center</span>
            <span>Track Order</span>
            <span>Returns</span>
          </div>
          <div>
            <strong>Legal</strong>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact Us</span>
          </div>
        </div>
        <div className="container footer-bottom">
          © 2024 BStore E-commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
