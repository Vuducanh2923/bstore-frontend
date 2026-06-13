import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../services/api";
import { formatCurrency, getProductSpecEntries } from "../utils/formatters";

export default function ProductCard({ product }) {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const detailPath = `/products/${product.id}`;
  const compactSpecs = getProductSpecEntries(product).slice(0, 3);

  const handleAddToCart = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để mua hàng.", "warning");
      navigate("/login", { state: { from: location } });
      return;
    }

    try {
      await addToCart(product, 1);
      showToast("Đã thêm sản phẩm vào giỏ hàng.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Không thêm được vào giỏ."), "error");
    }
  };

  return (
    <article className="product-card">
      <Link className="product-image" to={detailPath}>
        {product.imageUrl ? <img alt={product.name} src={product.imageUrl} /> : <span>□</span>}
      </Link>
      <div className="product-category">{product.category}</div>
      <h3>
        <Link to={detailPath}>{product.name}</Link>
      </h3>
      <p className="product-desc">{product.description}</p>
      {compactSpecs.length ? (
        <dl className="product-specs-mini">
          {compactSpecs.map((spec) => (
            <div key={spec.key}>
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="price-row">
        <strong>{formatCurrency(product.price)}</strong>
        {product.oldPrice > product.price ? (
          <span>{formatCurrency(product.oldPrice)}</span>
        ) : null}
      </div>
      <button className="icon-cart-button" onClick={handleAddToCart} type="button">
        🛒
      </button>
    </article>
  );
}
