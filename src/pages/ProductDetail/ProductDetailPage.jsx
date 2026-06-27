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
  formatSalePercent,
  getProductSaleInfo,
  getProductSpecEntries,
  normalizeProduct,
  resolveMediaUrl,
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

const DETAIL_SERVICE_ITEMS = [
  {
    icon: "✓",
    title: "Chính hãng 100%",
    text: "Sản phẩm mới, đầy đủ hóa đơn và bảo hành.",
  },
  {
    icon: "↺",
    title: "Bảo hành tận nơi",
    text: "Hỗ trợ đổi mới theo chính sách của BStore.",
  },
  {
    icon: "⚡",
    title: "Đổi trả 30 ngày",
    text: "Lỗi từ nhà sản xuất được hỗ trợ nhanh chóng.",
  },
  {
    icon: "▣",
    title: "Giao hàng toàn quốc",
    text: "Nhận hàng, kiểm tra rồi thanh toán an toàn.",
  },
];

const DETAIL_PROMOTIONS = [
  "Giảm thêm khi thanh toán bằng thẻ ngân hàng.",
  "Trả góp 0% qua thẻ tín dụng.",
  "Thu cũ đổi mới trợ giá lên đến 2 triệu.",
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

function getImageValue(image = {}) {
  if (typeof image === "string") {
    return image;
  }

  return (
    image.full_image_url ||
    image.fullImageUrl ||
    image.image_url ||
    image.imageUrl ||
    image.thumbnail_url ||
    image.thumbnailUrl ||
    image.thumbnail ||
    image.url ||
    image.path ||
    ""
  );
}

function getProductGalleryImages(product = {}) {
  const rawImages = Array.isArray(product.raw?.images) ? product.raw.images : [];
  const imageValues = [
    product.imageUrl,
    product.thumbnail,
    ...rawImages.map(getImageValue),
  ].filter(Boolean);
  const uniqueImages = Array.from(new Set(imageValues.map((image) => String(image).trim())))
    .filter(Boolean);

  return uniqueImages.map(resolveMediaUrl);
}

function getVariantValues(variants = [], field) {
  return Array.from(
    new Set(
      variants
        .map((variant) => String(variant?.[field] || "").trim())
        .filter(Boolean),
    ),
  );
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
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeDetailTab, setActiveDetailTab] = useState("description");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const payload = await productService.getProduct(slug);
        if (mounted) {
          const normalizedProduct = normalizeProduct(payload?.product || payload);
          setProduct(normalizedProduct);
          setSelectedVariantId(String(normalizedProduct.variantId || ""));
          setSelectedImageIndex(0);
          setActiveDetailTab("description");
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
  }, [slug]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để mua hàng.", "warning");
      navigate("/login", { state: { from: location } });
      return false;
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
      return true;
    } catch (err) {
      showToast(getApiErrorMessage(err, "Không thêm được vào giỏ."), "error");
      return false;
    }
  };

  const handleBuyNow = async () => {
    const added = await handleAddToCart();

    if (added) {
      navigate("/cart");
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
  const selectedVariantSpecEntries = getProductSpecEntries({
    specifications: selectedVariant.specifications,
  });
  const visibleSpecEntries = selectedVariantSpecEntries.length
    ? selectedVariantSpecEntries
    : specEntries;
  const selectedOriginalPrice = Number(selectedVariant.price ?? product.price ?? 0);
  const saleInfo = getProductSaleInfo({
    ...product.raw,
    is_sale: product.isSale,
    price: selectedOriginalPrice,
    sale_percent: product.salePercent,
    sale_price: product.salePrice,
  });
  const selectedPrice = saleInfo.displayPrice;
  const selectedStatus = selectedVariant.status || product.status;
  const selectedSku = selectedVariant.sku || product.raw?.sku || "Đang cập nhật";
  const warrantyRows = getWarrantyRows(product.warrantyPolicy);
  const productImages = getProductGalleryImages(product);
  const selectedImageSrc =
    productImages[selectedImageIndex] || productImages[0] || "";
  const storageOptions = getVariantValues(product.variants, "storage");
  const colorOptions = getVariantValues(product.variants, "color");
  const selectedStock = Number(
    selectedVariant.inventory?.quantity ??
      selectedVariant.stock ??
      product.stock ??
      0,
  );
  const descriptionHtml = product.description || product.raw?.description || "";
  const shortDescription =
    product.raw?.short_description ||
    product.raw?.shortDescription ||
    "Sản phẩm chính hãng tại BStore, đầy đủ bảo hành và hỗ trợ kỹ thuật.";
  const tabSpecCount = visibleSpecEntries.length || 0;

  const handleVariantValueClick = (field, value) => {
    const otherField = field === "storage" ? "color" : "storage";
    const otherValue = selectedVariant?.[otherField];
    const matchedVariant =
      product.variants.find(
        (variant) =>
          String(variant?.[field] || "") === value &&
          (!otherValue || String(variant?.[otherField] || "") === String(otherValue)),
      ) ||
      product.variants.find((variant) => String(variant?.[field] || "") === value);

    if (matchedVariant?.id) {
      setSelectedVariantId(String(matchedVariant.id));
    }
  };

  return (
    <main className="container detail-page">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/products">Sản phẩm</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      <section className="detail-showcase">
        <aside className="detail-gallery" aria-label="Ảnh sản phẩm">
          <div className="detail-main-image">
            <span className="detail-image-badge">{getStatusText(selectedStatus)}</span>
            {selectedImageSrc ? (
              <img alt={product.name} src={selectedImageSrc} />
            ) : (
              <div className="detail-placeholder">BStore</div>
            )}
          </div>
          {productImages.length > 1 ? (
            <div className="detail-thumbnail-list">
              {productImages.map((image, index) => (
                <button
                  className={index === selectedImageIndex ? "active" : ""}
                  key={image}
                  onClick={() => setSelectedImageIndex(index)}
                  type="button"
                >
                  <img alt="" src={image} />
                </button>
              ))}
            </div>
          ) : null}
        </aside>

        <section className="detail-buy-card">
          <div className="detail-product-heading">
            <span>{product.category}</span>
            <h1>{product.name}</h1>
            <p>
              {product.brand ? `${product.brand} · ` : ""}
              SKU: {selectedSku}
            </p>
          </div>

          <div className={`detail-price${saleInfo.isSale ? " detail-price--sale" : ""}`}>
            {saleInfo.isSale ? (
              <>
                <strong>{formatCurrency(saleInfo.salePrice)}</strong>
                <span>{formatCurrency(saleInfo.originalPrice)}</span>
                <small className="detail-sale-badge">
                  -{formatSalePercent(saleInfo.salePercent)}%
                </small>
              </>
            ) : (
              <strong>{formatCurrency(selectedPrice)}</strong>
            )}
          </div>

          <p className="detail-tax-note">Giá đã bao gồm VAT. Hàng mới, chính hãng.</p>

          {storageOptions.length ? (
            <div className="detail-option-group">
              <span>Dung lượng</span>
              <div className="detail-pill-list">
                {storageOptions.map((storage) => (
                  <button
                    className={String(selectedVariant.storage || "") === storage ? "active" : ""}
                    key={storage}
                    onClick={() => handleVariantValueClick("storage", storage)}
                    type="button"
                  >
                    {storage}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {colorOptions.length ? (
            <div className="detail-option-group">
              <span>Màu sắc</span>
              <div className="detail-pill-list detail-color-list">
                {colorOptions.map((color) => (
                  <button
                    className={String(selectedVariant.color || "") === color ? "active" : ""}
                    key={color}
                    onClick={() => handleVariantValueClick("color", color)}
                    type="button"
                  >
                    <i aria-hidden="true" />
                    {color}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {product.variants.length ? (
            <div className="detail-option-group">
              <span>Cấu hình</span>
              <div className="detail-variant-scroll">
                {product.variants.map((variant, index) => (
                  <button
                    className={
                      String(selectedVariant.id) === String(variant.id)
                        ? "detail-variant-tile active"
                        : "detail-variant-tile"
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

          <div className="detail-stock-row">
            <span>{selectedStock > 0 ? "Còn hàng" : "Liên hệ tồn kho"}</span>
            <label>
              <button
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                type="button"
              >
                -
              </button>
              <input
                aria-label="Số lượng"
                min="1"
                onChange={(event) =>
                  setQuantity(Math.max(1, Number(event.target.value) || 1))
                }
                type="number"
                value={quantity}
              />
              <button
                onClick={() => setQuantity((current) => current + 1)}
                type="button"
              >
                +
              </button>
            </label>
          </div>

          <div className="detail-actions detail-actions--purchase">
            <button className="primary-button" onClick={handleBuyNow} type="button">
              Mua ngay
              <small>Giao hàng hoặc nhận tại cửa hàng</small>
            </button>
            <button className="secondary-button" onClick={handleAddToCart} type="button">
              Thêm giỏ hàng
              <small>Đặt giữ sản phẩm</small>
            </button>
          </div>
        </section>

        <aside className="detail-service-card">
          <h2>Cam kết tại BStore</h2>
          <div className="detail-service-list">
            {DETAIL_SERVICE_ITEMS.map((item) => (
              <div className="detail-service-item" key={item.title}>
                <span>{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="detail-promo-box">
            <h3>Ưu đãi thanh toán</h3>
            <ul>
              {DETAIL_PROMOTIONS.map((promotion) => (
                <li key={promotion}>{promotion}</li>
              ))}
            </ul>
          </div>
          {warrantyRows.length ? (
            <div className="detail-warranty-mini">
              {warrantyRows.slice(0, 3).map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </section>

      <section className="detail-content-card">
        <div className="detail-tabs" role="tablist" aria-label="Thông tin sản phẩm">
          <button
            className={activeDetailTab === "description" ? "active" : ""}
            onClick={() => setActiveDetailTab("description")}
            type="button"
          >
            Mô tả sản phẩm
          </button>
          <button
            className={activeDetailTab === "specs" ? "active" : ""}
            onClick={() => setActiveDetailTab("specs")}
            type="button"
          >
            Thông số kỹ thuật
          </button>
        </div>

        {activeDetailTab === "description" ? (
          <article className="detail-description-panel">
            <h2>{product.name}</h2>
            <p className="detail-short-description">{shortDescription}</p>
            <div
              className="detail-description-content"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
            {highlightSpecs.length ? (
              <div className="detail-highlight-box">
                {highlightSpecs.map((spec) => (
                  <div key={spec.key}>
                    <span>✓</span>
                    <p>
                      <strong>{spec.label}:</strong> {spec.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {tabSpecCount ? (
              <>
                <h3>Thông số kỹ thuật chi tiết</h3>
                <div className="spec-table">
                  {visibleSpecEntries.map((spec) => (
                    <div className="spec-row" key={`${spec.group || "spec"}-${spec.key}`}>
                      <span>{spec.label}</span>
                      <strong>{spec.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </article>
        ) : (
          <article className="detail-description-panel">
            <h2>Thông số kỹ thuật</h2>
            {visibleSpecEntries.length ? (
              <div className="spec-table">
                {visibleSpecEntries.map((spec) => (
                  <div className="spec-row" key={`${spec.group || "spec"}-${spec.key}`}>
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
        )}
      </section>
    </main>
  );
}
