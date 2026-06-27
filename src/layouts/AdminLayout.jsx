import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { icon: "▦", label: "Dashboard", tab: "dashboard", to: "/admin" },
  { icon: "▤", label: "Products", tab: "products", to: "/admin?tab=products" },
  { icon: "B", label: "Banners", tab: "banners", to: "/admin?tab=banners" },
  { icon: "C", label: "Categories", tab: "categories", to: "/admin?tab=categories" },
  { icon: "🏷", label: "Quản lý nhãn hàng", match: "/admin/brands", to: "/admin/brands" },
  { icon: "▱", label: "Orders", tab: "orders", to: "/admin?tab=orders" },
  { icon: "◉", label: "Users", tab: "users", to: "/admin?tab=users" },
  { icon: "⚙", label: "Settings", tab: "settings", to: "/admin?tab=settings" },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "dashboard";
  const isNavItemActive = (item) =>
    item.match
      ? location.pathname.startsWith(item.match)
      : location.pathname === "/admin" && activeTab === item.tab;
  const adminName = user?.full_name || user?.name || user?.email || "Admin";

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>BStore Admin</strong>
          <span>Enterprise Control</span>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              className={isNavItemActive(item) ? "active" : ""}
              key={item.tab || item.match}
              to={item.to}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-profile-card">
          <div className="admin-avatar">{adminName.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{adminName}</strong>
            <span>System Admin</span>
          </div>
          <button onClick={logout} type="button">
            Log out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <form className="admin-search">
            <span>⌕</span>
            <input placeholder="Search analytics, orders, or customers..." />
          </form>
          <div className="admin-topbar-actions">
            <button aria-label="Notifications" type="button">
              ♢
            </button>
            <button aria-label="Account" type="button">
              ◎
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
