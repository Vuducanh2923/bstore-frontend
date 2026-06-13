import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../components/ProductCard";
import StatusMessage from "../../components/StatusMessage";
import { getApiErrorMessage, readCollection } from "../../services/api";
import { productService } from "../../services/bstoreService";
import { normalizeProduct } from "../../utils/formatters";

const categories = [
  { label: "Laptops", icon: "▭" },
  { label: "Mobile", icon: "▯" },
  { label: "Tablets", icon: "▤" },
  { label: "Audio", icon: "♬" },
  { label: "Wearables", icon: "◌" },
  { label: "Gaming", icon: "▣" },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const payload = await productService.getProducts({
          featured: true,
          limit: 8,
        });
        const list = readCollection(payload, ["featured", "products"]).map(
          normalizeProduct,
        );

        if (mounted) {
          setProducts(list);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, "Không tải được sản phẩm nổi bật."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="home-page">
      <section className="container hero-panel">
        <div className="hero-content">
          <span>Summer Tech Fest</span>
          <h1>Next-Gen Performance. Now Within Reach.</h1>
          <p>
            Experience the future with flagship laptops, mobile devices and
            smart accessories from BStore.
          </p>
          <Link className="primary-button" to="/products">
            Shop Now
          </Link>
        </div>
        <div className="hero-device" aria-hidden="true">
          <div className="device-screen" />
          <div className="device-keyboard" />
        </div>
      </section>

      <section className="container section-block">
        <div className="section-heading">
          <div>
            <h2>Top Categories</h2>
            <p>Find exactly what you're looking for</p>
          </div>
          <Link to="/products">View All »</Link>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link
              className="category-card"
              key={category.label}
              to={`/products?category=${encodeURIComponent(category.label)}`}
            >
              <span>{category.icon}</span>
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="container flash-sale">
        <div className="flash-heading">
          <div>
            <strong>⚡ FLASH SALE</strong>
            <p>Limited stock available!</p>
          </div>
          <div className="countdown">
            <span>04<small>Hours</small></span>
            <span>22<small>Mins</small></span>
            <span>09<small>Secs</small></span>
          </div>
        </div>
        <div className="flash-products">
          {products.slice(0, 3).map((product) => (
            <Link
              className="mini-product"
              key={product.id || product.name}
              to={`/products/${product.id}`}
            >
              <div className="mini-image">
                {product.imageUrl ? (
                  <img alt={product.name} src={product.imageUrl} />
                ) : (
                  <span>□</span>
                )}
              </div>
              <div>
                <strong>{product.name}</strong>
                <p>{product.category}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="section-title-center">Featured Products</div>
        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
        {loading ? <StatusMessage>Đang tải sản phẩm...</StatusMessage> : null}
        {!loading && !error && products.length === 0 ? (
          <StatusMessage>Chưa có sản phẩm từ backend.</StatusMessage>
        ) : null}
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id || product.name} product={product} />
          ))}
        </div>
      </section>

      <section className="container promo-grid">
        <article className="promo-large">
          <div>
            <strong>JUST LANDED</strong>
            <h3>Sound Evolution: The New Audio Max</h3>
            <p>
              Immersive spatial audio meets understated comfort in our newest
              flagship headphones.
            </p>
            <Link to="/products?category=Audio">Explore Series</Link>
          </div>
          <div className="headphone-art" aria-hidden="true" />
        </article>
        <article className="promo-small">
          <div>
            <h3>Gaming Station Pro</h3>
            <p>Upgrade your setup with 4K HDR support.</p>
            <Link to="/products?category=Gaming">Shop Console</Link>
          </div>
          <div className="console-art" aria-hidden="true" />
        </article>
        <article className="promo-small">
          <div>
            <h3>Smart Home Hub</h3>
            <p>Control your world with one touch.</p>
            <Link to="/products?category=Smart Home">Learn More</Link>
          </div>
          <div className="hub-art" aria-hidden="true" />
        </article>
      </section>

      <section className="container service-strip">
        <div>
          <span>▱</span>
          <strong>Free Express Shipping</strong>
          <p>On all orders over $500</p>
        </div>
        <div>
          <span>◇</span>
          <strong>2-Year Warranty</strong>
          <p>Certified protection on all tech</p>
        </div>
        <div>
          <span>☏</span>
          <strong>24/7 Expert Support</strong>
          <p>Talk to our tech gurus anytime</p>
        </div>
      </section>
    </main>
  );
}
