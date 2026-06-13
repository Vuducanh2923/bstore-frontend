import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/ProductCard";
import StatusMessage from "../../components/StatusMessage";
import { getApiErrorMessage, readCollection } from "../../services/api";
import { productService } from "../../services/bstoreService";
import { normalizeProduct } from "../../utils/formatters";

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const keyword = searchParams.get("keyword") || "";
  const categoryId = searchParams.get("category_id") || "";

  const loadCategories = useCallback(async () => {
    try {
      const payload = await productService.getCategories();
      setCategories(readCollection(payload, ["categories"]));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await productService.getProducts({
        keyword: keyword || undefined,
        category_id: categoryId || undefined,
      });

      setProducts(readCollection(payload, ["products"]).map(normalizeProduct));
    } catch (err) {
      setError(getApiErrorMessage(err, "Khong tai duoc danh sach san pham."));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, keyword]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadCategories();
      loadProducts();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadCategories, loadProducts]);

  const handleSearch = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextKeyword = String(formData.get("keyword") || "").trim();
    const nextParams = new URLSearchParams(searchParams);

    if (nextKeyword) {
      nextParams.set("keyword", nextKeyword);
    } else {
      nextParams.delete("keyword");
    }

    setSearchParams(nextParams);
  };

  const categoryHref = (nextCategoryId) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextCategoryId) {
      nextParams.set("category_id", nextCategoryId);
    } else {
      nextParams.delete("category_id");
    }

    const query = nextParams.toString();
    return query ? `/products?${query}` : "/products";
  };

  return (
    <main className="container catalog-page">
      <section className="catalog-toolbar">
        <div>
          <span>Products</span>
          <h1>Danh sach san pham</h1>
        </div>
        <form className="catalog-search" onSubmit={handleSearch}>
          <input
            defaultValue={keyword}
            key={keyword}
            name="keyword"
            placeholder="Tim san pham..."
          />
          <button type="submit">Tim</button>
        </form>
      </section>

      <div className="category-tabs">
        <Link
          className={!categoryId ? "active" : ""}
          to={categoryHref("")}
        >
          Tat ca
        </Link>
        {categories.map((category) => (
          <Link
            className={String(categoryId) === String(category.id) ? "active" : ""}
            key={category.id}
            to={categoryHref(String(category.id))}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {loading ? <StatusMessage>Dang tai san pham...</StatusMessage> : null}
      {!loading && !error && products.length === 0 ? (
        <StatusMessage>Khong tim thay san pham phu hop.</StatusMessage>
      ) : null}

      <div className="product-grid product-grid--catalog">
        {products.map((product) => (
          <ProductCard key={product.id || product.name} product={product} />
        ))}
      </div>
    </main>
  );
}
