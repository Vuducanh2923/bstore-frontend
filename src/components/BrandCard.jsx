import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../utils/formatters";

function getBrandLogoValue(brand = {}) {
  return String(
    brand.logo ||
      brand.logo_url ||
      brand.logoUrl ||
      brand.image_url ||
      brand.imageUrl ||
      brand.image ||
      brand.avatar ||
      "",
  ).trim();
}

function getBrandName(brand = {}) {
  return brand.name || brand.label || brand.title || "Brand";
}

function isImageLogo(value) {
  return (
    /^(https?:)?\/\//i.test(value) ||
    value.startsWith("/") ||
    value.startsWith("data:image") ||
    value.startsWith("blob:") ||
    value.startsWith("uploads/") ||
    value.startsWith("storage/") ||
    /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value)
  );
}

function getBrandInitial(name) {
  return String(name || "B").trim().charAt(0).toUpperCase() || "B";
}

export function BrandLogo({ brand, className = "" }) {
  const name = getBrandName(brand);
  const logo = getBrandLogoValue(brand);
  const classNames = ["brand-logo", className].filter(Boolean).join(" ");

  if (logo && isImageLogo(logo)) {
    return (
      <span className={classNames}>
        <img alt={name} src={resolveMediaUrl(logo)} />
      </span>
    );
  }

  return (
    <span className={`${classNames} brand-logo--fallback`}>
      {logo && logo.length <= 3 ? logo : getBrandInitial(name)}
    </span>
  );
}

export default function BrandCard({
  brand,
  className = "",
  onClick,
  to,
}) {
  const content = (
    <>
      <BrandLogo brand={brand} />
      <span className="brand-card-name">{getBrandName(brand)}</span>
    </>
  );
  const classNames = ["brand-card", className].filter(Boolean).join(" ");

  if (to) {
    return (
      <Link className={classNames} onClick={onClick} to={to}>
        {content}
      </Link>
    );
  }

  return <div className={classNames}>{content}</div>;
}
