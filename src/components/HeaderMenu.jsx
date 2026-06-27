import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import BrandCard from "./BrandCard";
import { isCatalogFilterActive } from "../utils/catalogLinks";
import DropdownMenu from "./DropdownMenu";

const POLICY_LINKS = [
  {
    label: "Chính sách bảo hành",
    path: "/warranty-policy",
  },
  {
    label: "Chính sách đổi trả",
    path: "/return-policy",
  },
  {
    label: "Chính sách giao hàng",
    path: "/shipping-policy",
  },
  {
    label: "Phương thức thanh toán",
    path: "/payment-methods",
  },
  {
    label: "Điều khoản sử dụng",
    path: "/terms-of-use",
  },
];

function isCatalogOptionActive(option, value) {
  return isCatalogFilterActive(option, value);
}

function readCatalogFiltersFromPath(pathname = "") {
  const segments = pathname.split("/").filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const filters = {
    brand: "",
    category: "",
  };

  if (segments[0] !== "products") {
    return filters;
  }

  if (segments[1] === "category") {
    filters.category = segments[2] || "";

    if (segments[3] === "brand") {
      filters.brand = segments[4] || "";
    }
  } else if (segments[1] === "brand") {
    filters.brand = segments[2] || "";
  }

  return filters;
}

function NavLink({ active = false, children, onNavigate, to }) {
  return (
    <Link
      className={`nav-link header-menu-link${active ? " active" : ""}`}
      onClick={onNavigate}
      to={to}
    >
      {children}
    </Link>
  );
}

function CategoryMegaMenu({
  active = false,
  emptyLabel = "Chưa có danh mục",
  items = [],
  label,
  onNavigate,
}) {
  const [open, setOpen] = useState(false);
  const [hoveredKey, setHoveredKey] = useState("");
  const selectedItem =
    items.find((item) => String(item.key) === String(hoveredKey)) ||
    items.find((item) => item.active) ||
    items[0];
  const selectedBrands = selectedItem?.brands || [];

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div
      className={`header-dropdown category-mega-dropdown${open ? " is-open" : ""}`}
    >
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className={`nav-link header-dropdown-trigger${active ? " active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="header-dropdown-caret">
          ▼
        </span>
      </button>

      <div className="category-mega-panel" role="menu">
        <div className="category-mega-list">
          {items.length ? (
            items.map((item) => (
              <Link
                className={`category-mega-category${
                  selectedItem?.key === item.key ? " active" : ""
                }`}
                key={item.key || item.to || item.label}
                onClick={handleNavigate}
                onFocus={() => setHoveredKey(String(item.key))}
                onMouseEnter={() => setHoveredKey(String(item.key))}
                role="menuitem"
                to={item.to}
              >
                <span>{item.label}</span>
                <span aria-hidden="true">›</span>
              </Link>
            ))
          ) : (
            <span className="header-dropdown-empty">{emptyLabel}</span>
          )}
        </div>

        <div className="category-mega-brands">
          {selectedItem ? (
            <div className="category-mega-heading">
              <span>Thương hiệu</span>
              <strong>{selectedItem.label}</strong>
            </div>
          ) : null}
          {selectedBrands.length ? (
            <div className="category-mega-brand-grid">
              {selectedBrands.map((brand) => (
                <BrandCard
                  brand={brand}
                  className={`header-brand-card${brand.active ? " active" : ""}`}
                  key={brand.key || brand.to || brand.label}
                  onClick={handleNavigate}
                  to={brand.to}
                />
              ))}
            </div>
          ) : (
            <span className="header-dropdown-empty">
              Chưa có thương hiệu trong danh mục này
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HeaderMenu({
  brandsByCategory = {},
  categories = [],
  onNavigate,
  open = false,
}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const pathFilters = readCatalogFiltersFromPath(location.pathname);
  const currentCategory =
    pathFilters.category || params.get("category") || params.get("category_id") || "";
  const currentBrand = pathFilters.brand || params.get("brand") || "";
  const policyPaths = POLICY_LINKS.map((item) => item.path);
  const isProductsRoute = location.pathname.startsWith("/products");

  const categoryItems = categories.map((category) => ({
    active: isCatalogOptionActive(category, currentCategory),
    brands: (brandsByCategory[category.key] || []).map((brand) => ({
      ...brand,
      active: isCatalogOptionActive(brand, currentBrand),
      key: brand.id ?? brand.slug ?? brand.label,
      name: brand.label,
      to: brand.href,
      type: "brand",
    })),
    key: category.key ?? category.id ?? category.slug ?? category.label,
    label: category.label,
    to: category.href,
  }));
  const policyItems = POLICY_LINKS.map((item) => ({
    active: location.pathname === item.path,
    key: item.path,
    label: item.label,
    to: item.path,
  }));

  return (
    <div className={`header-menu-bar${open ? " is-open" : ""}`}>
      <nav aria-label="Điều hướng chính" className="header-menu-list">
        <CategoryMegaMenu
          active={Boolean(currentCategory)}
          emptyLabel="Chưa có danh mục"
          items={categoryItems}
          label="Danh mục"
          onNavigate={onNavigate}
        />
        <NavLink
          active={isProductsRoute && !currentCategory && !currentBrand}
          onNavigate={onNavigate}
          to="/products"
        >
          Sản phẩm
        </NavLink>
        <NavLink active={location.pathname === "/sale"} onNavigate={onNavigate} to="/sale">
          Khuyến mãi 🔥
        </NavLink>
        <NavLink
          active={location.pathname === "/new-products"}
          onNavigate={onNavigate}
          to="/new-products"
        >
          Hàng mới
        </NavLink>
        <DropdownMenu
          active={policyPaths.includes(location.pathname)}
          items={policyItems}
          label="Chính sách"
          onNavigate={onNavigate}
        />
        <NavLink active={location.pathname === "/contact"} onNavigate={onNavigate} to="/contact">
          Liên hệ
        </NavLink>
      </nav>
    </div>
  );
}
