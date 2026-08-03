import { memo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatSalePercent,
  getProductSaleInfo,
  optimizeCloudinaryImage,
} from "../utils/formatters";

const CARD_IMAGE_WIDTH = 280;
const CARD_IMAGE_HEIGHT = 244;

function ProductCard({ product }) {
  const { name, slug, thumbnail } = product;
  const detailTarget = slug || name;
  const detailPath = `/products/${encodeURIComponent(detailTarget)}`;
  const imageSrc = thumbnail ? optimizeCloudinaryImage(thumbnail) : "";
  const [imageFailed, setImageFailed] = useState(false);
  const saleInfo = getProductSaleInfo(product);
  const availableQuantity = product.available_quantity ?? product.availableQuantity;
  const hasAvailableQuantity =
    availableQuantity !== undefined && availableQuantity !== null;
  const isOutOfStock = hasAvailableQuantity && Number(availableQuantity) === 0;

  return (
    <article className="product-card">
      {saleInfo.isSale ? (
        <span className="product-sale-badge">
          -{formatSalePercent(saleInfo.salePercent)}%
        </span>
      ) : null}
      <Link className="product-image" to={detailPath}>
        {imageSrc && !imageFailed ? (
          <img
            alt={name}
            decoding="async"
            height={CARD_IMAGE_HEIGHT}
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={imageSrc}
            width={CARD_IMAGE_WIDTH}
          />
        ) : (
          <span>BStore</span>
        )}
      </Link>
      <h3>
        <Link to={detailPath}>{name}</Link>
      </h3>
      <div className={`price-row${saleInfo.isSale ? " price-row--sale" : ""}`}>
        {saleInfo.isSale ? (
          <>
            <span className="price-original">
              {formatCurrency(saleInfo.originalPrice)}
            </span>
            <strong className="price-sale">
              {formatCurrency(saleInfo.salePrice)}
            </strong>
          </>
        ) : (
          <strong>{formatCurrency(saleInfo.originalPrice)}</strong>
        )}
      </div>
      {hasAvailableQuantity ? (
        <p className={`product-stock${isOutOfStock ? " product-stock--empty" : ""}`}>
          {isOutOfStock ? "Hết hàng" : `Còn: ${Number(availableQuantity)} sản phẩm`}
        </p>
      ) : null}
      <Link className="product-detail-link" to={isOutOfStock ? "/contact" : detailPath}>
        {isOutOfStock ? "Liên hệ" : "Xem chi tiết"}
      </Link>
    </article>
  );
}

function areProductCardsEqual(previousProps, nextProps) {
  const previous = previousProps.product;
  const next = nextProps.product;

  return (
    previous.name === next.name &&
    previous.slug === next.slug &&
    previous.price === next.price &&
    previous.sale_percent === next.sale_percent &&
    previous.salePercent === next.salePercent &&
    previous.sale_price === next.sale_price &&
    previous.is_sale === next.is_sale &&
    previous.isSale === next.isSale &&
    previous.thumbnail === next.thumbnail
    && previous.available_quantity === next.available_quantity
    && previous.availableQuantity === next.availableQuantity
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="product-card product-card--skeleton" aria-hidden="true">
      <div className="product-image skeleton-block" />
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--price" />
      <div className="skeleton-button" />
    </article>
  );
}

export default memo(ProductCard, areProductCardsEqual);
