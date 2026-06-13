import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import { productService } from "../../services/bstoreService";
import {
  formatCurrency,
  getProductSpecEntries,
  normalizeProduct,
} from "../../utils/formatters";

const PRIORITY_SPEC_KEYS = [
  "chip",
  "cpu",
  "gpu",
  "ram",
  "storage",
  "screen",
  "display",
  "battery",
  "camera",
];

function getHighlightSpecs(product) {
  const entries = getProductSpecEntries(product);
  const priority = new Map(
    PRIORITY_SPEC_KEYS.map((key, index) => [key, index]),
  );

  return [...entries]
    .sort((first, second) => {
      const firstRank = priority.get(String(first.key).toLowerCase()) ?? 99;
      const secondRank = priority.get(String(second.key).toLowerCase()) ?? 99;
      return firstRank - secondRank;
    })
    .slice(0, 4);
}

function getVariantName(variant = {}, index = 0) {
  const parts = [variant.color, variant.ram, variant.storage].filter(Boolean);
  return parts.length ? parts.join(" / ") : `Cấu hình ${index + 1}`;
}

function getStatusText(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "active") {
    return "Đang bán";
  }

  if (normalized === "inactive") {
    return "Tạm ngừng";
  }

  if (normalized === "out_of_stock") {
    return "Hết hàng";
  }

  return "Đang cập nhật";
}

function getWarrantyRows(policy) {
  if (!policy) {
    return [];
  }

  return [
    { label: "Gói bảo hành", value: policy.name },
    {
      label: "Thời hạn",
      value: policy.duration_months ? `${policy.duration_months} tháng` : "",
    },
    {
      label: "Đổi trả",
      value: policy.return_days ? `${policy.return_days} ngày` : "",
    },
    {
      label: "Đổi mới",
      value: policy.exchange_days ? `${policy.exchange_days} ngày` : "",
    },
    {
      label: "Hỗ trợ sửa chữa",
      value: policy.repair_support ? "Có" : "Không",
    },
    { label: "Ghi chú", value: policy.description },
  ].filter((item) => item.value);
}

