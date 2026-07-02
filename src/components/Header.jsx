import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { readCollection } from "../services/api";
import { productService } from "../services/bstoreService";
import {
  buildProductsPath,
  getCatalogFilterValue,
  getCatalogLabel,
  getCatalogComparableValues,
  getCatalogSearchMatches,
  resolveCatalogSearchPath,
} from "../utils/catalogLinks";
import {
  getRole,
  normalizeProductSummary,
  resolveMediaUrl,
  slugify,
  USER_ROLES,
} from "../utils/formatters";
import HeaderMenu from "./HeaderMenu";

function Icon({ children }) {
  return (
    <svg
      aria-hidden="true"
      className="header-svg-icon"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Icon>
  );
}

function HeartIcon() {
  return (
    <Icon>
      <path d="M20.3 5.9a5 5 0 0 0-7.1 0L12 7.1l-1.2-1.2a5 5 0 0 0-7.1 7.1L12 21.3l8.3-8.3a5 5 0 0 0 0-7.1Z" />
    </Icon>
  );
}

function CartIcon() {
  return (
    <Icon>
      <path d="M3.5 4h2l2 11h9.8l2-7.3H7" />
      <path d="M9 20h.1M17 20h.1" />
    </Icon>
  );
}

function UserIcon() {
  return (
    <Icon>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}

function MenuIcon({ open }) {
  return (
    <Icon>
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </Icon>
  );
}

function normalizeCatalogOption(option = {}) {
  const label = option.name || option.label || option.title || option.brand_name || "";

  return {
    id: option.id ?? option.category_id ?? option.categoryId ?? option.brand_id ?? option.brandId,
    label,
    logo:
      option.logo_url ||
      option.logoUrl ||
      option.logo ||
      option.image_url ||
      option.imageUrl ||
      option.image ||
      "",
    slug: option.slug,
  };
}

function getCatalogHref(key, option) {
  const value = getCatalogFilterValue(option);

  if (!value) {
    return `/products?search=${encodeURIComponent(getCatalogLabel(option))}`;
  }

  return buildProductsPath({
    [key]: value,
  });
}

function getCategoryBrandHref(category, brand) {
  return buildProductsPath({
    brand: getCatalogFilterValue(brand),
    category: getCatalogFilterValue(category),
  });
}

function getProductDetailHref(product = {}) {
  const detailTarget = product.slug || product.name || product.id;

  return detailTarget
    ? `/products/${encodeURIComponent(detailTarget)}`
    : "/products";
}

function getSuggestionInitial(value = "", fallback = "BS") {
  return (
    String(value || fallback)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || fallback
  );
}

function normalizeProductBrand(product = {}) {
  const source = product.brand && typeof product.brand === "object"
    ? product.brand
    : product;
  const label =
    source.name ||
    source.label ||
    source.title ||
    source.brand_name ||
    product.brandName ||
    product.brand_name ||
    (typeof product.brand === "string" ? product.brand : "");

  return normalizeCatalogOption({
    ...source,
    brand_id:
      source.id ||
      product.brand_id ||
      product.brandId ||
      product.brand?.id ||
      product.brand?.brand_id,
    label,
    logo:
      source.logo ||
      source.logo_url ||
      source.logoUrl ||
      product.brand_logo ||
      product.brandLogo ||
      product.brand_logo_url ||
      product.brandLogoUrl ||
      product.brand?.logo ||
      product.brand?.logo_url,
    slug:
      source.slug ||
      product.brand_slug ||
      product.brandSlug ||
      product.brand?.slug ||
      (label ? slugify(label) : ""),
  });
}

function mergeBrandOption(brand, publicBrands = []) {
  const brandValue = String(getCatalogFilterValue(brand) || "");
  const match = publicBrands.find((candidate) => {
    const candidateValues = getCatalogComparableValues(candidate);

    return candidateValues.includes(brandValue);
  });

  return {
    ...brand,
    id: brand.id ?? match?.id,
    label: brand.label || match?.label,
    logo: brand.logo || match?.logo,
    slug: brand.slug || match?.slug || (brand.label ? slugify(brand.label) : ""),
  };
}

async function loadCategoryBrands(categories, publicBrands) {
  const entries = await Promise.allSettled(
    categories.map(async (category) => {
      const categoryFilterValue = getCatalogFilterValue(category);

      if (!categoryFilterValue) {
        return [category.key, []];
      }

      const payload = await productService.getProducts({
        category: categoryFilterValue,
        limit: 80,
        page: 1,
      });
      const products = readCollection(payload, ["products"]);
      const brandsByKey = new Map();

      products.forEach((product) => {
        const brand = mergeBrandOption(normalizeProductBrand(product), publicBrands);
        const brandValue = getCatalogFilterValue(brand);

        if (!brand.label || !brandValue || brandsByKey.has(String(brandValue))) {
          return;
        }

        brandsByKey.set(String(brandValue), {
          ...brand,
          href: getCategoryBrandHref(category, brand),
        });
      });

      return [category.key, Array.from(brandsByKey.values())];
    }),
  );

  return entries.reduce((acc, result) => {
    if (result.status === "fulfilled") {
      const [key, value] = result.value;
      acc[key] = value;
    }

    return acc;
  }, {});
}

function getUserName(user = {}) {
  return user?.full_name || user?.name || user?.fullName || user?.email || "BStore";
}

function getUserInitials(value) {
  return String(value || "BS")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getUserAvatar(user = {}) {
  return user?.avatar || user?.avatarUrl || user?.avatar_url || user?.image || "";
}

function AccountAvatar({ user }) {
  const name = getUserName(user);
  const avatar = getUserAvatar(user);

  if (avatar) {
    return <img alt={name} src={avatar} />;
  }

  return <span>{getUserInitials(name)}</span>;
}

export default function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const currentRole = getRole(user);
  const backOfficeHref = [USER_ROLES.ADMIN, USER_ROLES.STAFF].includes(currentRole) ? "/admin" : "";
  const { totalQuantity } = useCart();
  const [brandsByCategory, setBrandsByCategory] = useState({});
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [mobileMenu, setMobileMenu] = useState({ locationKey: "", open: false });
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchProducts, setSearchProducts] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const locationKey = `${location.pathname}?${location.search}`;
  const mobileOpen = mobileMenu.open && mobileMenu.locationKey === locationKey;
  const trimmedKeyword = keyword.trim();

  useEffect(() => {
    let mounted = true;

    async function loadHeaderData() {
      const [categoryResult, brandResult] = await Promise.allSettled([
        productService.getCategories(),
        productService.getBrands(),
      ]);

      if (!mounted) {
        return;
      }

      let nextCategories = [];
      let nextBrands = [];

      if (categoryResult.status === "fulfilled") {
        nextCategories = readCollection(categoryResult.value, ["categories"])
          .map(normalizeCatalogOption)
          .filter((category) => category.label)
          .map((category) => ({
            ...category,
            href: getCatalogHref("category", category),
            key: String(getCatalogFilterValue(category)),
          }));

        setCategories(nextCategories);
      } else {
        setCategories([]);
      }

      if (brandResult.status === "fulfilled") {
        nextBrands = readCollection(brandResult.value, ["brands"])
          .map(normalizeCatalogOption)
          .filter((brand) => brand.label)
          .map((brand) => ({
            ...brand,
            href: getCatalogHref("brand", brand),
          }));
      }

      setBrands(nextBrands);

      if (nextCategories.length) {
        const nextBrandsByCategory = await loadCategoryBrands(
          nextCategories,
          nextBrands,
        );

        if (mounted) {
          setBrandsByCategory(nextBrandsByCategory);
        }
      } else {
        setBrandsByCategory({});
      }
    }

    loadHeaderData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (trimmedKeyword.length < 2) {
      return undefined;
    }

    let ignored = false;
    const timerId = window.setTimeout(async () => {
      setSearchLoading(true);

      try {
        const payload = await productService.getProducts({
          limit: 5,
          page: 1,
          search: trimmedKeyword,
        });
        const nextProducts = readCollection(payload, ["products"])
          .map(normalizeProductSummary)
          .filter((product) => product.name)
          .slice(0, 5);

        if (!ignored) {
          setSearchProducts(nextProducts);
        }
      } catch {
        if (!ignored) {
          setSearchProducts([]);
        }
      } finally {
        if (!ignored) {
          setSearchLoading(false);
        }
      }
    }, 240);

    return () => {
      ignored = true;
      window.clearTimeout(timerId);
    };
  }, [trimmedKeyword]);

  const categorySearchSuggestions = useMemo(
    () =>
      getCatalogSearchMatches(categories, trimmedKeyword, 4).map((category) => ({
        href: getCatalogHref("category", category),
        key: `category-${getCatalogFilterValue(category)}`,
        subtitle: "Danh mục sản phẩm",
        title: getCatalogLabel(category),
        type: "category",
        typeLabel: "Danh mục",
      })),
    [categories, trimmedKeyword],
  );
  const brandSearchSuggestions = useMemo(
    () =>
      getCatalogSearchMatches(brands, trimmedKeyword, 4).map((brand) => ({
        href: getCatalogHref("brand", brand),
        image: brand.logo,
        key: `brand-${getCatalogFilterValue(brand)}`,
        subtitle: "Thương hiệu",
        title: getCatalogLabel(brand),
        type: "brand",
        typeLabel: "Brand",
      })),
    [brands, trimmedKeyword],
  );
  const productSearchSuggestions = useMemo(
    () => {
      if (trimmedKeyword.length < 2) {
        return [];
      }

      return searchProducts.map((product) => ({
        href: getProductDetailHref(product),
        image: product.thumbnail,
        key: `product-${product.id || product.slug || product.name}`,
        subtitle: "Sản phẩm",
        title: product.name,
        type: "product",
        typeLabel: "Sản phẩm",
      }));
    },
    [searchProducts, trimmedKeyword],
  );
  const isSearchSuggestionLoading = trimmedKeyword.length >= 2 && searchLoading;
  const showSearchSuggestions = searchFocused && Boolean(trimmedKeyword);

  const cartLabel = useMemo(
    () => (totalQuantity > 0 ? `Giỏ hàng, ${totalQuantity} sản phẩm` : "Giỏ hàng"),
    [totalQuantity],
  );
  const closeMobileMenu = () => {
    setMobileMenu((current) => (current.open ? { ...current, open: false } : current));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = trimmedKeyword;
    closeMobileMenu();
    setSearchFocused(false);
    navigate(
      resolveCatalogSearchPath({
        brands,
        categories,
        query,
      }),
    );
  };

  const handleSearchBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setSearchFocused(false);
    }
  };

  const handleSuggestionMouseDown = (event) => {
    event.preventDefault();
  };

  const handleSuggestionNavigate = () => {
    closeMobileMenu();
    setSearchFocused(false);
  };

  const renderSuggestionGroup = (label, items) => {
    if (!items.length) {
      return null;
    }

    return (
      <div className="search-suggestion-section">
        <span className="search-suggestion-heading">{label}</span>
        {items.map((item) => (
          <Link
            className="search-suggestion-item"
            key={item.key}
            onClick={handleSuggestionNavigate}
            onMouseDown={handleSuggestionMouseDown}
            role="option"
            to={item.href}
          >
            <span
              className={`search-suggestion-media search-suggestion-media--${item.type}`}
            >
              {item.image ? (
                <img alt="" src={resolveMediaUrl(item.image)} />
              ) : (
                getSuggestionInitial(item.title, item.typeLabel.slice(0, 2))
              )}
            </span>
            <span className="search-suggestion-copy">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
            <span className="search-suggestion-type">{item.typeLabel}</span>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <header className={`store-header${mobileOpen ? " is-menu-open" : ""}`}>
      <div className="container header-main-row">
        <button
          aria-expanded={mobileOpen}
          aria-label="Mở menu"
          className="mobile-menu-toggle"
          onClick={() =>
            setMobileMenu({
              locationKey,
              open: !mobileOpen,
            })
          }
          type="button"
        >
          <MenuIcon open={mobileOpen} />
        </button>

        <Link className="logo" onClick={closeMobileMenu} to="/">
          BStore
        </Link>

        <HeaderMenu
          brandsByCategory={brandsByCategory}
          categories={categories}
          onNavigate={closeMobileMenu}
          open={mobileOpen}
        />

        <form
          autoComplete="off"
          className="search-box"
          onBlur={handleSearchBlur}
          onFocus={() => setSearchFocused(true)}
          onSubmit={handleSearch}
        >
          <button aria-label="Tìm kiếm" className="search-submit" type="submit">
            <SearchIcon />
          </button>
          <input
            name="search"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Bạn cần tìm gì hôm nay?"
            value={keyword}
          />
          {showSearchSuggestions ? (
            <div
              aria-label="Gợi ý tìm kiếm"
              className="search-suggestions"
              role="listbox"
            >
              {renderSuggestionGroup("Danh mục", categorySearchSuggestions)}
              {renderSuggestionGroup("Thương hiệu", brandSearchSuggestions)}
              {renderSuggestionGroup("Sản phẩm", productSearchSuggestions)}
              {isSearchSuggestionLoading ? (
                <span className="search-suggestion-state">Đang tìm sản phẩm...</span>
              ) : null}
              <button
                className="search-suggestion-item search-suggestion-submit"
                onMouseDown={handleSuggestionMouseDown}
                type="submit"
              >
                <span className="search-suggestion-media search-suggestion-media--search">
                  <SearchIcon />
                </span>
                <span className="search-suggestion-copy">
                  <strong>Tìm sản phẩm chứa “{trimmedKeyword}”</strong>
                  <small>Tra trong toàn bộ cửa hàng</small>
                </span>
                <span className="search-suggestion-type">Search</span>
              </button>
            </div>
          ) : null}
        </form>

        <div className="header-actions">
          <Link
            aria-label="Wishlist"
            className="header-icon"
            onClick={closeMobileMenu}
            to="/products?wishlist=1"
          >
            <HeartIcon />
          </Link>
          <Link aria-label={cartLabel} className="header-icon" onClick={closeMobileMenu} to="/cart">
            <CartIcon />
            {totalQuantity > 0 ? <span>{totalQuantity}</span> : null}
          </Link>
          {isAuthenticated ? (
            <div className="account-menu">
              <button aria-label="Tài khoản" className="account-avatar" type="button">
                <AccountAvatar user={user} />
              </button>
              <div className="account-popover">
                <strong>{getUserName(user)}</strong>
                {currentRole === USER_ROLES.CUSTOMER ? (
                  <Link onClick={closeMobileMenu} to="/account">
                    Tài khoản
                  </Link>
                ) : null}
                {backOfficeHref ? (
                  <Link onClick={closeMobileMenu} to={backOfficeHref}>
                    Admin
                  </Link>
                ) : null}
                <button onClick={logout} type="button">
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <Link
              aria-label="Đăng nhập"
              className="account-avatar header-avatar-link"
              onClick={closeMobileMenu}
              to="/login"
            >
              <UserIcon />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
