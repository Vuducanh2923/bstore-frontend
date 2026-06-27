import { useState } from "react";
import { Link } from "react-router-dom";
import BrandCard from "./BrandCard";

export default function DropdownMenu({
  active = false,
  emptyLabel = "Đang cập nhật",
  items = [],
  label,
  onNavigate,
}) {
  const [open, setOpen] = useState(false);
  const hasBrandItems = items.some((item) => item.type === "brand");

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div
      className={`header-dropdown${open ? " is-open" : ""}${
        hasBrandItems ? " has-brand-items" : ""
      }`}
    >
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className={`nav-link header-dropdown-trigger${active ? " active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="header-dropdown-caret">
          ▼
        </span>
      </button>

      <div className="header-dropdown-panel" role="menu">
        {items.length ? (
          items.map((item) => (
            item.type === "brand" ? (
              <BrandCard
                brand={item}
                className={`header-brand-card${item.active ? " active" : ""}`}
                key={item.key || item.to || item.label}
                onClick={handleNavigate}
                to={item.to}
              />
            ) : (
              <Link
                className={`header-dropdown-link${item.active ? " active" : ""}`}
                key={item.key || item.to || item.label}
                onClick={handleNavigate}
                role="menuitem"
                to={item.to}
              >
                {item.label}
              </Link>
            )
          ))
        ) : (
          <span className="header-dropdown-empty">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