export default function ProductDetailPage() {
  const { idOrSlug } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        if (/^\d+$/.test(String(idOrSlug))) {
          const payload = await productService.getProduct(idOrSlug);
          if (mounted) {
            const normalizedProduct = normalizeProduct(payload);
            setProduct(normalizedProduct);
            setSelectedVariantId(String(normalizedProduct.variantId || ""));
            setQuantity(1);
          }
          return;
        }

        const payload = await productService.getProducts();
        const products = Array.isArray(payload) ? payload : payload?.data || [];
        const found = products.find((item) => item.slug === idOrSlug);

        if (!found) {
          throw new Error("Không tìm thấy sản phẩm.");
        }

        if (mounted) {
          const normalizedProduct = normalizeProduct(found);
          setProduct(normalizedProduct);
          setSelectedVariantId(String(normalizedProduct.variantId || ""));
          setQuantity(1);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, "Không tải được chi tiết sản phẩm."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [idOrSlug]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để mua hàng.", "warning");
      navigate("/login", { state: { from: location } });
      return;
    }

    const selectedVariant =
      product?.variants.find(
        (variant) => String(variant.id) === String(selectedVariantId),
      ) ||
      product?.variants[0] ||
      null;
    const cartProduct = selectedVariant?.id
      ? normalizeProduct({
          ...product.raw,
          product_variant_id: selectedVariant.id,
          variant: selectedVariant,
        })
      : product;

    try {
      await addToCart(cartProduct, quantity);
      showToast("Đã thêm sản phẩm vào giỏ hàng.", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Không thêm được vào giỏ."), "error");
    }
  };

  if (loading) {
    return (
      <main className="container detail-page">
        <StatusMessage>Đang tải chi tiết sản phẩm...</StatusMessage>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="container detail-page">
        <StatusMessage tone="error">
          {error || "Không tìm thấy sản phẩm."}
        </StatusMessage>
        <Link className="secondary-button" to="/products">
          Quay lại danh sách
        </Link>
      </main>
    );
  }

  const specEntries = getProductSpecEntries(product);
  const highlightSpecs = getHighlightSpecs(product);
  const selectedVariant =
    product.variants.find(
      (variant) => String(variant.id) === String(selectedVariantId),
    ) ||
    product.variants[0] ||
    {};
  const selectedPrice = Number(selectedVariant.price ?? product.price ?? 0);
  const selectedStatus = selectedVariant.status || product.status;
  const selectedSku = selectedVariant.sku || product.raw?.sku || "Đang cập nhật";
  const warrantyRows = getWarrantyRows(product.warrantyPolicy);

  return (
    <main className="container detail-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/products">Sản phẩm</Link>
        <span>/</span>
        <span>{product.category}</span>
      </nav>

      <section className="detail-card detail-card--expanded">
        <div className="detail-image">
          <span className="detail-image-badge">{getStatusText(selectedStatus)}</span>
          {product.imageUrl ? (
            <img alt={product.name} src={product.imageUrl} />
          ) : (
            <div className="detail-placeholder">BStore</div>
          )}
        </div>
        <div className="detail-info">
          <div className="detail-topline">
            <span>{product.category}</span>
            {product.brand ? <strong>{product.brand}</strong> : null}
          </div>
          <h1>{product.name}</h1>
          <p>{product.description}</p>

          <dl className="detail-meta">
            <div>
              <dt>Thương hiệu</dt>
              <dd>{product.brand || "Đang cập nhật"}</dd>
            </div>
            <div>
              <dt>Danh mục</dt>
              <dd>{product.category}</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{selectedSku}</dd>
            </div>
          </dl>

          {highlightSpecs.length ? (
            <div className="spec-highlight-grid" aria-label="Thông số nổi bật">
              {highlightSpecs.map((spec) => (
                <div className="spec-chip" key={spec.key}>
                  <span>{spec.label}</span>
                  <strong>{spec.value}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <div className="detail-price">
            <strong>{formatCurrency(selectedPrice)}</strong>
            {product.oldPrice > selectedPrice ? (
              <span>{formatCurrency(product.oldPrice)}</span>
            ) : null}
          </div>

          {product.variants.length ? (
            <div className="variant-selector">
              <span>Phiên bản</span>
              <div className="variant-option-list">
                {product.variants.map((variant, index) => (
                  <button
                    className={
                      String(selectedVariant.id) === String(variant.id)
                        ? "variant-option active"
                        : "variant-option"
                    }
                    key={variant.id || index}
                    onClick={() => setSelectedVariantId(String(variant.id))}
                    type="button"
                  >
                    <strong>{getVariantName(variant, index)}</strong>
                    <small>{formatCurrency(variant.price)}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="stock-line">
            Tồn kho:{" "}
            <strong>
              {product.stock > 0 ? `${product.stock} sản phẩm` : "Đang cập nhật"}
            </strong>
          </div>
          <label className="quantity-control">
            Số lượng
            <input
              min="1"
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value) || 1))
              }
              type="number"
              value={quantity}
            />
          </label>
          <div className="detail-actions">
            <button className="primary-button" onClick={handleAddToCart} type="button">
              Thêm vào giỏ
            </button>
            <Link className="secondary-button" to="/products">
              Xem thêm sản phẩm
            </Link>
          </div>
        </div>
      </section>

      <section className="detail-section-grid">
        <article className="detail-panel detail-panel--specs">
          <div className="detail-panel-heading">
            <div>
              <span>Device specs</span>
              <h2>Thông số kỹ thuật</h2>
            </div>
            <strong>{specEntries.length || 0} mục</strong>
          </div>
          {specEntries.length ? (
            <div className="spec-table">
              {specEntries.map((spec) => (
                <div className="spec-row" key={spec.key}>
                  <span>{spec.label}</span>
                  <strong>{spec.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-detail-note">
              Sản phẩm này chưa có thông số từ backend.
            </p>
          )}
        </article>

        <article className="detail-panel">
          <div className="detail-panel-heading">
            <div>
              <span>Options</span>
              <h2>Cấu hình bán</h2>
            </div>
          </div>
          {product.variants.length ? (
            <div className="variant-list">
              {product.variants.map((variant, index) => (
                <div className="variant-row" key={variant.id || index}>
                  <div>
                    <strong>{getVariantName(variant, index)}</strong>
                    <span>SKU: {variant.sku || "Đang cập nhật"}</span>
                  </div>
                  <div>
                    <strong>{formatCurrency(variant.price)}</strong>
                    <span>{getStatusText(variant.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-detail-note">Chưa có cấu hình bán riêng.</p>
          )}
        </article>

        <article className="detail-panel">
          <div className="detail-panel-heading">
            <div>
              <span>Service</span>
              <h2>Bảo hành & dịch vụ</h2>
            </div>
          </div>
          {warrantyRows.length ? (
            <div className="warranty-list">
              {warrantyRows.map((row) => (
                <div className="warranty-item" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-detail-note">
              Chưa có chính sách bảo hành cho sản phẩm này.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
