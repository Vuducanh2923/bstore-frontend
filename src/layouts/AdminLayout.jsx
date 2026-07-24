import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRole, USER_ROLES } from "../utils/formatters";

const navItems = [
  { icon: "D", label: "Dashboard", tab: "dashboard", to: "/admin" },
  { icon: "P", label: "Products", match: "/admin/products", to: "/admin/products" },
  { icon: "B", label: "Banners", match: "/admin/banners", to: "/admin/banners" },
  { icon: "C", label: "Categories", match: "/admin/categories", to: "/admin/categories" },
  { icon: "T", label: "Brands", match: "/admin/brands", to: "/admin/brands" },
  { icon: "O", label: "Orders", match: "/admin/orders", to: "/admin/orders" },
  { icon: "W", label: "Warranty", match: "/admin/warranty-requests", to: "/admin/warranty-requests" },
  { icon: "I", label: "Inventory", match: "/admin/inventory", to: "/admin/inventory" },
  { icon: "G", label: "Settings", match: "/admin/settings", to: "/admin/settings" },
];

const userNavItems = [
  {
    icon: "S",
    label: "Staff",
    match: "/admin/staff",
    roles: [USER_ROLES.ADMIN],
    to: "/admin/staff",
  },
  {
    icon: "C",
    label: "Customers",
    match: "/admin/customers",
    roles: [USER_ROLES.ADMIN, USER_ROLES.STAFF],
    to: "/admin/customers",
  },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "dashboard";
  const currentRole = getRole(user);
  const visibleNavItems = [USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(currentRole)
    ? navItems
    : [];
  const visibleUserNavItems = userNavItems.filter((item) =>
    item.roles.includes(currentRole),
  );
  const isNavItemActive = (item) =>
    item.match
      ? location.pathname.startsWith(item.match)
      : location.pathname === "/admin" && activeTab === item.tab;
  const adminName = user?.full_name || user?.name || user?.email || "Admin";
  const roleLabel = currentRole === USER_ROLES.ADMIN ? "System Admin" : "Staff";
  const today = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    weekday: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>BStore Admin</strong>
          <span>Enterprise Control</span>
        </div>
        <nav className="admin-nav">
          {visibleNavItems.map((item) => (
            <Link
              className={isNavItemActive(item) ? "active" : ""}
              key={item.tab || item.match}
              to={item.to}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {visibleUserNavItems.length ? (
            <div className="admin-nav-group">
              <span className="admin-nav-group-title">Users</span>
              {visibleUserNavItems.map((item) => (
                <Link
                  className={isNavItemActive(item) ? "active admin-nav-subitem" : "admin-nav-subitem"}
                  key={item.match || item.tab}
                  to={item.to}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </nav>
        <div className="admin-profile-card">
          <div className="admin-avatar">{adminName.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{adminName}</strong>
            <span>{roleLabel}</span>
          </div>
          <button onClick={logout} type="button">
            Log out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar admin-welcome-header">
          <div>
            <strong>Xin chào, {adminName}</strong>
            <span>Hôm nay là {today}</span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
