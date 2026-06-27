import { memo } from "react";
import { Link } from "react-router-dom";
import {
  formatCurrency,
  formatSalePercent,
  getProductSaleInfo,
  resolveMediaUrl,
} from "../utils/formatters";

const CARD_IMAGE_WIDTH = 280;
const CARD_IMAGE_HEIGHT = 244;

function ProductCard({ product }) {
  const { name, rating, slug, thumbnail } = product;
  const detailTarget = slug || name;
  const detailPath = `/products/${encodeURIComponent(detailTarget)}`;
  const imageSrc = thumbnail ? resolveMediaUrl(thumbnail) : "";
  const saleInfo = getProductSaleInfo(product);
  const ratingValue = Number(rating);

  return (
    <article className="product-card">
      {saleInfo.isSale ? (
        <span className="product-sale-badge">
          -{formatSalePercent(saleInfo.salePercent)}%
        </span>
      ) : null}
      <Link className="product-image" to={detailPath}>
        {imageSrc ? (
          <img
            alt={name}
            decoding="async"
            height={CARD_IMAGE_HEIGHT}
            loading="lazy"
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
      {Number.isFinite(ratingValue) ? (
        <div className="product-rating" aria-label={`Rating ${ratingValue} of 5`}>
          Rating {ratingValue.toFixed(1)}
        </div>
      ) : null}
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
      <Link className="product-detail-link" to={detailPath}>
        Xem chi tiết
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
    previous.thumbnail === next.thumbnail &&
    previous.rating === next.rating
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="product-card product-card--skeleton" aria-hidden="true">
      <div className="product-image skeleton-block" />
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line skeleton-line--price" />
      <div className="skeleton-button" />
    </article>
  );
}

export default memo(ProductCard, areProductCardsEqual);
