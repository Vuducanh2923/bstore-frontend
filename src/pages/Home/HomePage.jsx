import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeroSlider from "../../components/HeroSlider";
import ProductCard, { ProductCardSkeleton } from "../../components/ProductCard";
import StatusMessage from "../../components/StatusMessage";
import { getApiErrorMessage, readCollection } from "../../services/api";
import {
  getCategories,
  getProducts,
  getSaleProducts,
} from "../../services/productService";
import { buildProductsPath } from "../../utils/catalogLinks";
import {
  normalizeProductSummary,
  slugify,
} from "../../utils/formatters";

const HOME_FEATURED_PRODUCTS_LIMIT = 10;
const HOME_SALE_CATEGORY_LIMIT = 10;
const HOME_SALE_PRODUCTS_PER_CATEGORY = 10;
const HOME_SALE_PRODUCTS_LIMIT = 30;

const INITIAL_SECTION_STATUS = {
  products: "idle",
  sale: "idle",
};

const INITIAL_SECTION_ERRORS = {
  products: "",
  sale: "",
};

function getCategoryMarker(categoryName = "") {
  return String(categoryName || "B")
    .trim()
    .slice(0, 1)
    .toUpperCase();
}

function unwrapDataPayload(payload) {
  if (payload?.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
}

function getCategoryName(category = {}) {
  return category.name || category.label || category.title || "Danh mục";
}

function getCategoryValue(category = {}) {
  const name = getCategoryName(category);

  return (
    category.slug ??
    category.category_slug ??
    category.categorySlug ??
    category.id ??
    category.category_id ??
    category.categoryId ??
    (name ? slugify(name) : "")
  );
}

function normalizeHomeCategory(category = {}) {
  const name = getCategoryName(category);
  const value = getCategoryValue(category);

  return {
    id: category.id ?? category.category_id ?? category.slug ?? name,
    name,
    to: buildProductsPath({ category: value }),
    value: String(value || ""),
  };
}

function normalizeProductList(payload) {
  const data = unwrapDataPayload(payload);

  return readCollection(data, ["featured", "products"])
    .map(normalizeProductSummary);
}

function getProductCategoryKey(product = {}) {
  return String(
    product.categorySlug ||
      product.category_slug ||
      product.category?.slug ||
      product.categoryId ||
      product.category_id ||
      product.category?.id ||
      product.category ||
      product.categoryName ||
      product.category_name ||
      "",
  ).trim();
}

function getProductCategoryName(product = {}) {
  return (
    product.category?.name ||
    product.categoryName ||
    product.category_name ||
    product.category ||
    "Sản phẩm"
  );
}

function buildFallbackSaleSections(categories = [], saleProducts = []) {
  const sections = [];

  categories.forEach((category) => {
    const categoryKey = String(category.value || category.name || "").trim();
    const products = saleProducts.filter((product) => {
      const productCategoryKey = getProductCategoryKey(product);

      return (
        productCategoryKey &&
        [categoryKey, category.name, category.id]
          .filter(Boolean)
          .some((value) => String(value) === productCategoryKey)
      );
    });

    if (products.length) {
      sections.push({
        category,
        products: products.slice(0, HOME_SALE_PRODUCTS_PER_CATEGORY),
      });
    }
  });

  if (!sections.length && saleProducts.length) {
    const fallbackSections = new Map();

    saleProducts.forEach((product) => {
      const productCategoryKey = getProductCategoryKey(product);
      const productCategoryName = getProductCategoryName(product);
      const sectionKey = String(
        productCategoryKey || productCategoryName || "sale",
      );

      if (!fallbackSections.has(sectionKey)) {
        fallbackSections.set(sectionKey, {
          category: {
            id: sectionKey,
            name: productCategoryName,
            to: productCategoryKey
              ? buildProductsPath({ category: productCategoryKey })
              : "/sale",
            value: sectionKey,
          },
          products: [],
        });
      }

      fallbackSections.get(sectionKey).products.push(product);
    });

    return Array.from(fallbackSections.values())
      .slice(0, HOME_SALE_CATEGORY_LIMIT)
      .map((section) => ({
        ...section,
        products: section.products.slice(0, HOME_SALE_PRODUCTS_PER_CATEGORY),
      }));
  }

  return sections;
}

function SaleSectionSkeleton() {
  return (
    <section className="home-sale-rail-card" aria-hidden="true">
      <div className="home-sale-rail-heading">
        <div>
          <span className="home-section-icon" />
          <h2>Đang tải sản phẩm giảm giá</h2>
        </div>
      </div>
      <div className="home-horizontal-products">
        {Array.from({ length: 5 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

function HomePromoBanner() {
  return (
    <Link className="home-promo-banner" to="/sale">
      <div>
        <span>Ưu đãi hôm nay</span>
        <h2>Tháng vàng công nghệ</h2>
        <p>Khám phá thêm nhiều sản phẩm đang giảm giá tại BStore.</p>
      </div>
      <strong>Săn ngay</strong>
    </Link>
  );
}

export default function HomePage() {
  const [homeCategories, setHomeCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [saleSections, setSaleSections] = useState([]);
  const [sectionErrors, setSectionErrors] = useState(INITIAL_SECTION_ERRORS);
  const [sectionStatus, setSectionStatus] = useState(INITIAL_SECTION_STATUS);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const setStatus = (key, value) => {
      if (mounted) {
        setSectionStatus((current) => ({ ...current, [key]: value }));
      }
    };

    const setSectionError = (key, value) => {
      if (mounted) {
        setSectionErrors((current) => ({ ...current, [key]: value }));
      }
    };

    async function loadFeaturedProducts() {
      setStatus("products", "loading");
      setSectionError("products", "");

      try {
        const payload = await getProducts({
          limit: HOME_FEATURED_PRODUCTS_LIMIT,
          page: 1,
          signal: controller.signal,
        });
        const list = normalizeProductList(payload).slice(
          0,
          HOME_FEATURED_PRODUCTS_LIMIT,
        );

        if (mounted) {
          setFeaturedProducts(list);
          setStatus("products", "done");
        }
      } catch (reason) {
        if (!mounted || reason?.name === "AbortError") {
          return;
        }

        setFeaturedProducts([]);
        setSectionError(
          "products",
          getApiErrorMessage(reason, "Không tải được sản phẩm nổi bật."),
        );
        setStatus("products", "error");
      }
    }

    async function loadSaleSections() {
      setStatus("sale", "loading");
      setSectionError("sale", "");

      try {
        const [categoryPayload, salePayload] = await Promise.all([
          getCategories({
            limit: HOME_SALE_CATEGORY_LIMIT,
            signal: controller.signal,
          }),
          getSaleProducts({
            limit: HOME_SALE_PRODUCTS_LIMIT,
            page: 1,
            signal: controller.signal,
          }),
        ]);
        const categoryData = unwrapDataPayload(categoryPayload);
        const categories = readCollection(categoryData, ["categories"])
          .slice(0, HOME_SALE_CATEGORY_LIMIT)
          .map(normalizeHomeCategory)
          .filter((category) => category.value);
        const saleProducts = normalizeProductList(salePayload);
        const sections = buildFallbackSaleSections(categories, saleProducts);

        if (mounted) {
          setHomeCategories(categories);
          setSaleSections(sections);
          setStatus("sale", "done");
        }
      } catch (reason) {
        if (!mounted || reason?.name === "AbortError") {
          return;
        }

        setSaleSections([]);
        setHomeCategories([]);
        setSectionError(
          "sale",
          getApiErrorMessage(reason, "Không tải được sản phẩm giảm giá."),
        );
        setStatus("sale", "error");
      }
    }

    loadFeaturedProducts();
    loadSaleSections();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const isProductsLoading = sectionStatus.products === "loading";
  const isSaleLoading = sectionStatus.sale === "loading";

  return (
    <main className="home-page home-page--cellphones">
      <section className="container home-category-pills" aria-label="Danh mục nổi bật">
        {isSaleLoading && homeCategories.length === 0 ? (
          Array.from({ length: 5 }, (_, index) => (
            <span className="home-category-pill home-category-pill--skeleton" key={index} />
          ))
        ) : null}
        {homeCategories.map((category) => (
          <Link className="home-category-pill" key={category.id} to={category.to}>
            <span>{getCategoryMarker(category.name)}</span>
            {category.name}
          </Link>
        ))}
      </section>

      <HeroSlider />

      <section className="container section-block home-featured-section">
        <div className="home-section-title-row">
          <h2>
            <span className="home-section-fire" aria-hidden="true">🔥</span>
            Sản phẩm nổi bật
          </h2>
          <Link to="/products">Xem tất cả</Link>
        </div>

        {sectionErrors.products ? (
          <StatusMessage tone="error">{sectionErrors.products}</StatusMessage>
        ) : null}
        {isProductsLoading ? (
          <div className="product-grid home-featured-grid" aria-hidden="true">
            {Array.from({ length: HOME_FEATURED_PRODUCTS_LIMIT }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : null}
        {sectionStatus.products === "done" &&
        !sectionErrors.products &&
        featuredProducts.length === 0 ? (
          <StatusMessage>Chưa có sản phẩm nổi bật.</StatusMessage>
        ) : null}
        {sectionStatus.products === "done" && !sectionErrors.products ? (
          <div className="product-grid home-featured-grid">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id || product.slug || product.name} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="container section-block home-sale-sections">
        <div className="home-section-title-row home-section-title-row--compact">
          <h2>Danh mục đang giảm giá</h2>
          <Link to="/sale">Xem tất cả khuyến mãi</Link>
        </div>

        {sectionErrors.sale ? (
          <StatusMessage tone="error">{sectionErrors.sale}</StatusMessage>
        ) : null}
        {isSaleLoading ? (
          <div className="home-sale-stack">
            {Array.from({ length: 3 }, (_, index) => (
              <SaleSectionSkeleton key={index} />
            ))}
          </div>
        ) : null}
        {sectionStatus.sale === "done" &&
        !sectionErrors.sale &&
        saleSections.length === 0 ? (
          <StatusMessage>Chưa có danh mục nào đang có sản phẩm giảm giá.</StatusMessage>
        ) : null}
        {sectionStatus.sale === "done" && !sectionErrors.sale ? (
          <div className="home-sale-stack">
            {saleSections.map((section, index) => (
              <div key={section.category.id || section.category.name}>
                <section className="home-sale-rail-card">
                  <div className="home-sale-rail-heading">
                    <div>
                      <span className="home-section-icon">{getCategoryMarker(section.category.name)}</span>
                      <h2>{section.category.name} Sale</h2>
                    </div>
                    <Link to={section.category.to}>Xem tất cả</Link>
                  </div>
                  <div className="home-horizontal-products">
                    {section.products.map((product) => (
                      <ProductCard
                        key={product.id || product.slug || product.name}
                        product={product}
                      />
                    ))}
                  </div>
                </section>
                {index === 0 ? <HomePromoBanner /> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="container service-strip">
        <div>
          <span>BH</span>
          <strong>Bảo hành chính hãng</strong>
          <p>Hỗ trợ bảo hành minh bạch theo chính sách sản phẩm.</p>
        </div>
        <div>
          <span>GH</span>
          <strong>Giao hàng nhanh</strong>
          <p>Giao toàn quốc, hỗ trợ kiểm tra hàng khi nhận.</p>
        </div>
        <div>
          <span>TV</span>
          <strong>Tư vấn kỹ thuật</strong>
          <p>Đội ngũ BStore hỗ trợ chọn cấu hình phù hợp.</p>
        </div>
      </section>
    </main>
  );
}
