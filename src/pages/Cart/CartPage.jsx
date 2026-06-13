import { Link } from "react-router-dom";
import StatusMessage from "../../components/StatusMessage";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function CartPage() {
  const {
    error,
    items,
    loading,
    removeItem,
    totalAmount,
    updateQuantity,
  } = useCart();
  const { showToast } = useToast();

  const handleQuantity = async (item, quantity) => {
    if (quantity < 1) {
      return;
    }

    try {
      await updateQuantity(item.id, quantity);
      showToast("Đã cập nhật giỏ hàng.", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Không cập nhật được giỏ hàng."), "error");
    }
  };

  const handleRemove = async (item) => {
    try {
      await removeItem(item.id);
      showToast("Đã xoá sản phẩm khỏi giỏ.", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Không xoá được sản phẩm."), "error");
    }
  };

  return (
    <main className="container cart-page">
      <section className="page-heading">
        <span>Shopping Cart</span>
        <h1>Giỏ hàng của bạn</h1>
      </section>
      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {loading ? <StatusMessage>Đang tải giỏ hàng...</StatusMessage> : null}
      {!loading && items.length === 0 ? (
        <section className="empty-state">
          <h2>Giỏ hàng đang trống</h2>
          <p>Hãy chọn sản phẩm yêu thích trước khi đặt hàng.</p>
          <Link className="primary-button" to="/products">
            Tiếp tục mua sắm
          </Link>
        </section>
      ) : null}
      {items.length > 0 ? (
        <div className="cart-layout">
          <section className="cart-list">
            {items.map((item) => (
              <article className="cart-row" key={item.id}>
                <div className="cart-image">
                  {item.product.imageUrl ? (
                    <img alt={item.product.name} src={item.product.imageUrl} />
                  ) : (
                    <span>□</span>
                  )}
                </div>
                <div>
                  <strong>{item.product.name}</strong>
                  <p>{item.product.category}</p>
                  <span>{formatCurrency(item.price)}</span>
                </div>
                <div className="quantity-stepper">
                  <button
                    onClick={() => handleQuantity(item, item.quantity - 1)}
                    type="button"
                  >
                    −
                  </button>
                  <input
                    min="1"
                    onChange={(event) =>
                      handleQuantity(item, Number(event.target.value))
                    }
                    type="number"
                    value={item.quantity}
                  />
                  <button
                    onClick={() => handleQuantity(item, item.quantity + 1)}
                    type="button"
                  >
                    +
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={() => handleRemove(item)}
                  type="button"
                >
                  Xoá
                </button>
              </article>
            ))}
          </section>
          <aside className="summary-panel">
            <h2>Tóm tắt đơn hàng</h2>
            <div>
              <span>Tạm tính</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
            <div>
              <span>Vận chuyển</span>
              <strong>Miễn phí</strong>
            </div>
            <div className="summary-total">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
            <Link className="primary-button" to="/checkout">
              Thanh toán
            </Link>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
