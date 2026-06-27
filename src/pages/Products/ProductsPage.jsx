import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import ProductCard, { ProductCardSkeleton } from "../../components/ProductCard";
import StatusMessage from "../../components/StatusMessage";
import { getApiErrorMessage, readCollection } from "../../services/api";
import { productService } from "../../services/bstoreService";
import { getProducts, getSaleProducts } from "../../services/productService";
import {
  buildProductsPath,
  findCatalogOptionByValue,
  getCatalogFilterValue,
  getCatalogLabel,
  isCatalogFilterActive,
  resolveCatalogSearchPath,
} from "../../utils/catalogLinks";
import {
  getProductSaleInfo,
  normalizeProductSummary,
  resolveMediaUrl,
} from "../../utils/formatters";

const PRODUCTS_PER_PAGE = 15;
const SEARCH_DEBOUNCE_MS = 300;

function decodePathValue(value = "") {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function readProductTimestamp(product = {}) {
  const rawDate =
    product.created_at ||
    product.createdAt ||
    product.created_date ||
    product.createdDate ||
    product.raw?.created_at ||
    product.raw?.createdAt;

  if (!rawDate) {
    return 0;
  }

  const timestamp = new Date(rawDate).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortNewestProducts(list) {
  return [...list].sort(
    (first, second) => readProductTimestamp(second) - readProductTimestamp(first),
  );
}

function hasDiscount(product = {}) {
  const discountPercent = readNumber(
    product.discount_percent,
    product.discountPercent,
    product.sale_percent,
    product.salePercent,
  );

  return (discountPercent !== null && discountPercent > 0) || getProductSaleInfo(product).isSale;
}

function getProductIdentity(product = {}, fallback = "") {
  return String(product.id || product.slug || product.name || fallback);
}

function uniqueProductList(list = []) {
  const seen = new Set();

  return list.filter((product, index) => {
    const key = getProductIdentity(product, index);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function unwrapProductPayload(payload) {
  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
}

function readPaginationMeta(payload, { page, limit, count }) {
  const meta = payload?.meta || payload?.pagination || payload?.page || {};
  const currentPage =
    readNumber(
      payload?.current_page,
      payload?.currentPage,
      payload?.number,
      meta.current_page,
      meta.currentPage,
      meta.number,
    ) ?? page;
  const pageSize =
    readNumber(
      payload?.per_page,
      payload?.perPage,
      payload?.limit,
      payload?.size,
      meta.per_page,
      meta.perPage,
      meta.limit,
      meta.size,
    ) ?? limit;
  const total = readNumber(
    payload?.total,
    payload?.total_items,
    payload?.totalItems,
    payload?.totalElements,
    meta.total,
    meta.total_items,
    meta.totalItems,
    meta.totalElements,
  );
  const lastPage =
    readNumber(
      payload?.last_page,
      payload?.lastPage,
      payload?.total_pages,
      payload?.totalPages,
      meta.last_page,
      meta.lastPage,
      meta.total_pages,
      meta.totalPages,
    ) ?? (total !== null ? Math.max(1, Math.ceil(total / pageSize)) : null);

  return {
    count,
    current_page: currentPage,
    last_page: lastPage,
    limit: pageSize,
    total,
  };
}

function getCategoryIconValue(category = {}) {
  return String(
    category.icon ||
      category.icon_url ||
      category.iconUrl ||
      category.category_icon ||
      "",
  ).trim();
}

function isCategoryImageIcon(icon) {
  return (
    /^(https?:)?\/\//i.test(icon) ||
    icon.startsWith("/") ||
    icon.startsWith("uploads/") ||
    /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(icon)
  );
}

function CategoryTabIcon({ icon }) {
  const value = getCategoryIconValue({ icon });

  if (!value) {
    return null;
  }

  if (isCategoryImageIcon(value)) {
    return (
      <img
        alt=""
        className="category-tab-icon category-tab-icon--image"
        loading="lazy"
        src={resolveMediaUrl(value)}
      />
    );
  }

  return (
    <span aria-hidden="true" className="category-tab-icon">
      {value}
    </span>
  );
}

export default function ProductsPage({ newOnly = false, saleOnly = false }) {
  const { brandSlug = "", categorySlug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || searchParams.get("keyword") || "";
  const queryCategory = searchParams.get("category") || searchParams.get("category_id") || "";
  const queryBrand = searchParams.get("brand") || "";
  const category = decodePathValue(categorySlug) || queryCategory;
  const brand = decodePathValue(brandSlug) || queryBrand;
  const sort = searchParams.get("sort") || "";
  const effectiveSort = newOnly ? "created_at_desc" : sort;
  const requestKey = `${saleOnly}\u0001${newOnly}\u0001${category}\u0001${brand}\u0001${initialSearch}\u0001${effectiveSort}`;
  const basePath = saleOnly ? "/sale" : newOnly ? "/new-products" : "/products";
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [paginationState, setPaginationState] = useState(() => ({
    page: 1,
    requestKey,
  }));
  const [meta, setMeta] = useState(null);
  const [searchDraft, setSearchDraft] = useState(() => ({
    query: initialSearch,
    value: initialSearch,
  }));
  const loadMoreRef = useRef(null);
  const searchInput =
    searchDraft.query === initialSearch ? searchDraft.value : initialSearch;
  const page =
    paginationState.requestKey === requestKey ? paginationState.page : 1;

  const categoryTabs = useMemo(
    () =>
      categories.filter(
        (nextCategory) => nextCategory?.id || nextCategory?.name || nextCategory?.label,
      ),
    [categories],
  );
  const activeCategory = findCatalogOptionByValue(categories, category);
  const activeBrand = findCatalogOptionByValue(brands, brand);
  const activeCategoryLabel = getCatalogLabel(activeCategory) || category;
  const activeBrandLabel = getCatalogLabel(activeBrand) || brand;
  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (category) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("page");
      chips.push({
        key: "category",
        label: `Danh mục: ${activeCategoryLabel}`,
        to: buildProductsPath({
          basePath,
          brand,
          searchParams: nextParams,
        }),
      });
    }

    if (brand) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("page");
      chips.push({
        key: "brand",
        label: `Thương hiệu: ${activeBrandLabel}`,
        to: buildProductsPath({
          basePath,
          category,
          searchParams: nextParams,
        }),
      });
    }

    if (initialSearch) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("keyword");
      nextParams.delete("page");
      nextParams.delete("search");
      chips.push({
        key: "search",
        label: `Từ khóa: ${initialSearch}`,
        to: buildProductsPath({
          basePath,
          brand,
          category,
          searchParams: nextParams,
        }),
      });
    }

    return chips;
  }, [
    activeBrandLabel,
    activeCategoryLabel,
    basePath,
    brand,
    category,
    initialSearch,
    searchParams,
  ]);

  const updateSearchParams = useCallback(
    (updater, options = {}) => {
      const nextParams = new URLSearchParams(searchParams);
      updater(nextParams);
      setSearchParams(nextParams, options);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    let mounted = true;

    async function loadCatalogFilters() {
      const [categoryResult, brandResult] = await Promise.allSettled([
        productService.getCategories(),
        productService.getBrands(),
      ]);

      if (!mounted) {
        return;
      }

      setCategories(
        categoryResult.status === "fulfilled"
          ? readCollection(categoryResult.value, ["categories"])
          : [],
      );
      setBrands(
        brandResult.status === "fulfilled"
          ? readCollection(brandResult.value, ["brands"])
          : [],
      );
    }

    loadCatalogFilters();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (saleOnly || newOnly) {
      return;
    }

    const hasLegacyQuery = location.pathname === "/products" && (queryCategory || queryBrand);
    const hasPrettyFilterPath =
      location.pathname.startsWith("/products/category/") ||
      location.pathname.startsWith("/products/brand/");

    if (!hasLegacyQuery && !hasPrettyFilterPath) {
      return;
    }

    if (category && categories.length === 0 && !hasLegacyQuery) {
      return;
    }

    const categoryOption = categories.length
      ? findCatalogOptionByValue(categories, category)
      : null;
    const nextCategory = category
      ? getCatalogFilterValue(categoryOption || { slug: category })
      : "";
    const nextPath = buildProductsPath({
      brand,
      category: nextCategory,
      searchParams,
    });
    const currentPath = `${location.pathname}${location.search}`;

    if (nextPath !== currentPath) {
      navigate(nextPath, { replace: true });
    }
  }, [
    categories,
    brand,
    category,
    location.pathname,
    location.search,
    navigate,
    newOnly,
    queryBrand,
    queryCategory,
    saleOnly,
    searchParams,
  ]);

  useEffect(() => {
    const nextSearch = searchInput.trim();

    if (nextSearch === initialSearch) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      updateSearchParams(
        (nextParams) => {
          if (nextSearch) {
            nextParams.set("search", nextSearch);
          } else {
            nextParams.delete("search");
          }

          nextParams.delete("keyword");
          nextParams.delete("page");
        },
        { replace: true },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [initialSearch, searchInput, updateSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const nextPage = page;
    const append = nextPage > 1;
    let mounted = true;

    async function loadProducts() {
      setLoading(!append);
      setLoadingMore(append);
      setError("");

      if (!append) {
        setProducts([]);
        setMeta(null);
      }

      try {
        const fetchProducts = saleOnly ? getSaleProducts : getProducts;
        const payload = await fetchProducts({
          page: nextPage,
          limit: PRODUCTS_PER_PAGE,
          category: category || undefined,
          brand: brand || undefined,
          search: initialSearch || undefined,
          sort: effectiveSort || undefined,
          order: newOnly ? "desc" : undefined,
          signal: controller.signal,
        });
        const productPayload = unwrapProductPayload(payload);
        const rawList = readCollection(productPayload, ["products"]);
        const list = (newOnly ? sortNewestProducts(rawList) : rawList)
          .filter((product) => !saleOnly || hasDiscount(product))
          .slice(0, PRODUCTS_PER_PAGE);

        if (mounted) {
          const nextProducts = uniqueProductList(list.map(normalizeProductSummary));
          setProducts((currentProducts) =>
            append
              ? uniqueProductList([...currentProducts, ...nextProducts])
              : nextProducts,
          );
          setMeta(
            readPaginationMeta(productPayload, {
              count: list.length,
              page: nextPage,
              limit: PRODUCTS_PER_PAGE,
            }),
          );
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (mounted) {
          setError(getApiErrorMessage(err, "Không tải được danh sách sản phẩm."));

          if (!append) {
            setProducts([]);
            setMeta(null);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [brand, category, effectiveSort, initialSearch, newOnly, page, requestKey, saleOnly]);

  const handleSearch = (event) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();

    if (!saleOnly && !newOnly) {
      navigate(
        resolveCatalogSearchPath({
          brands,
          categories,
          query: nextSearch,
        }),
      );
      return;
    }

    updateSearchParams((nextParams) => {
      if (nextSearch) {
        nextParams.set("search", nextSearch);
      } else {
        nextParams.delete("search");
      }

      nextParams.delete("keyword");
      nextParams.delete("page");
    });
  };

  const categoryHref = (nextCategory) => {
    const nextCategoryValue = nextCategory ? getCatalogFilterValue(nextCategory) : "";

    return buildProductsPath({
      basePath,
      brand,
      category: nextCategoryValue,
      searchParams,
    });
  };

  const handleSortChange = (event) => {
    const nextSort = event.target.value;

    updateSearchParams((nextParams) => {
      if (nextSort) {
        nextParams.set("sort", nextSort);
      } else {
        nextParams.delete("sort");
      }

      nextParams.delete("page");
    });
  };

  const isCategoryActive = (nextCategory) => {
    return isCatalogFilterActive(nextCategory, category);
  };

  const lastPage = Number(meta?.last_page);
  const hasKnownLastPage = Number.isFinite(lastPage) && lastPage > 0;
  const hasNextPage = hasKnownLastPage
    ? page < lastPage
    : Number(meta?.count) === PRODUCTS_PER_PAGE;
  const skeletonCount = loading || loadingMore ? PRODUCTS_PER_PAGE : 0;
  const pageKicker = saleOnly
    ? "Khuyến mãi"
    : newOnly
      ? "Hàng mới"
      : brand
        ? "Thương hiệu"
        : category
          ? "Danh mục"
          : initialSearch
            ? "Tìm sản phẩm"
            : "Sản phẩm";
  const pageTitle = saleOnly
    ? "Sản phẩm đang giảm giá"
    : newOnly
      ? "Sản phẩm mới nhất"
      : brand && category
        ? `${activeCategoryLabel} ${activeBrandLabel}`
        : brand
          ? `Sản phẩm ${activeBrandLabel}`
          : category
            ? `Danh mục ${activeCategoryLabel}`
            : initialSearch
              ? `Kết quả cho "${initialSearch}"`
              : "Danh sách sản phẩm";

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasNextPage) {
      setPaginationState((currentState) => ({
        page:
          currentState.requestKey === requestKey
            ? currentState.page + 1
            : page + 1,
        requestKey,
      }));
    }
  }, [hasNextPage, loading, loadingMore, page, requestKey, setPaginationState]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasNextPage || loading || loadingMore || error) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [error, handleLoadMore, hasNextPage, loading, loadingMore]);

  return (
    <main className="container catalog-page">
      <section className="catalog-toolbar">
        <div>
          <span>{pageKicker}</span>
          <h1>{pageTitle}</h1>
        </div>
        <form className="catalog-search" onSubmit={handleSearch}>
          <input
            name="search"
            onChange={(event) =>
              setSearchDraft({
                query: initialSearch,
                value: event.target.value,
              })
            }
            placeholder="Tìm sản phẩm..."
            value={searchInput}
          />
          <button type="submit">Tìm</button>
        </form>
        {saleOnly ? (
          <label className="catalog-sort">
            Sắp xếp
            <select onChange={handleSortChange} value={sort}>
              <option value="">Mới nhất</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
              <option value="name_asc">Tên A-Z</option>
              <option value="name_desc">Tên Z-A</option>
            </select>
          </label>
        ) : null}
      </section>

      {activeFilterChips.length ? (
        <div className="catalog-filter-chips" aria-label="Bộ lọc đang chọn">
          {activeFilterChips.map((chip) => (
            <Link key={chip.key} to={chip.to}>
              <span>{chip.label}</span>
              <span aria-hidden="true">x</span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="category-tabs">
        <Link className={!category ? "active" : ""} to={categoryHref("")}>
          Tất cả
        </Link>
        {categoryTabs.map((nextCategory) => (
          <Link
            className={isCategoryActive(nextCategory) ? "active" : ""}
            key={nextCategory.id || nextCategory.slug || nextCategory.name}
            to={categoryHref(nextCategory)}
          >
            <CategoryTabIcon icon={getCategoryIconValue(nextCategory)} />
            {nextCategory.name || nextCategory.label}
          </Link>
        ))}
      </div>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {!loading && !loadingMore && !error && products.length === 0 ? (
        <StatusMessage>
          {saleOnly
            ? "Chưa có sản phẩm giảm giá phù hợp."
            : newOnly
              ? "Chưa có sản phẩm mới phù hợp."
              : "Không tìm thấy sản phẩm phù hợp."}
        </StatusMessage>
      ) : null}

      <div className="product-grid product-grid--catalog">
        {products.map((product, index) => (
          <ProductCard key={getProductIdentity(product, index)} product={product} />
        ))}
        {Array.from({ length: skeletonCount }, (_, index) => (
          <ProductCardSkeleton key={`skeleton-${page}-${index}`} />
        ))}
      </div>

      {!loading && products.length > 0 ? (
        <nav className="catalog-pagination" aria-label="Product pagination">
          <span>
            {meta?.total !== null && meta?.total !== undefined
              ? `${products.length}/${meta.total} sản phẩm`
              : `${products.length} sản phẩm`}
          </span>
          <span ref={loadMoreRef} className="catalog-load-sentinel" />
        </nav>
      ) : null}
    </main>
  );
}
